import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { sendPlaybackControl } from '~/bridge';
import { clockPosition, usePlaybackClock } from './playbackClock';

interface PlaybackBarProps { settingsOpen?: boolean }

const CONTROL_LAYOUT_SPRING = { type: 'spring' as const, stiffness: 280, damping: 24 };
const HOVER_EXPAND_DELAY_MS = 20;
const HOVER_COLLAPSE_DELAY_MS = 100;

const formatTime = (time: number): string => {
    if (!Number.isFinite(time)) return '00:00';
    const total = Math.max(0, Math.floor(time));
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

const progressStep = (ratio: number, deviceWidth: number): number | null => (
    deviceWidth > 0 ? Math.round(Math.min(1, Math.max(0, ratio)) * deviceWidth * 4) : null
);

const progressFraction = (step: number, deviceWidth: number): number => Math.min(1, step / (deviceWidth * 4));

interface ProgressBarProps {
    currentTime: MotionValue<number>;
    duration: number;
    onSeek: (time: number) => void;
    disabled?: boolean;
}

/** Folia's native progress structure and compositor-friendly fill update, without Folium slots. */
const ProgressBar: React.FC<ProgressBarProps> = ({ currentTime, duration, onSeek, disabled = false }) => {
    const progressRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const timeRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const draggingRef = useRef(false);
    const deviceWidthRef = useRef(0);
    const lastStepRef = useRef<number | null>(null);
    const lastSecondRef = useRef<number | null>(null);

    const updateUi = useCallback((value: number, force = false, syncInput = true, bypassDrag = false) => {
        if (!bypassDrag && draggingRef.current) return;
        const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
        const clamped = duration > 0 ? Math.min(safe, duration) : safe;
        const second = Math.floor(clamped);
        const step = duration > 0 ? progressStep(clamped / duration, deviceWidthRef.current) : null;
        if (progressRef.current && duration > 0 && (force || step !== lastStepRef.current)) {
            lastStepRef.current = step;
            const ratio = step === null ? Math.min(1, clamped / duration) : progressFraction(step, deviceWidthRef.current);
            progressRef.current.style.clipPath = `inset(0 ${((1 - ratio) * 100).toFixed(4)}% 0 0 round 999px)`;
            if (thumbRef.current) thumbRef.current.style.transform = `translateX(${(ratio * 100).toFixed(4)}%)`;
        }
        if (timeRef.current && (force || lastSecondRef.current !== second)) {
            timeRef.current.textContent = formatTime(clamped);
            lastSecondRef.current = second;
        }
        if (syncInput && inputRef.current && (force || inputRef.current.value !== String(clamped))) inputRef.current.value = String(clamped);
    }, [duration]);

    useLayoutEffect(() => { updateUi(currentTime.get(), true); }, [currentTime, updateUi]);
    useMotionValueEvent(currentTime, 'change', value => updateUi(value));

    useLayoutEffect(() => {
        const fill = progressRef.current;
        if (!fill || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => {
            const width = entry?.devicePixelContentBoxSize?.[0]?.inlineSize ?? fill.getBoundingClientRect().width * (window.devicePixelRatio || 1);
            if (width === deviceWidthRef.current) return;
            deviceWidthRef.current = width;
            updateUi(currentTime.get(), true);
        });
        try { observer.observe(fill, { box: 'device-pixel-content-box' }); } catch { observer.observe(fill); }
        return () => observer.disconnect();
    }, [currentTime, updateUi]);

    const handleInput = (event: React.FormEvent<HTMLInputElement>) => {
        if (disabled) return;
        const value = Number(event.currentTarget.value);
        updateUi(value, false, false, true);
        if (!draggingRef.current) onSeek(value);
    };
    const handleSeekStart = (event: React.PointerEvent<HTMLInputElement>) => {
        if (disabled) return;
        draggingRef.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
    };
    const handleSeekEnd = (event: React.PointerEvent<HTMLInputElement>) => {
        if (disabled) return;
        const value = Number(event.currentTarget.value);
        draggingRef.current = false;
        updateUi(value, true);
        onSeek(value);
    };

    return (
        <div className="flex w-full select-none items-center gap-3">
            <span ref={timeRef} className="w-8 shrink-0 text-right font-mono text-[10px] font-medium opacity-60">00:00</span>
            <div className={`group relative flex h-1.5 flex-1 items-center rounded-sm bg-white/10 md:rounded-full ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                <div ref={progressRef} className="pointer-events-none absolute left-0 top-0 h-full rounded-sm bg-[var(--text-primary)] md:rounded-full" style={{ width: '100%', clipPath: 'inset(0 100% 0 0 round 999px)', willChange: 'clip-path' }} />
                <div ref={thumbRef} className="pointer-events-none absolute inset-0" style={{ transform: 'translateX(0%)', willChange: 'transform' }}>
                    <div className="absolute left-0 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text-primary)] opacity-0" />
                </div>
                <input
                    ref={inputRef}
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    disabled={disabled}
                    defaultValue={0}
                    onPointerDown={handleSeekStart}
                    onPointerUp={handleSeekEnd}
                    onPointerCancel={() => { draggingRef.current = false; updateUi(currentTime.get(), true); }}
                    onInput={handleInput}
                    onChange={() => {}}
                    onClick={event => event.stopPropagation()}
                    className={`absolute inset-0 h-full w-full opacity-0 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    aria-label="播放进度"
                />
            </div>
            <span className="w-8 shrink-0 font-mono text-[10px] font-medium opacity-60">{formatTime(duration)}</span>
        </div>
    );
};

interface ExpandedViewProps {
    title: string;
    trackKey: string;
    playing: boolean;
    currentTime: MotionValue<number>;
    duration: number;
    disabled?: boolean;
    onTogglePlay: () => void;
    onSeek: (time: number) => void;
    onPrev: () => void;
    onNext: () => void;
}

interface TrackTitleNavigatorProps {
    title: string;
    trackKey: string;
    disabled?: boolean;
    onPrev: () => void;
    onNext: () => void;
}

/** Folia's title transition and hover zones, without the title-to-song-wall click. */
const TrackTitleNavigator: React.FC<TrackTitleNavigatorProps> = ({ title, trackKey, disabled = false, onPrev, onNext }) => {
    const [enterSeq, setEnterSeq] = useState(0);
    const [slide, setSlide] = useState(14);
    const previousKey = useRef(trackKey);

    useEffect(() => {
        if (previousKey.current === trackKey) return;
        previousKey.current = trackKey;
        setEnterSeq(sequence => sequence + 1);
    }, [trackKey]);

    const arrowClass = 'pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity duration-200 group-hover/title:opacity-70 hover:bg-white/15 hover:opacity-100!';
    const switchTrack = (direction: 'prev' | 'next', action: () => void) => {
        if (disabled) return;
        setSlide(direction === 'next' ? 14 : -14);
        action();
    };

    return (
        <div className="group/title relative min-w-0 select-none px-1">
            <div className="absolute inset-y-0 left-0 flex w-14 items-center justify-start pl-1">
                <button type="button" className={arrowClass} onClick={event => { event.stopPropagation(); switchTrack('prev', onPrev); }} disabled={disabled} aria-label="上一首" title="上一首">
                    <ChevronLeft size={16} strokeWidth={2.4} />
                </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex w-14 items-center justify-end pr-1">
                <button type="button" className={arrowClass} onClick={event => { event.stopPropagation(); switchTrack('next', onNext); }} disabled={disabled} aria-label="下一首" title="下一首">
                    <ChevronRight size={16} strokeWidth={2.4} />
                </button>
            </div>
            <div className="pointer-events-none relative h-6">
                <AnimatePresence initial={false} mode="sync">
                    <motion.div
                        key={enterSeq}
                        className="absolute inset-y-0 left-14 right-14 flex items-center"
                        initial={{ opacity: 0, x: slide }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -slide }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
                        <span className="w-full truncate text-center text-sm font-bold">{title || '正在播放'}</span>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

/** Folia's expanded grid. The title is intentionally plain text: it no longer opens 歌曲墙. */
const ExpandedView: React.FC<ExpandedViewProps> = ({ title, trackKey, playing, currentTime, duration, disabled = false, onTogglePlay, onSeek, onPrev, onNext }) => (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="col-span-3 row-start-1 min-w-0 px-2 sm:col-start-2 sm:col-span-1">
            <TrackTitleNavigator title={title} trackKey={trackKey} disabled={disabled || !title} onPrev={onPrev} onNext={onNext} />
        </div>
        <button type="button" onClick={event => { event.stopPropagation(); onTogglePlay(); }} disabled={disabled || !title} className={`col-start-2 row-start-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-none bg-[var(--text-primary)] text-black shadow-lg transition-transform sm:col-start-1 sm:row-start-1 sm:row-span-2 ${disabled ? 'cursor-not-allowed opacity-45' : 'hover:scale-105'}`} aria-label={playing ? '暂停' : '播放'} title={playing ? '暂停' : '播放'}>
            {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
        </button>
        <div className="col-span-3 row-start-3 w-full px-2 sm:col-start-2 sm:col-span-1 sm:row-start-2"><ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} disabled={disabled} /></div>
    </div>
);

const PlaybackBar: React.FC<PlaybackBarProps> = ({ settingsOpen = false }) => {
    const { meta, clockRef } = usePlaybackClock();
    const currentTime = useMotionValue(0);
    const [hovered, setHovered] = useState(false);
    const hoverTimer = useRef<number | null>(null);

    useEffect(() => {
        let frame = 0;
        const tick = () => {
            if (clockRef.current) currentTime.set(clockPosition(clockRef.current) / 1000);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [clockRef, currentTime]);
    useEffect(() => () => { if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current); }, []);

    const duration = Math.max(meta.durationMs, clockRef.current?.durationMs ?? 0) / 1000;
    const setHoverState = (next: boolean) => {
        if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => setHovered(next), next ? HOVER_EXPAND_DELAY_MS : HOVER_COLLAPSE_DELAY_MS);
    };
    const expanded = hovered || (duration > 0 && !meta.playing);
    const seek = (position: number) => {
        if (duration > 0) sendPlaybackControl('seek', { positionMs: Math.round(Math.max(0, Math.min(duration, position)) * 1000) });
    };

    if (settingsOpen) return null;
    return (
        <motion.div className="pointer-events-none fixed bottom-8 left-1/2 z-[2147483000] flex w-full -translate-x-1/2 justify-center px-4" style={{ maxWidth: 'min(32rem, 100vw)' }}>
            <motion.div className="pointer-events-none flex w-full justify-center" initial={false} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.26, ease: 'easeOut' }}>
                <div className="pointer-events-auto flex w-full justify-center pb-8 -mb-8" onMouseEnter={() => setHoverState(true)} onMouseLeave={() => setHoverState(false)}>
                    <motion.div layout transition={{ layout: CONTROL_LAYOUT_SPRING }} className={`relative w-full overflow-hidden rounded-full backdrop-blur-xl shadow-2xl transition-colors duration-300 ${expanded ? 'border border-white/5 bg-black/40 p-3' : 'w-[min(100%,calc(80%+var(--folium-player-bar-extra,0px)*0.2))] border border-white/5 bg-black/20 px-4 py-2 hover:bg-black/30 md:w-[min(100%,calc(60%+var(--folium-player-bar-extra,0px)*0.4))]'}`}>
                        <motion.div layout transition={{ layout: CONTROL_LAYOUT_SPRING }} className="w-full">
                            {expanded ? <ExpandedView title={meta.title || meta.artist} trackKey={meta.id || meta.title || meta.artist} playing={meta.playing} currentTime={currentTime} duration={duration} onTogglePlay={() => sendPlaybackControl('toggle')} onSeek={seek} onPrev={() => sendPlaybackControl('previous')} onNext={() => sendPlaybackControl('next')} /> : <div className="flex h-8 w-full items-center justify-center px-4"><ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} /></div>}
                        </motion.div>
                    </motion.div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default PlaybackBar;
