/* The injected settings window: Folia's own StudioWindow frame + lyric-style window layout, wired to
 * the POC's configuration store (model/settings.ts) instead of Folia's persisted app store. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import StudioWindow from '@/components/shared/StudioWindow';
import type { ThemeSourceModel } from '@/hooks/themeControllerState';
import ThemeQuickEditorHost from '@/components/panelTab/ThemeQuickEditor';
import { useThemeQuickEditorStore } from '@/stores/useThemeQuickEditorStore';
import { SettingsKitThemeContext } from '@/components/modal/settings/kit/kitTheme';
import VisPlaygroundSettingsPanel from '@/components/visualizer/window/VisPlaygroundSettingsPanel';
import type { FontChoice } from '@/components/visualizer/window/FontTiles';
import type { StyleDraft } from '@/components/visualizer/window/useTuningDrafts';
import type { VisPlaygroundEditSection } from '@/components/visualizer/window/VisPlaygroundPreviewHotspots';
import type { SubtitleContentMode, Theme, ThemeMode, VisualizerMode } from '@/types';
import {
    selectBackgroundActions,
    selectBackgroundConfig,
    selectActiveTheme,
    selectTuningSettings,
    useSettingsStore,
    type SettingsSection,
} from '~/model/settings';
import Stage from '~/model/Stage';
import { getStyleEntry } from '~/model/styles';
import {
    CONTROL_CARD_BG,
    FONT_SCALE_OPTIONS,
    FONT_WEIGHT_OPTIONS,
    DAYLIGHT_THEME,
    PREVIEW_THEME,
    RANGE_INPUT_CLASS,
} from '~/model/theme';
import {
    bridgeOn,
    bridgeTrackCover,
    getBridge,
    registerSettingsUiController,
    setSettingsUiOpenState,
    subscribeSettingsRoundTrip,
} from '~/bridge';
/* v0.3.0: bottom-centre playback HUD (progress bar; hover expands the control bar). */
import PlaybackBar from '~/chrome/playback/PlaybackBar';
import FoliaSidePanel from '~/chrome/panel/FoliaSidePanel';
import FoliaVisualizerSettingsPopup from '~/chrome/panel/FoliaVisualizerSettingsPopup';
import { useConfigPublisher } from '~/useConfigPublisher';
/* 0.7.22 随机歌词样式: one style drawn per song from the random pool. */
import { useRandomSongMode } from '~/model/useRandomSongMode';
/* v0.4.0 自定义字体: picker modal + IndexedDB-backed font packs + 当前播放歌词预览. */
import FontPickerModal, { type FontPickerChoice } from '~/model/FontPickerModal';
import { restoreUploadedFonts } from '~/model/uploadedFonts';
import { useCurrentLyricText } from '~/model/currentLyric';

interface AppProps {
    injected: boolean;
}

const App: React.FC<AppProps> = ({ injected }) => {
    const { t } = useTranslation();
    const state = useSettingsStore();
    const [open, setOpen] = useState(() => !injected);
    const [panelOpen, setPanelOpen] = useState(false);
    const [visualizerSettingsOpen, setVisualizerSettingsOpen] = useState(false);
    const [visualizerSettingsSection, setVisualizerSettingsSection] = useState<VisPlaygroundEditSection>('visualizer');
    /** v0.4.0: 自定义字体 picker, opened from the 字体 tile / 当前字体 row. */
    const [fontPickerOpen, setFontPickerOpen] = useState(false);
    const visualizerMode = state.visualizerMode;
    const isDaylight = state.isDaylightTheme;
    const activeTheme = selectActiveTheme(state);
    useConfigPublisher();


    // Folia's settings window tints all of its text from the global --text-primary the app shell
    // sets from the current theme; the injected bundle owns that variable for the overlay subtree.
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.getPropertyValue('--text-primary');
        root.style.setProperty('--text-primary', activeTheme.primaryColor);
        return () => {
            if (previous) root.style.setProperty('--text-primary', previous);
            else root.style.removeProperty('--text-primary');
        };
    }, [activeTheme.primaryColor]);

    useEffect(() => subscribeSettingsRoundTrip(), []);
    useEffect(() => setSettingsUiOpenState(open), [open]);

    const openFullSettings = useCallback(() => {
        setPanelOpen(false);
        setOpen(true);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        // The host owns the tray/toggle; it only observes whether the panel is open through
        // `__SPW_FOLIA_UI__`/F1, so closing stays local (no `ui` echo, which would re-enter the
        // `ui` listener and toggle the panel back open).
    }, []);

    useEffect(() => registerSettingsUiController({ open: openFullSettings, close }), [close, openFullSettings]);

    useEffect(() => {
        if (open) setPanelOpen(false);
    }, [open]);


    useEffect(() => {
        if (!open) return undefined;
        // protocol §7.5: while the overlay is open the page owns ESC; capture + stopPropagation keeps
        // the host's own Escape (close window) out of the way. When closed this listener is absent, so
        // ESC falls through to the host exactly like a normal Folia player window.
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            close();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [open, close]);

    // 0.7.22 随机歌词样式: one style per song from the pool. Mounted once, at the shell level.
    useRandomSongMode();
    /** v0.4.0: 字体预览用当前播放的那句歌词（没在播放时回落到内置样句）。 */
    const liveLyricText = useCurrentLyricText();

    // A settings file written before v0.4.0 may still select removed options; normalise it once so
    // the reused panel renders sane values (romanization/both -> translation). Custom font choices
    // are kept: v0.4.0 restored the custom font subsystem (uploaded pack / system family), so
    // 'custom' is a real selection again.
    useEffect(() => {
        const current = useSettingsStore.getState();
        const mode = current.subtitle.subtitleContentMode;
        if (mode === 'romanization' || mode === 'both') current.setSubtitle({ subtitleContentMode: 'translation' });
    }, []);

    const styleEntry = getStyleEntry(visualizerMode);
    const themeSourceModel = useMemo<ThemeSourceModel>(() => {
        const option = (source: ThemeMode, theme: Theme | null, available: boolean, editable: boolean) => ({
            source,
            available,
            editable,
            theme,
            label: theme?.name ?? '',
            swatchColor: theme?.backgroundColor ?? 'transparent',
        });
        const defaultTheme = isDaylight ? DAYLIGHT_THEME : PREVIEW_THEME;
        const activeSource: ThemeMode = state.themeSource === 'ai' && state.aiTheme
            ? 'ai'
            : state.themeSource === 'custom'
                ? 'custom'
                : 'default';
        const current = activeSource === 'ai'
            ? (isDaylight ? state.aiTheme?.light : state.aiTheme?.dark) ?? defaultTheme
            : activeSource === 'custom'
                ? (isDaylight ? state.customTheme.light : state.customTheme.dark)
                : defaultTheme;
        return {
            activeSource,
            current: option(activeSource, current, true, activeSource !== 'default'),
            options: {
                default: option('default', defaultTheme, true, false),
                ai: option('ai', isDaylight ? state.aiTheme?.light ?? null : state.aiTheme?.dark ?? null, Boolean(state.aiTheme), Boolean(state.aiTheme)),
                custom: option('custom', isDaylight ? state.customTheme.light : state.customTheme.dark, true, true),
            },
            editableSource: activeSource === 'ai' || activeSource === 'custom' ? activeSource : null,
            canOpenQuickEditor: true,
            hasLocalAiTheme: Boolean(state.aiTheme),
        };
    }, [isDaylight, state.aiTheme, state.customTheme, state.themeSource]);
    const hasCustomTheme = Boolean(state.customTheme);

    const openVisualizerSettings = useCallback((section: VisPlaygroundEditSection = 'visualizer') => {
        // The floating workbench is rendered above the player, so the side panel must leave the
        // stage first. Otherwise its z-[60] surface covers the workbench's injected layer and the
        // button appears to have only hidden the controls.
        setOpen(false);
        setPanelOpen(false);
        setVisualizerSettingsSection(section);
        setVisualizerSettingsOpen(true);
    }, []);

    useEffect(() => {
        const syncThemeEditorContext = () => {
            const track = getBridge().inputs?.track ?? null;
            useThemeQuickEditorStore.getState().setContext({
                aiTheme: state.aiTheme,
                customTheme: state.customTheme,
                bgMode: themeSourceModel.activeSource,
                coverUrl: bridgeTrackCover(track),
                song: null,
                songKey: null,
                isDaylight,
                promptSourceText: track?.title ?? null,
                isPureMusic: false,
                songTitle: track?.title,
            });
        };
        syncThemeEditorContext();
        const offTrack = bridgeOn('track', syncThemeEditorContext);
        return () => offTrack();
    }, [isDaylight, state.aiTheme, state.customTheme, themeSourceModel.activeSource]);
    const styleDraft: StyleDraft = useMemo(() => ({
        tuning: state.styleTunings[visualizerMode],
        change: (patch: Record<string, unknown>) => state.setStyleTuning(visualizerMode, patch),
        reset: () => state.resetStyleTuning(visualizerMode),
    }), [state, visualizerMode]);

    const tuningSettings = useMemo(() => selectTuningSettings(state), [state]);
    const backgroundConfig = useMemo(() => selectBackgroundConfig(state), [state]);
    const backgroundActions = useMemo(() => selectBackgroundActions(state), [state]);

    // v0.4.0: 自定义字体 is a real choice again — the user imports a font pack or picks an installed
    // system family, and the settings tree carries only the chosen family/label (the font binary
    // stays in IndexedDB). The tile opens the picker through `onFontStyleChange('custom')`.
    const fontStyleOptions = useMemo(() => ([
        { label: t('options.fontSans'), value: 'sans' as FontChoice },
        { label: t('options.fontSerif'), value: 'serif' as FontChoice },
        { label: t('options.fontMono'), value: 'mono' as FontChoice },
        { label: t('options.customFont'), value: 'custom' as FontChoice },
    ]), [t]);

    // v0.4.1: the 预览文本 choice is gone — the stage always previews the song that is playing.

    /* v0.4.0 自定义字体: the picker writes the appearance fields in one go, so the theme and the
     * pushed config always agree. A system face needs no extra record; an imported pack is already
     * in `state.uploadedFonts` (the picker registered it), so nothing is written here but the choice.
     * The label shown next to the current font is the pack's file name when the choice is imported,
     * the family name otherwise — `addUploadedFont` is never called from this path. */
    const currentFontLabel = useMemo(() => {
        const { customFontFamily, fontStyle } = state.appearance;
        if (fontStyle !== 'custom' || !customFontFamily) return t('options.customFont');
        const uploaded = state.uploadedFonts.find(font => font.family === customFontFamily);
        return uploaded?.label ?? customFontFamily;
    }, [state.appearance, state.uploadedFonts, t]);

    const onPickFont = useCallback((choice: FontPickerChoice) => {
        setFontPickerOpen(false);
        useSettingsStore.getState().setAppearance({
            fontStyle: 'custom',
            customFontFamily: choice.family,
            customFontSource: choice.source,
            customFontStack: choice.stack && choice.stack.length > 0 ? choice.stack.join(', ') : null,
        });
    }, []);

    /** 恢复默认: back to the built-in sans stack, custom fields cleared. */
    const onClearFont = useCallback(() => {
        setFontPickerOpen(false);
        useSettingsStore.getState().setAppearance({
            fontStyle: 'sans',
            customFontFamily: null,
            customFontSource: null,
            customFontStack: null,
        });
    }, []);

    /* v0.4.0: imported font packs live in IndexedDB; registering them again on every load is what
     * makes a persisted choice survive a page reload (the font binary is not in the settings tree). */
    const uploadedFonts = state.uploadedFonts;
    useEffect(() => {
        if (uploadedFonts.length === 0) return;
        void restoreUploadedFonts(uploadedFonts).catch(() => undefined);
    }, [uploadedFonts]);

    return (
        <SettingsKitThemeContext.Provider value={{ isDaylight, theme: activeTheme }}>
        <>
            {!open && (
                <FoliaSidePanel
                    open={panelOpen}
                    onToggle={() => setPanelOpen(current => !current)}
                    onClose={() => setPanelOpen(false)}
                    onOpenVisualizerSettings={() => openVisualizerSettings('visualizer')}
                    onOpenBackgroundSettings={() => openVisualizerSettings('background')}
                    onThemeSourceChange={source => state.setThemeSource(source)}
                    themeSourceModel={themeSourceModel}
                    hasCustomTheme
                    theme={activeTheme}
                    isDaylight={isDaylight}
                />
            )}
            {/* Bottom-centre playback HUD; it is hidden while the settings overlay owns the stage. */}
            <PlaybackBar settingsOpen={open} />
            <ThemeQuickEditorHost
                onSaveAiTheme={theme => {
                    state.setAiTheme(theme);
                    state.setThemeSource('ai');
                }}
                onSaveCustomTheme={theme => state.setCustomTheme(theme)}
            />
            <div
                className="font-sans"
                data-spw-settings-overlay={open ? 'true' : 'false'}
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: open ? 'auto' : 'none',
                    display: open ? 'block' : 'none',
                    ['--text-primary' as string]: activeTheme.primaryColor,
                }}
                data-spw-settings-ui
                data-open={open ? 'true' : 'false'}
            >
            <StudioWindow
                title={t('options.lyricsStyleSettings')}
                onBack={close}
                backLabel={t('ui.back')}
                isDaylight={isDaylight}
                theme={activeTheme}
                stage={(
                    <Stage
                        t={t}
                        visualizerMode={visualizerMode}
                        onVisualizerModeChange={mode => state.setVisualizerMode(mode)}
                        randomEnabled={state.randomVisualizerModePerSong}
                        onRandomChange={enabled => state.setRandomVisualizerModePerSong(enabled)}
                    />
                )}
            >
                <VisPlaygroundSettingsPanel
                    linuxOnly
                    activeSection={state.activeSection as VisPlaygroundEditSection}
                    onSectionChange={(section: VisPlaygroundEditSection) => state.setActiveSection(section as SettingsSection)}
                    t={t}
                    isDaylight={isDaylight}
                    theme={activeTheme}
                    visualizerMode={visualizerMode as VisualizerMode}
                    visualizerEntry={styleEntry as never}
                    styleDraft={styleDraft}
                    settings={tuningSettings as never}
                    controlCardBg={CONTROL_CARD_BG}
                    rangeInputClass={RANGE_INPUT_CLASS}
                    visualizerOpacity={state.appearance.visualizerOpacity}
                    onVisualizerOpacityChange={opacity => state.setAppearance({ visualizerOpacity: opacity })}
                    backgroundConfig={backgroundConfig as never}
                    backgroundActions={backgroundActions as never}
                    fontStyleValue={state.appearance.fontStyle as FontChoice}
                    fontStyleOptions={fontStyleOptions}
                    subtitleFontStyleOptions={fontStyleOptions}
                    onFontStyleChange={fontStyle => {
                        // v0.4.0: picking 自定义 opens the picker instead of relying on a tile that
                        // has no font to show yet; the family is written once a face is chosen.
                        if (fontStyle === 'custom') {
                            setFontPickerOpen(true);
                            return;
                        }
                        state.setAppearance({ fontStyle });
                    }}
                    customFontFamily={state.appearance.customFontFamily}
                    currentFontLabel={currentFontLabel}
                    fontScale={state.appearance.fontScale}
                    fontScaleOptions={FONT_SCALE_OPTIONS}
                    onFontScaleChange={fontScale => state.setAppearance({ fontScale })}
                    subtitleFontScale={state.subtitle.subtitleFontScale}
                    onSubtitleFontScaleChange={subtitleFontScale => state.setSubtitle({ subtitleFontScale })}
                    fontWeight={state.appearance.fontWeight}
                    fontWeightOptions={FONT_WEIGHT_OPTIONS}
                    onFontWeightChange={fontWeight => state.setAppearance({ fontWeight })}
                    onFontWeightFollowChange={follow => state.setAppearance({ fontWeight: follow ? null : 400 })}
                    onResetCommonSettings={() => {
                        state.resetAppearance();
                    }}
                    hideTranslationSubtitle={state.subtitle.hideTranslationSubtitle}
                    onToggleHideTranslationSubtitle={hideTranslationSubtitle => state.setSubtitle({ hideTranslationSubtitle })}
                    onToggleShowSubtitleTranslation={shown => state.setSubtitle({ subtitleContentMode: shown ? 'translation' : 'none' })}
                    subtitleContentMode={state.subtitle.subtitleContentMode as SubtitleContentMode}
                    onSubtitleContentModeChange={subtitleContentMode => state.setSubtitle({ subtitleContentMode })}
                    subtitleOverlayLayout={state.subtitle.subtitleOverlayLayout}
                    onSubtitleOverlayLayoutChange={subtitleOverlayLayout => state.setSubtitle({ subtitleOverlayLayout })}
                    subtitleOverlayOpacity={state.subtitle.subtitleOverlayOpacity}
                    onSubtitleOverlayOpacityChange={subtitleOverlayOpacity => state.setSubtitle({ subtitleOverlayOpacity })}
                    subtitleOverlayBackground={state.subtitle.subtitleOverlayBackground}
                    onToggleSubtitleOverlayBackground={subtitleOverlayBackground => state.setSubtitle({ subtitleOverlayBackground })}
                    subtitleUpcomingLyricsBlur={state.subtitle.subtitleUpcomingLyricsBlur}
                    onToggleSubtitleUpcomingLyricsBlur={subtitleUpcomingLyricsBlur => state.setSubtitle({ subtitleUpcomingLyricsBlur })}
                    showHarmonySubtitle={state.subtitle.showHarmonySubtitle}
                    onToggleShowHarmonySubtitle={showHarmonySubtitle => state.setSubtitle({ showHarmonySubtitle })}
                    harmonySubtitleBackground={state.subtitle.harmonySubtitleBackground}
                    onToggleHarmonySubtitleBackground={harmonySubtitleBackground => state.setSubtitle({ harmonySubtitleBackground })}
                    subtitleFontInheritsLyrics={state.subtitle.subtitleFontInheritsLyrics}
                    onSubtitleFontInheritsLyricsChange={subtitleFontInheritsLyrics => state.setSubtitle({ subtitleFontInheritsLyrics })}
                    subtitleFontStyle={state.subtitle.subtitleFontStyle as Theme['fontStyle']}
                    subtitleFontWeight={state.subtitle.subtitleFontWeight}
                    onSubtitleFontStyleChange={subtitleFontStyle => state.setSubtitle({
                        subtitleFontStyle,
                        subtitleFontFamily: null,
                        subtitleFontStack: null,
                    })}
                    onSubtitleFontWeightChange={subtitleFontWeight => state.setSubtitle({ subtitleFontWeight })}
                    onSubtitleFontWeightFollowChange={follow => state.setSubtitle({ subtitleFontWeight: follow ? null : 400 })}
                    subtitleFontFamily={state.subtitle.subtitleFontFamily}
                    onSubtitleFontFamilyChange={subtitleFontFamily => state.setSubtitle({
                        subtitleFontFamily,
                        subtitleFontStyle: subtitleFontFamily ? 'custom' : 'sans',
                    })}
                    onOpenSubtitleFontPicker={() => undefined}
                    onResetSubtitleSettings={() => state.resetSubtitle()}
                />
            </StudioWindow>
            </div>
            {visualizerSettingsOpen && (
                <FoliaVisualizerSettingsPopup
                    state={state}
                    theme={activeTheme}
                    isDaylight={isDaylight}
                    visualizerMode={visualizerMode}
                    initialEditSection={visualizerSettingsSection}
                    backgroundConfig={backgroundConfig}
                    backgroundActions={backgroundActions}
                    currentFontLabel={currentFontLabel}
                    onClose={() => setVisualizerSettingsOpen(false)}
                />
            )}
            {/* v0.4.0 自定义字体: 导入字体包 / 系统字体，预览用当前播放的那句歌词。 */}
            <FontPickerModal
                open={fontPickerOpen}
                onClose={() => setFontPickerOpen(false)}
                currentFamily={state.appearance.fontStyle === 'custom' ? state.appearance.customFontFamily : null}
                onPick={onPickFont}
                onClear={onClearFont}
                previewText={liveLyricText ?? undefined}
            />
        </>
        </SettingsKitThemeContext.Provider>
    );
};

export default App;
