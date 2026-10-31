import React, { useEffect, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { sendPlaybackControl } from '~/bridge';
import { clockPosition, formatTime, usePlaybackClock } from './playbackClock';

interface PlaybackBarProps { settingsOpen?: boolean }

const PlaybackBar: React.FC<PlaybackBarProps> = ({ settingsOpen = false }) => {
    const { meta, clockRef } = usePlaybackClock();
    const [position, setPosition] = useState(0);
    const railRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let frame = 0;
        const tick = () => {
            if (clockRef.current) setPosition(clockPosition(clockRef.current));
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [clockRef]);

    const duration = Math.max(meta.durationMs, clockRef.current?.durationMs ?? 0);
    const ratio = duration > 0 ? Math.min(1, position / duration) : 0;
    const seek = (clientX: number) => {
        const rect = railRef.current?.getBoundingClientRect();
        if (!rect || duration <= 0) return;
        sendPlaybackControl('seek', { positionMs: Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration) });
    };

    if (settingsOpen) return null;
    return (
        <div className="spw-playback" data-expanded="true">
            <div className="spw-playback-bar">
                <button type="button" className="spw-playback-play" aria-label={meta.playing ? '暂停' : '播放'} title={meta.playing ? '暂停' : '播放'} onClick={() => sendPlaybackControl('toggle')}>
                    {meta.playing ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                </button>
                <div className="spw-playback-main">
                    <button type="button" className="spw-playback-step" aria-label="上一首" title="上一首" onClick={() => sendPlaybackControl('previous')}>
                        <SkipBack size={17} fill="currentColor" />
                    </button>
                    <span className="spw-playback-title" title={meta.title}>{meta.title || '正在播放'}</span>
                    <button type="button" className="spw-playback-step" aria-label="下一首" title="下一首" onClick={() => sendPlaybackControl('next')}>
                        <SkipForward size={17} fill="currentColor" />
                    </button>
                </div>
                <div className="spw-playback-line">
                    <span className="spw-playback-time">{formatTime(position)}</span>
                    <div ref={railRef} className="spw-playback-track" role="slider" aria-label="播放进度" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={position} onClick={(event) => seek(event.clientX)}>
                        <span className="spw-playback-fill" style={{ width: `${ratio * 100}%` }} />
                        <span className="spw-playback-dot" style={{ left: `${ratio * 100}%` }} />
                    </div>
                    <span className="spw-playback-time">{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
};

export default PlaybackBar;
