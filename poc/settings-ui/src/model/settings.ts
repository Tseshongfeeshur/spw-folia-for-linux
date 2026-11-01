/* The POC's configuration store. Field names and defaults mirror Folia's own settings store (its
 * `src/types.ts` defaults) so the reused settings panels can be handed the exact shape they expect;
 * only the persistence layer differs (memory + host bridge here). */
import { create } from 'zustand';
import {
    DEFAULT_CADENZA_TUNING,
    DEFAULT_CAPPELLA_TUNING,
    DEFAULT_CLADDAGH_TUNING,
    DEFAULT_CLASSIC_TUNING,
    DEFAULT_DIORAMA_TUNING,
    DEFAULT_FUME_TUNING,
    DEFAULT_LATENT_BACKGROUND_TUNING,
    DEFAULT_LUMIERE_TUNING,
    DEFAULT_MONET_BACKGROUND_TUNING,
    DEFAULT_MONET_TUNING,
    DEFAULT_NOMAND_BACKGROUND_TUNING,
    DEFAULT_PARTITA_TUNING,
    DEFAULT_PENDOLO_TUNING,
    DEFAULT_SMART_BEAT_SETTINGS,
    DEFAULT_SONNET_TUNING,
    DEFAULT_SORA_BACKGROUND_TUNING,
    DEFAULT_TEMPERA_TUNING,
    DEFAULT_TILT_TUNING,
    type BeatEffectSetting,
    type DualTheme,
    type SmartBeatMode,
    type SubtitleOverlayLayout,
    type SmartBeatSettings,
    type Theme,
    type ThemeMode,
    type UrlBackgroundItem,
} from '@/types';
/* 0.7.22 花火's tuning defaults live with the style's own module, not in `src/types.ts` (unlike the
 * 14 older styles), so they are imported from there. */
import { DEFAULT_HANABI_TUNING } from '@/components/visualizer/hanabi/types';
import { DEFAULT_MACHI_TUNING } from '@/components/visualizer/machi/types';
import { DEFAULT_NEBBIA_TUNING } from '@/components/visualizer/nebbia/types';
import { DAYLIGHT_THEME, PREVIEW_THEME } from './theme';

export type StyleMode =
    | 'sonnet'
    | 'tempera'
    | 'lumiere'
    /** 0.7.22 花火: order 26, between 绘光 (25) and 古典 (30) on Folia's own shelf. */
    | 'hanabi'
    | 'machi'
    | 'nebbia'
    | 'classic'
    | 'cadenza'
    | 'partita'
    | 'fume'
    | 'tilt'
    | 'claddagh'
    | 'monet'
    | 'pendolo'
    | 'cappella'
    | 'diorama'
    | 'still';

export type BackgroundMode = 'common' | 'monet' | 'nomand' | 'latent' | 'url' | 'sora';

export type SettingsSection = 'visualizer' | 'background' | 'common' | 'subtitle';

export type FontChoice = 'sans' | 'serif' | 'mono' | 'custom';

/** Each style's tuning defaults, imported from Folia so its own panel shows Folia's values. */
export const STYLE_TUNING_DEFAULTS: Record<StyleMode, Record<string, unknown>> = {
    sonnet: { ...DEFAULT_SONNET_TUNING },
    tempera: { ...DEFAULT_TEMPERA_TUNING },
    lumiere: { ...DEFAULT_LUMIERE_TUNING },
    hanabi: { ...DEFAULT_HANABI_TUNING },
    machi: { ...DEFAULT_MACHI_TUNING },
    nebbia: { ...DEFAULT_NEBBIA_TUNING },
    classic: { ...DEFAULT_CLASSIC_TUNING },
    cadenza: { ...DEFAULT_CADENZA_TUNING },
    partita: { ...DEFAULT_PARTITA_TUNING },
    fume: { ...DEFAULT_FUME_TUNING },
    tilt: { ...DEFAULT_TILT_TUNING },
    claddagh: { ...DEFAULT_CLADDAGH_TUNING },
    monet: { ...DEFAULT_MONET_TUNING },
    pendolo: { ...DEFAULT_PENDOLO_TUNING },
    cappella: { ...DEFAULT_CAPPELLA_TUNING },
    diorama: { ...DEFAULT_DIORAMA_TUNING },
    still: {},
};

/** Folia's settings keys for each style's tuning: `settings.<key>` is what a style's panel sees. */
export const STYLE_TUNING_KEYS: Record<StyleMode, string> = {
    sonnet: 'sonnetTuning',
    tempera: 'temperaTuning',
    lumiere: 'lumiereTuning',
    hanabi: 'hanabiTuning',
    machi: 'machiTuning',
    nebbia: 'nebbiaTuning',
    classic: 'classicTuning',
    cadenza: 'cadenzaTuning',
    partita: 'partitaTuning',
    fume: 'fumeTuning',
    tilt: 'tiltTuning',
    claddagh: 'claddaghTuning',
    monet: 'monetTuning',
    pendolo: 'pendoloTuning',
    cappella: 'cappellaTuning',
    diorama: 'dioramaTuning',
    still: 'stillTuning',
};

export const BACKGROUND_TUNING_DEFAULTS: Record<'monet' | 'nomand' | 'latent' | 'sora', Record<string, unknown>> = {
    monet: { ...DEFAULT_MONET_BACKGROUND_TUNING },
    nomand: { ...DEFAULT_NOMAND_BACKGROUND_TUNING },
    latent: { ...DEFAULT_LATENT_BACKGROUND_TUNING },
    sora: { ...DEFAULT_SORA_BACKGROUND_TUNING },
};

/** The shelf order of `model/styles.tsx` (each entry's `order` ascending). Duplicated here because
 *  `styles.tsx` imports `StyleMode` from this module — a value import back would be a cycle.
 *  `styles.tsx` asserts the two lists agree at module load. */
export const STYLE_MODE_SHELF_ORDER: StyleMode[] = [
    'sonnet', 'tempera', 'lumiere', 'hanabi', 'classic', 'cadenza', 'partita', 'fume',
    'tilt', 'claddagh', 'monet', 'pendolo', 'cappella', 'diorama', 'still',
];

/** 0.7.22 随机歌词样式's default pool: every style ticked, in Folia's shelf order. */
export const DEFAULT_RANDOM_VISUALIZER_MODES: StyleMode[] = [...STYLE_MODE_SHELF_ORDER];

/** Keeps only known styles, in shelf order; an empty selection means "everything". */
export const normalizeRandomModes = (value: unknown): StyleMode[] => {
    const selected = new Set(Array.isArray(value) ? value : []);
    const modes = STYLE_MODE_SHELF_ORDER.filter(mode => selected.has(mode));
    return modes.length > 0 ? modes : [...STYLE_MODE_SHELF_ORDER];
};

/** Picks inside the pool, excluding the current style whenever another choice exists. */
export const pickRandomMode = (
    modes: readonly StyleMode[],
    current: StyleMode,
    random: () => number = Math.random,
): StyleMode => {
    const pool = normalizeRandomModes(modes);
    const alternatives = pool.filter(mode => mode !== current);
    const candidates = alternatives.length > 0 ? alternatives : pool;
    return candidates[Math.floor(random() * candidates.length)];
};

export interface CommonBackgroundSettings {
    opacity: number;
    useCoverColorBg: boolean;
    disableVignette: boolean;
    disableGeometricBackground: boolean;
}

export interface AppearanceSettings {
    fontStyle: FontChoice;
    fontScale: number;
    fontWeight: number | null;
    visualizerOpacity: number;
    customFontFamily: string | null;
    /** v0.4.0: fallback families for a custom font (Folia's `fontFamilyStack`), comma-separated list. */
    customFontStack: string | null;
    /** v0.4.0: which custom font source is in use — `null` when the built-in faces are selected. */
    customFontSource: CustomFontSource | null;
}

/** A user-chosen lyrics font. `system` picks one already installed on this machine (Chromium's
 *  Local Font Access API); `uploaded` is a font file the user imported, registered through the
 *  FontFace API and persisted in IndexedDB so it survives a page reload. */
export type CustomFontSource = 'system' | 'uploaded';

/** One uploaded font as the settings tree persists it (the Blob stays in IndexedDB, keyed by id). */
export interface UploadedFontDescriptor {
    id: string;
    label: string;
    family: string;
    createdAt: number;
}

export interface SubtitleSettings {
    hideTranslationSubtitle: boolean;
    subtitleContentMode: 'translation' | 'romanization' | 'both' | 'none';
    subtitleOverlayLayout: SubtitleOverlayLayout;
    subtitleOverlayOpacity: number;
    subtitleOverlayBackground: boolean;
    subtitleUpcomingLyricsBlur: boolean;
    showHarmonySubtitle: boolean;
    harmonySubtitleBackground: boolean;
    subtitleFontInheritsLyrics: boolean;
    subtitleFontStyle: FontChoice;
    subtitleFontFamily: string | null;
    subtitleFontStack: string | null;
    subtitleFontWeight: number | null;
    subtitleFontScale: number;
}

export const DEFAULT_APPEARANCE: AppearanceSettings = {
    fontStyle: 'sans',
    fontScale: 1,
    fontWeight: null,
    visualizerOpacity: 1,
    customFontFamily: null,
    customFontStack: null,
    customFontSource: null,
};

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
    hideTranslationSubtitle: false,
    subtitleContentMode: 'translation',
    subtitleOverlayLayout: 'translation',
    subtitleOverlayOpacity: 0.6,
    subtitleOverlayBackground: true,
    subtitleUpcomingLyricsBlur: true,
    showHarmonySubtitle: true,
    harmonySubtitleBackground: true,
    subtitleFontInheritsLyrics: true,
    subtitleFontStyle: 'sans',
    subtitleFontFamily: null,
    subtitleFontStack: null,
    subtitleFontWeight: null,
    subtitleFontScale: 1,
};

/** Mirrored Folia storage keys (canonical tree in packaging/testdata/default-settings.json). */
export const DEFAULT_LYRIC_MOTION = 0.8;
export const DEFAULT_TEXTURE_RESOLUTION = 1.0;

export const DEFAULT_COMMON_BACKGROUND: CommonBackgroundSettings = {
    opacity: 0.75,
    useCoverColorBg: false,
    disableVignette: false,
    disableGeometricBackground: false,
};

const makeThemeVariant = (theme: Theme, name: string): Theme => ({
    ...theme,
    name,
    wordColors: [],
    lyricsIcons: [],
    provider: 'Custom',
});

/** Folia's custom theme editor needs a real editable seed from the first launch. */
export const DEFAULT_CUSTOM_DUAL_THEME: DualTheme = {
    light: makeThemeVariant(DAYLIGHT_THEME, 'Custom Light'),
    dark: makeThemeVariant(PREVIEW_THEME, 'Custom Dark'),
};

interface BeatEffectPatch {
    on?: boolean;
    strength?: number;
    parts?: Record<string, number>;
}

interface SettingsState {
    activeSection: SettingsSection;
    setActiveSection: (section: SettingsSection) => void;

    visualizerMode: StyleMode;
    /** `options.preserveRandom` (0.7.22): a per-song reroll must not switch 随机模式 back off. */
    setVisualizerMode: (mode: StyleMode, options?: { preserveRandom?: boolean; notify?: boolean }) => void;

    /** Folia's own method names. `stubs/useVisualizerSettingsStore.ts` aliases Folia's store to this
     *  one, so the reused RandomPoolGroup / lyricStyleChoices code calls these three directly. */
    handleSetVisualizerMode: (mode: StyleMode, options?: { notify?: boolean; preserveRandom?: boolean }) => void;
    handleToggleRandomVisualizerModePerSong: (enable: boolean, options?: { notify?: boolean }) => void;
    handleSetRandomVisualizerModes: (modes: readonly StyleMode[]) => void;

    /** 0.7.22 随机歌词样式: one style drawn per song from `randomVisualizerModes`. */
    randomVisualizerModePerSong: boolean;
    setRandomVisualizerModePerSong: (enabled: boolean) => void;
    randomVisualizerModes: StyleMode[];
    setRandomVisualizerModes: (modes: readonly StyleMode[]) => void;
    /** Another style from the pool for the song that is playing (never the current one). */
    rerollVisualizerMode: () => void;

    /** Folia storage keys mirrored for round-trip fidelity (no control in this window yet). */
    lyricMotion: number;
    setLyricMotion: (value: number) => void;
    textureResolution: number;
    setTextureResolution: (value: number) => void;

    smartBeat: SmartBeatSettings;
    handleSetSmartBeat: (patch: { mode?: SmartBeatMode; effects?: Record<string, BeatEffectPatch> }) => void;

    styleTunings: Record<StyleMode, Record<string, unknown>>;
    setStyleTuning: (mode: StyleMode, patch: Record<string, unknown>) => void;
    resetStyleTuning: (mode: StyleMode) => void;

    /** Effective theme lightness used by the preview publisher. Not persisted. */
    isDaylightTheme: boolean;
    setIsDaylightTheme: (value: boolean) => void;
    animationIntensity: Theme['animationIntensity'];
    setAnimationIntensity: (value: Theme['animationIntensity']) => void;
    setActiveTheme: (theme: Theme) => void;
    /** Folia's default / AI / custom theme source. */
    themeSource: ThemeMode;
    aiTheme: DualTheme | null;
    customTheme: DualTheme;
    setThemeSource: (source: ThemeMode) => void;
    setAiTheme: (theme: DualTheme | null) => void;
    setCustomTheme: (theme: DualTheme) => void;

    backgroundMode: BackgroundMode;
    setBackgroundMode: (mode: BackgroundMode) => void;
    urlBackgroundItems: UrlBackgroundItem[];
    urlBackgroundSelectedId: string | null;
    addUrlBackgroundItem: (item: UrlBackgroundItem) => void;
    updateUrlBackgroundItem: (id: string, patch: Partial<Omit<UrlBackgroundItem, 'id'>>) => void;
    deleteUrlBackgroundItem: (id: string) => void;
    selectUrlBackgroundItem: (id: string | null) => void;
    backgroundTunings: Record<'monet' | 'nomand' | 'latent' | 'sora', Record<string, unknown>>;
    setBackgroundTuning: (mode: 'monet' | 'nomand' | 'latent' | 'sora', patch: Record<string, unknown>) => void;
    resetBackgroundTuning: (mode: 'monet' | 'nomand' | 'latent' | 'sora') => void;
    commonBackground: CommonBackgroundSettings;
    setCommonBackground: (patch: Partial<CommonBackgroundSettings>) => void;

    appearance: AppearanceSettings;
    setAppearance: (patch: Partial<AppearanceSettings>) => void;
    resetAppearance: () => void;

    /** v0.4.0: font files the user imported. The file itself lives in IndexedDB under `id`; only
     *  this descriptor list rides the settings tree (so import/export and sync carry the names). */
    uploadedFonts: UploadedFontDescriptor[];
    setUploadedFonts: (fonts: readonly UploadedFontDescriptor[]) => void;
    addUploadedFont: (descriptor: UploadedFontDescriptor) => void;
    removeUploadedFont: (id: string) => void;

    subtitle: SubtitleSettings;
    setSubtitle: (patch: Partial<SubtitleSettings>) => void;
    resetSubtitle: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
    activeSection: 'visualizer',
    setActiveSection: activeSection => set({ activeSection }),

    visualizerMode: 'sonnet',
    // A hand-selected style disables the per-song random draw.
    setVisualizerMode: (visualizerMode, options) =>
        set(() => ({ visualizerMode, ...(options?.preserveRandom ? {} : { randomVisualizerModePerSong: false }) })),

    randomVisualizerModePerSong: false,
    setRandomVisualizerModePerSong: enabled =>
        set(state => {
            if (!enabled) return { randomVisualizerModePerSong: false };
            // Entering the pool draws a style at once, so the shelf and the shelf's first tab agree.
            const current = state.visualizerMode;
            const pool = normalizeRandomModes(state.randomVisualizerModes);
            const next = pool.length > 0 ? pickRandomMode(pool, current) : current;
            return { randomVisualizerModePerSong: true, visualizerMode: next };
        }),
    randomVisualizerModes: DEFAULT_RANDOM_VISUALIZER_MODES,
    setRandomVisualizerModes: modes => set({ randomVisualizerModes: normalizeRandomModes(modes) }),
    rerollVisualizerMode: () =>
        set(state => {
            const pool = normalizeRandomModes(state.randomVisualizerModes);
            const next = pickRandomMode(pool, state.visualizerMode);
            if (next === state.visualizerMode) return {};
            return { visualizerMode: next };
        }),

    // Folia's names, forwarded to the implementations above so the reused panels (whose store import
    // is aliased to this one) can drive the pool. Kept as store fields so their identity is stable
    // across renders — `useRandomPool` selects them through `useShallow`.
    handleSetVisualizerMode: (mode, options) =>
        get().setVisualizerMode(mode, { preserveRandom: options?.preserveRandom }),
    handleToggleRandomVisualizerModePerSong: enable => get().setRandomVisualizerModePerSong(enable),
    handleSetRandomVisualizerModes: modes => get().setRandomVisualizerModes(modes),

    lyricMotion: DEFAULT_LYRIC_MOTION,
    setLyricMotion: lyricMotion => set({ lyricMotion }),
    textureResolution: DEFAULT_TEXTURE_RESOLUTION,
    setTextureResolution: textureResolution => set({ textureResolution }),

    smartBeat: { ...DEFAULT_SMART_BEAT_SETTINGS, effects: {} },
    handleSetSmartBeat: patch =>
        set(state => {
            const effects: Record<string, BeatEffectSetting> = { ...state.smartBeat.effects };
            if (patch.effects) {
                for (const [id, effectPatch] of Object.entries(patch.effects)) {
                    const current = effects[id] ?? { on: true, strength: 1 };
                    effects[id] = {
                        on: effectPatch.on ?? current.on,
                        strength: effectPatch.strength ?? current.strength,
                        ...(effectPatch.parts || current.parts ? { parts: { ...current.parts, ...effectPatch.parts } } : {}),
                    };
                }
            }
            return {
                smartBeat: {
                    mode: patch.mode ?? state.smartBeat.mode,
                    effects,
                },
            };
        }),

    styleTunings: JSON.parse(JSON.stringify(STYLE_TUNING_DEFAULTS)),
    setStyleTuning: (mode, patch) =>
        set(state => ({
            styleTunings: { ...state.styleTunings, [mode]: { ...state.styleTunings[mode], ...patch } },
        })),
    resetStyleTuning: mode =>
        set(state => ({
            styleTunings: { ...state.styleTunings, [mode]: { ...STYLE_TUNING_DEFAULTS[mode] } },
        })),

    isDaylightTheme: false,
    setIsDaylightTheme: isDaylightTheme => set({ isDaylightTheme }),
    animationIntensity: 'normal',
    setAnimationIntensity: animationIntensity => set({ animationIntensity }),
    setActiveTheme: theme => set(state => {
        if (state.themeSource === 'ai' && state.aiTheme) {
            const key = state.isDaylightTheme ? 'light' : 'dark';
            return { aiTheme: { ...state.aiTheme, [key]: theme } };
        }
        if (state.themeSource === 'custom') {
            const key = state.isDaylightTheme ? 'light' : 'dark';
            return { customTheme: { ...state.customTheme, [key]: theme } };
        }
        return { animationIntensity: theme.animationIntensity };
    }),
    themeSource: 'default',
    aiTheme: null,
    customTheme: { ...DEFAULT_CUSTOM_DUAL_THEME },
    setThemeSource: themeSource => set(state => ({
        themeSource: themeSource === 'ai' && !state.aiTheme ? 'default' : themeSource,
    })),
    setAiTheme: aiTheme => set(state => ({
        aiTheme,
        themeSource: aiTheme ? state.themeSource : state.themeSource === 'ai' ? 'default' : state.themeSource,
    })),
    setCustomTheme: customTheme => set({ customTheme, themeSource: 'custom' }),

    backgroundMode: 'latent',
    setBackgroundMode: backgroundMode => set({ backgroundMode }),
    urlBackgroundItems: [],
    urlBackgroundSelectedId: null,
    addUrlBackgroundItem: item => set(state => ({
        urlBackgroundItems: [...state.urlBackgroundItems.filter(candidate => candidate.id !== item.id), item],
        urlBackgroundSelectedId: item.id,
    })),
    updateUrlBackgroundItem: (id, patch) => set(state => ({
        urlBackgroundItems: state.urlBackgroundItems.map(item => item.id === id ? { ...item, ...patch } : item),
    })),
    deleteUrlBackgroundItem: id => set(state => {
        const urlBackgroundItems = state.urlBackgroundItems.filter(item => item.id !== id);
        return {
            urlBackgroundItems,
            urlBackgroundSelectedId: state.urlBackgroundSelectedId === id
                ? (urlBackgroundItems[0]?.id ?? null)
                : state.urlBackgroundSelectedId,
        };
    }),
    selectUrlBackgroundItem: urlBackgroundSelectedId => set({ urlBackgroundSelectedId }),
    backgroundTunings: JSON.parse(JSON.stringify(BACKGROUND_TUNING_DEFAULTS)),
    setBackgroundTuning: (mode, patch) =>
        set(state => ({
            backgroundTunings: { ...state.backgroundTunings, [mode]: { ...state.backgroundTunings[mode], ...patch } },
        })),
    resetBackgroundTuning: mode =>
        set(state => ({
            backgroundTunings: { ...state.backgroundTunings, [mode]: { ...BACKGROUND_TUNING_DEFAULTS[mode] } },
        })),
    commonBackground: { ...DEFAULT_COMMON_BACKGROUND },
    setCommonBackground: patch => set(state => ({ commonBackground: { ...state.commonBackground, ...patch } })),

    appearance: { ...DEFAULT_APPEARANCE },
    setAppearance: patch => set(state => ({ appearance: { ...state.appearance, ...patch } })),
    resetAppearance: () => set({ appearance: { ...DEFAULT_APPEARANCE } }),

    uploadedFonts: [],
    setUploadedFonts: fonts => set({ uploadedFonts: [...fonts] }),
    addUploadedFont: descriptor =>
        set(state => {
            const rest = state.uploadedFonts.filter(font => font.id !== descriptor.id);
            return { uploadedFonts: [...rest, descriptor] };
        }),
    removeUploadedFont: id => set(state => ({ uploadedFonts: state.uploadedFonts.filter(font => font.id !== id) })),

    subtitle: { ...DEFAULT_SUBTITLE_SETTINGS },
    setSubtitle: patch => set(state => ({ subtitle: { ...state.subtitle, ...patch } })),
    resetSubtitle: () => set({ subtitle: { ...DEFAULT_SUBTITLE_SETTINGS } }),
}));

/** The `VisualizerTuningSettings` bag handed to style panels: every tuning under its settings key. */
export const selectTuningSettings = (state: SettingsState): Record<string, unknown> => {
    const bag: Record<string, unknown> = {};
    for (const mode of Object.keys(STYLE_TUNING_KEYS) as StyleMode[]) {
        bag[STYLE_TUNING_KEYS[mode]] = state.styleTunings[mode];
    }
    bag.latentBackgroundTuning = state.backgroundTunings.latent;
    bag.monetBackgroundTuning = state.backgroundTunings.monet;
    bag.nomandBackgroundTuning = state.backgroundTunings.nomand;
    bag.soraBackgroundTuning = state.backgroundTunings.sora;
    bag.smartBeat = state.smartBeat;
    return bag;
};

/** Exactly what the UI persists through the host: Folia storage-key names, JSON-serialisable. */
export interface SettingsSnapshot {
    version: 1;
    styleId: StyleMode;
    /** 0.7.22 随机歌词样式: the pool and whether one style is drawn per song. */
    randomVisualizerModePerSong: boolean;
    randomVisualizerModes: StyleMode[];
    smartBeat: SmartBeatSettings;
    styleTunings: Record<StyleMode, Record<string, unknown>>;
    backgroundMode: BackgroundMode;
    backgroundTunings: Record<'monet' | 'nomand' | 'latent' | 'sora', Record<string, unknown>>;
    commonBackground: CommonBackgroundSettings;
    appearance: AppearanceSettings;
    /** v0.4.0: imported font descriptors (the files live in IndexedDB). */
    uploadedFonts: UploadedFontDescriptor[];
    subtitle: SubtitleSettings;
    lyricMotion: number;
    textureResolution: number;
    animationIntensity: Theme['animationIntensity'];
    isDaylightTheme: boolean;
    themeSource: ThemeMode;
    aiTheme: DualTheme | null;
    customTheme: DualTheme;
    urlBackgroundItems: UrlBackgroundItem[];
    urlBackgroundSelectedId: string | null;
}

export const snapshotFromState = (state: SettingsState): SettingsSnapshot => ({
    version: 1,
    styleId: state.visualizerMode,
    randomVisualizerModePerSong: state.randomVisualizerModePerSong,
    randomVisualizerModes: state.randomVisualizerModes,
    smartBeat: state.smartBeat,
    styleTunings: state.styleTunings,
    backgroundMode: state.backgroundMode,
    backgroundTunings: state.backgroundTunings,
    commonBackground: state.commonBackground,
    appearance: state.appearance,
    uploadedFonts: state.uploadedFonts,
    subtitle: state.subtitle,
    lyricMotion: state.lyricMotion,
    textureResolution: state.textureResolution,
    animationIntensity: state.animationIntensity,
    isDaylightTheme: state.isDaylightTheme,
    themeSource: state.themeSource,
    aiTheme: state.aiTheme,
    customTheme: state.customTheme,
    urlBackgroundItems: state.urlBackgroundItems,
    urlBackgroundSelectedId: state.urlBackgroundSelectedId,
});

const normalizeSmartBeat = (value: unknown, fallback: SmartBeatSettings): SmartBeatSettings => {
    if (!value || typeof value !== 'object') return fallback;
    const candidate = value as { mode?: unknown; enabled?: unknown; effects?: unknown };
    const mode: SmartBeatMode = candidate.mode === 'cached' || candidate.mode === 'on'
        ? candidate.mode
        : candidate.mode === 'off'
            ? 'off'
            : candidate.enabled === true
                ? 'on'
                : 'off';
    const effects = candidate.effects && typeof candidate.effects === 'object'
        ? candidate.effects as Record<string, BeatEffectSetting>
        : {};
    return { mode, effects };
};

/** Hydrates the store from a snapshot the plugin persisted (unknown/missing keys keep defaults). */
export const applySnapshot = (snapshot: Partial<SettingsSnapshot> | null | undefined): void => {
    if (!snapshot || typeof snapshot !== 'object') return;
    const clean = <T>(value: T | undefined, fallback: T): T => (value === undefined || value === null ? fallback : value);
    useSettingsStore.setState(state => {
        const visualizerMode = clean(snapshot.styleId, state.visualizerMode);
        return {
            visualizerMode,
            randomVisualizerModePerSong: clean(snapshot.randomVisualizerModePerSong, state.randomVisualizerModePerSong),
            randomVisualizerModes: snapshot.randomVisualizerModes === undefined
                ? state.randomVisualizerModes
                : normalizeRandomModes(snapshot.randomVisualizerModes),
            smartBeat: normalizeSmartBeat(snapshot.smartBeat, state.smartBeat),
            styleTunings: { ...state.styleTunings, ...clean(snapshot.styleTunings, {} as Record<StyleMode, Record<string, unknown>>) },
            backgroundMode: clean(snapshot.backgroundMode, state.backgroundMode),
            backgroundTunings: { ...state.backgroundTunings, ...clean(snapshot.backgroundTunings, {} as Record<'monet' | 'nomand' | 'latent' | 'sora', Record<string, unknown>>) },
            commonBackground: { ...state.commonBackground, ...clean(snapshot.commonBackground, {} as CommonBackgroundSettings) },
            appearance: { ...state.appearance, ...clean(snapshot.appearance, {} as AppearanceSettings) },
            uploadedFonts: Array.isArray(snapshot.uploadedFonts) ? snapshot.uploadedFonts : state.uploadedFonts,
            subtitle: { ...state.subtitle, ...clean(snapshot.subtitle, {} as SubtitleSettings) },
            lyricMotion: clean(snapshot.lyricMotion, state.lyricMotion),
            textureResolution: clean(snapshot.textureResolution, state.textureResolution),
            animationIntensity: clean(snapshot.animationIntensity, state.animationIntensity),
            isDaylightTheme: clean(snapshot.isDaylightTheme, state.isDaylightTheme),
            themeSource: clean(snapshot.themeSource, state.themeSource),
            aiTheme: clean(snapshot.aiTheme, state.aiTheme),
            customTheme: clean(snapshot.customTheme, state.customTheme),
            urlBackgroundItems: Array.isArray(snapshot.urlBackgroundItems) ? snapshot.urlBackgroundItems : state.urlBackgroundItems,
            urlBackgroundSelectedId: clean(snapshot.urlBackgroundSelectedId, state.urlBackgroundSelectedId),
        };
    });
};

export const selectActiveTheme = (state: Pick<SettingsState, 'themeSource' | 'aiTheme' | 'customTheme' | 'isDaylightTheme' | 'animationIntensity'>): Theme => {
    if (state.themeSource === 'ai' && state.aiTheme) return state.isDaylightTheme ? state.aiTheme.light : state.aiTheme.dark;
    if (state.themeSource === 'custom' && state.customTheme) return state.isDaylightTheme ? state.customTheme.light : state.customTheme.dark;
    return {
        ...(state.isDaylightTheme ? DAYLIGHT_THEME : PREVIEW_THEME),
        animationIntensity: state.animationIntensity,
    };
};

/** The `VisualizerBackgroundConfig` bag the background tab reads. */
export const selectBackgroundConfig = (state: SettingsState): Record<string, unknown> => ({
    mode: state.backgroundMode,
    common: state.commonBackground,
    monet: { tuning: state.backgroundTunings.monet },
    nomand: { tuning: state.backgroundTunings.nomand },
    latent: { tuning: state.backgroundTunings.latent },
    sora: { tuning: state.backgroundTunings.sora },
    url: { items: state.urlBackgroundItems, selectedId: state.urlBackgroundSelectedId },
});

/** The `VisualizerBackgroundActions` bag: writes from the reused background cards. */
export const selectBackgroundActions = (state: SettingsState): Record<string, unknown> => ({
    onModeChange: state.setBackgroundMode,
    common: {
        onOpacityChange: (opacity: number) => state.setCommonBackground({ opacity }),
        onCoverColorChange: (useCoverColorBg: boolean) => state.setCommonBackground({ useCoverColorBg }),
        onDisableVignetteChange: (disableVignette: boolean) => state.setCommonBackground({ disableVignette }),
        onDisableGeometricChange: (disableGeometricBackground: boolean) =>
            state.setCommonBackground({ disableGeometricBackground }),
    },
    monet: {
        onTuningChange: (patch: Record<string, unknown>) => state.setBackgroundTuning('monet', patch),
        onResetTuning: () => state.resetBackgroundTuning('monet'),
    },
    nomand: {
        onTuningChange: (patch: Record<string, unknown>) => state.setBackgroundTuning('nomand', patch),
        onResetTuning: () => state.resetBackgroundTuning('nomand'),
    },
    latent: {
        onTuningChange: (patch: Record<string, unknown>) => state.setBackgroundTuning('latent', patch),
        onResetTuning: () => state.resetBackgroundTuning('latent'),
    },
    sora: {
        onTuningChange: (patch: Record<string, unknown>) => state.setBackgroundTuning('sora', patch),
        onResetTuning: () => state.resetBackgroundTuning('sora'),
    },
    url: {
        onAdd: state.addUrlBackgroundItem,
        onUpdate: state.updateUrlBackgroundItem,
        onDelete: state.deleteUrlBackgroundItem,
        onSelect: state.selectUrlBackgroundItem,
    },
});
