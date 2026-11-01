import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useTransform, type MotionStyle } from 'framer-motion';
import { Disc, Moon, Settings2, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Theme, ThemeMode, VisualizerMode } from '@/types';
import type { ThemeSourceModel } from '@/hooks/themeControllerState';
import AppearanceSection from '@/components/panelTab/controls/AppearanceSection';
import ThemeSourceRow from '@/components/panelTab/controls/ThemeSourceRow';
import PanelHandle from '@/components/panelTab/shell/PanelHandle';
import PanelIconButton from '@/components/panelTab/shell/PanelIconButton';
import Segments from '@/components/panelTab/shell/Segments';
import GroupLine from '@/components/panelTab/shell/GroupLine';
import { panelTokens } from '@/components/panelTab/shell/panelTheme';
import { kitTransition, useKitReducedMotion } from '@/components/modal/settings/kit/motion';
import { useMeasuredSize } from '@/components/panelTab/shell/useMeasuredSize';
import { usePlayerBottomBarBottomPx } from '@/hooks/usePlayerBottomBarBottomPx';
import { usePlayerOverlayObstacle } from '@/hooks/usePlayerOverlayLayout';
import { getSizedCoverUrl } from '@/utils/coverUrl';
import { bridgeOn, bridgeTrackCover, type BridgeTrackMessage } from '~/bridge';
import { useSettingsStore } from '~/model/settings';
import { DAYLIGHT_THEME, PREVIEW_THEME } from '~/model/theme';

const HANDLE_ROOM_PX = 60;
const TOP_MARGIN_PX = 56;
const PADDING_PX = 12;
const BODY_TOP_PX = { gap: 12, line: 1, under: 8 } as const;

interface FoliaSidePanelProps {
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
    onOpenVisualizerSettings: () => void;
    onOpenBackgroundSettings: () => void;
    onThemeSourceChange: (source: ThemeMode) => void;
    themeSourceModel: ThemeSourceModel;
    hasCustomTheme: boolean;
    theme: Theme;
    isDaylight: boolean;
}

const useCurrentTrack = (): BridgeTrackMessage | null => {
    const [track, setTrack] = useState<BridgeTrackMessage | null>(() => (
        window.__SPW_FOLIA__?.inputs?.track ?? null
    ));

    useEffect(() => bridgeOn<BridgeTrackMessage | null>('track', next => setTrack(next ?? null)), []);
    return track;
};

const PanelSongHeader: React.FC<{ track: BridgeTrackMessage | null }> = ({ track }) => {
    const { t } = useTranslation();
    const coverUrl = bridgeTrackCover(track);
    const title = track?.title?.trim() || t('ui.noTrack');
    const artist = track?.artist?.trim() || track?.album?.trim() || '';

    return (
        <header className="relative h-12 shrink-0 overflow-hidden">
            <div className="absolute left-0 top-0 grid h-12 w-12 place-items-center overflow-hidden rounded-lg bg-[var(--st-fill)]">
                {coverUrl ? (
                    <img src={getSizedCoverUrl(coverUrl, 512)} alt="" decoding="async" className="h-full w-full object-cover" />
                ) : (
                    <Disc size={20} className="text-[color:var(--st-t3)]" />
                )}
                <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--st-line)]" />
            </div>
            <div className="absolute left-[60px] right-1 top-[5px] flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-semibold leading-5">{title}</span>
                <span className="truncate text-xs leading-[18px] text-[color:var(--st-t2)]">{artist}</span>
            </div>
        </header>
    );
};

interface LinuxThemeNameRowProps {
    theme: Theme;
    themeSourceModel: ThemeSourceModel;
    defaultTheme: Theme;
    daylightTheme: Theme;
    isDaylight: boolean;
    onToggleDaylight: () => void;
    onOpenVisualizerSettings: () => void;
}

/** Original ThemeNameRow layout with the plugin's settings destination in the final icon slot. */
const LinuxThemeNameRow: React.FC<LinuxThemeNameRowProps> = ({
    theme,
    themeSourceModel,
    defaultTheme,
    daylightTheme,
    isDaylight,
    onToggleDaylight,
    onOpenVisualizerSettings,
}) => {
    const { t } = useTranslation();
    const displayName = themeSourceModel.current.label || theme.name;
    const formattedName = themeSourceModel.activeSource !== 'default'
        ? displayName
        : displayName === defaultTheme.name
            ? t('theme.midnightDefault')
            : displayName === daylightTheme.name
                ? t('theme.daylightDefault')
                : displayName;

    return (
        <div className="flex min-h-11 flex-wrap items-center gap-x-3 py-1.5">
            <span className="min-w-0 flex-[1_1_72px] truncate text-[13px] text-[color:var(--st-t2)]">{formattedName}</span>
            <span className="ml-auto flex max-w-full items-center gap-1.5">
                <Segments
                    size="s"
                    value={isDaylight ? 'light' : 'dark'}
                    onChange={onToggleDaylight}
                    options={[
                        { value: 'light', label: t('options.daylightModeLight'), icon: <Sun size={15} />, iconOnly: true },
                        { value: 'dark', label: t('options.daylightModeDark'), icon: <Moon size={15} />, iconOnly: true },
                    ]}
                />
                <PanelIconButton
                    size="s"
                    filled
                    label={t('ui.moreSettings')}
                    onClick={onOpenVisualizerSettings}
                >
                    <Settings2 size={15} />
                </PanelIconButton>
            </span>
        </div>
    );
};

interface LinuxControlsProps {
    theme: Theme;
    isDaylight: boolean;
    visualizerMode: VisualizerMode;
    onToggleDaylight: () => void;
    onClose: () => void;
    onOpenVisualizerSettings: () => void;
    onOpenBackgroundSettings: () => void;
    onThemeSourceChange: (source: ThemeMode) => void;
    themeSourceModel: ThemeSourceModel;
    hasCustomTheme: boolean;
}

const LinuxControls: React.FC<LinuxControlsProps> = ({
    theme,
    isDaylight,
    visualizerMode,
    onToggleDaylight,
    onClose,
    onOpenVisualizerSettings,
    onOpenBackgroundSettings,
    onThemeSourceChange,
    themeSourceModel,
    hasCustomTheme,
}) => {
    const state = useSettingsStore();

    return (
        <div>
            <AppearanceSection
                theme={theme}
                onThemeChange={next => state.setActiveTheme(next)}
                isDaylight={isDaylight}
                visualizerMode={visualizerMode}
                onVisualizerModeChange={mode => state.setVisualizerMode(mode as never)}
                useCoverColorBg={state.commonBackground.useCoverColorBg}
                onToggleCoverColorBg={enabled => state.setCommonBackground({ useCoverColorBg: enabled })}
                transparentPlayerBackground={false}
                onToggleTransparentPlayerBackground={() => undefined}
                showTransparentPlayerBackground={false}
                onOpenVisualizerSettings={onOpenVisualizerSettings}
                onOpenBackgroundSettings={onOpenBackgroundSettings}
                onClosePanel={onClose}
            />

            <GroupLine />

            <ThemeSourceRow
                themeSourceModel={themeSourceModel}
                onBgModeChange={onThemeSourceChange}
                hasCustomTheme={hasCustomTheme}
                defaultTheme={PREVIEW_THEME}
                daylightTheme={DAYLIGHT_THEME}
                isDaylight={isDaylight}
            />
            <LinuxThemeNameRow
                theme={theme}
                themeSourceModel={themeSourceModel}
                defaultTheme={PREVIEW_THEME}
                daylightTheme={DAYLIGHT_THEME}
                isDaylight={isDaylight}
                onToggleDaylight={onToggleDaylight}
                onOpenVisualizerSettings={onOpenVisualizerSettings}
            />
        </div>
    );
};

interface PanelSurfaceProps {
    theme: Theme;
    isDaylight: boolean;
    header: React.ReactNode;
    children: React.ReactNode;
    layoutRef: (element: HTMLElement | null) => void;
    onLayoutUpdate: () => void;
}

const PanelSurface: React.FC<PanelSurfaceProps> = ({ theme, isDaylight, header, children, layoutRef, onLayoutUpdate }) => {
    const reduced = useKitReducedMotion();
    const bottomBarBottomPx = usePlayerBottomBarBottomPx();
    const maxHeight = useTransform(bottomBarBottomPx, bottom => `calc(100dvh - ${HANDLE_ROOM_PX + bottom + TOP_MARGIN_PX}px)`);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const content = useMeasuredSize(contentRef);
    const [isStill, setIsStill] = useState(true);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setIsStill(false));
        return () => cancelAnimationFrame(frame);
    }, []);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: 0 });
    }, []);

    const bodyHeight = BODY_TOP_PX.gap + BODY_TOP_PX.line + BODY_TOP_PX.under + content.height;
    const away = { opacity: 0, scale: 0.92 };

    return (
        <motion.div
            ref={layoutRef}
            onUpdate={onLayoutUpdate}
            initial={away}
            animate={{ opacity: 1, scale: 1, transition: kitTransition('unfold', reduced) }}
            exit={{ ...away, transition: kitTransition('move', reduced) }}
            data-testid="spw-folia-panel-surface"
            data-still={isStill || undefined}
            className="st-window pointer-events-auto @container hide-scrollbar flex w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-y-auto overflow-x-hidden rounded-[20px] bg-[var(--pn-glass)] text-[color:var(--st-t1)] shadow-[var(--pn-shadow)] backdrop-blur-[40px] backdrop-saturate-[1.3] [&[data-still]_*]:transition-none"
            style={{
                ...panelTokens(isDaylight, theme, reduced),
                '--pn-under': `${HANDLE_ROOM_PX}px`,
                maxHeight,
                padding: PADDING_PX,
                marginBottom: HANDLE_ROOM_PX,
                transformOrigin: `calc(100% - 24px) calc(100% + ${HANDLE_ROOM_PX - 24}px)`,
            } as MotionStyle}
        >
            {header}
            <div className="st-t-unfold flex min-h-0 shrink flex-col overflow-hidden transition-[height]" style={{ height: bodyHeight, marginInline: -PADDING_PX }}>
                <div className="h-px shrink-0 bg-[var(--st-line)]" style={{ marginTop: BODY_TOP_PX.gap, marginInline: PADDING_PX }} />
                <div ref={scrollRef} className="st-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]" style={{ paddingTop: BODY_TOP_PX.under, paddingLeft: PADDING_PX }}>
                    <div ref={contentRef} className="st-page-in">{children}</div>
                </div>
            </div>
        </motion.div>
    );
};

const FoliaSidePanel: React.FC<FoliaSidePanelProps> = ({
    open,
    onToggle,
    onClose,
    onOpenVisualizerSettings,
    onOpenBackgroundSettings,
    onThemeSourceChange,
    themeSourceModel,
    hasCustomTheme,
    theme,
    isDaylight,
}) => {
    const state = useSettingsStore();
    const track = useCurrentTrack();
    const panelTheme = theme;
    const bottomBarBottomPx = usePlayerBottomBarBottomPx();
    const { ref: layoutRef, invalidate: invalidateLayout } = usePlayerOverlayObstacle('spw-folia-panel', 'panel');

    return (
        <motion.div
            style={{ bottom: bottomBarBottomPx }}
            onUpdate={invalidateLayout}
            className="absolute right-0 z-[60] flex flex-col items-end pointer-events-none"
            onClick={event => event.stopPropagation()}
        >
            <div className="pr-4 md:pr-8">
                <AnimatePresence>
                    {open && (
                        <PanelSurface
                            theme={panelTheme}
                            isDaylight={isDaylight}
                            header={<PanelSongHeader track={track} />}
                            layoutRef={layoutRef}
                            onLayoutUpdate={invalidateLayout}
                        >
                            <LinuxControls
                                theme={panelTheme}
                                isDaylight={isDaylight}
                                visualizerMode={state.visualizerMode as VisualizerMode}
                                onToggleDaylight={() => state.setIsDaylightTheme(!state.isDaylightTheme)}
                                onClose={onClose}
                                onOpenVisualizerSettings={onOpenVisualizerSettings}
                                onOpenBackgroundSettings={onOpenBackgroundSettings}
                                onThemeSourceChange={onThemeSourceChange}
                                themeSourceModel={themeSourceModel}
                                hasCustomTheme={hasCustomTheme}
                            />
                        </PanelSurface>
                    )}
                </AnimatePresence>
            </div>
            <PanelHandle
                isOpen={open}
                onToggle={onToggle}
                theme={panelTheme}
                isDaylight={isDaylight}
                showOpenPanelCloseButton
                isPanelGuideHotspotActive={false}
                hideToggleButton={false}
                isCommandPaletteOpen={false}
            />
        </motion.div>
    );
};

export default FoliaSidePanel;
