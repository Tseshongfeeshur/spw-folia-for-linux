/* Background registry stand-in for the settings window: the six built-in backgrounds and their real
 * settings cards. Only the panels are reused here — this bundle renders no background itself. */
import React from 'react';
import { Aperture, Columns3, Cone, Layers, Square, Wind } from 'lucide-react';
import {
    DEFAULT_LATENT_BACKGROUND_TUNING,
    DEFAULT_MONET_BACKGROUND_TUNING,
    DEFAULT_NOMAND_BACKGROUND_TUNING,
    DEFAULT_SORA_BACKGROUND_TUNING,
} from '@/types';
import { cycleValue, QuickControlChip, QuickControlToggle } from '@/components/shared/QuickControlChip';
import CommonBackgroundSettingsCard from '@/components/visualizer/backgrounds/common/CommonBackgroundSettingsCard';
import LatentBackgroundSettingsCard from '@/components/visualizer/backgrounds/latent/LatentBackgroundSettingsCard';
import { MonetBackgroundSettingsCard } from '@/components/visualizer/backgrounds/monet/MonetBackgroundSettingsCard';
import NomandBackgroundSettingsCard from '@/components/visualizer/backgrounds/nomand/NomandBackgroundSettingsCard';
import { EFFECTS, EFFECT_LABEL_KEYS } from '@/components/visualizer/backgrounds/nomand/NomandBackgroundEffectSettings';
import SoraBackgroundSettingsCard from '@/components/visualizer/backgrounds/sora/SoraBackgroundSettingsCard';
import { UrlBackgroundSettingsCard } from '@/components/visualizer/backgrounds/url/UrlBackgroundSettingsCard';

export type VisualizerBackgroundMode = 'common' | 'monet' | 'nomand' | 'latent' | 'url' | 'sora';

export const DEFAULT_VISUALIZER_BACKGROUND_MODE: VisualizerBackgroundMode = 'latent';

interface BackgroundEntry {
    mode: VisualizerBackgroundMode;
    order: number;
    labelKey: string;
    labelFallback: string;
    /** The mode's 22px line glyph, copied from its entry.tsx; the picture draws it when no live
     * background can be rendered (exactly Folia's PictureFrame fallback). */
    glyph: React.ReactNode;
    renderSettingsPanel?: (props: any) => React.ReactNode;
    /** Original player-panel controls; renderers stay out of this settings-only registry. */
    renderQuickControls?: (props: any) => React.ReactNode;
    resetSettings?: (actions?: any) => void;
}

const BACKGROUND_SOURCE_LABEL_KEYS = {
    'cover-derived': 'options.monetBackgroundSourceCover',
    'uploaded-global': 'options.monetBackgroundSourceUploaded',
} as const;

const LATENT_DISPLAY_MODES = ['dithering', 'mesh', 'both'] as const;
const LATENT_DISPLAY_LABEL_KEYS = {
    dithering: 'options.latentDisplayDithering',
    mesh: 'options.latentDisplayMesh',
    both: 'options.latentDisplayBoth',
} as const;
const LATENT_COLOR_SOURCES = ['cover-theme', 'cover-only'] as const;
const LATENT_COLOR_SOURCE_LABEL_KEYS = {
    'cover-theme': 'options.latentColorSourceCoverTheme',
    'cover-only': 'options.latentColorSourceCoverOnly',
} as const;

const glyph = (children: React.ReactNode): React.ReactNode => (
    <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        {children}
    </svg>
);

const drag = (props: any) => ({
    onSliderPointerDown: props.onSliderPointerDown,
    onSliderCommit: props.onSliderCommit,
});

const entries: BackgroundEntry[] = [
    {
        mode: 'common',
        order: 10,
        labelKey: 'options.visualizerBackgroundModeCommon',
        labelFallback: '通用',
        glyph: glyph(
            <>
                <path d="M4 17l5-8 5 8z" />
                <circle cx="17.5" cy="8.5" r="3" opacity="0.55" />
            </>
        ),
        renderSettingsPanel: props => <CommonBackgroundSettingsCard {...props} />,
        renderQuickControls: ({ config, actions, t }: any) => {
            const useCoverColorBg = config?.common?.useCoverColorBg ?? false;
            const vignette = !(config?.common?.disableVignette ?? false);

            return (
                <>
                    <QuickControlToggle
                        active={useCoverColorBg}
                        label={t(useCoverColorBg ? 'theme.addCoverColor' : 'theme.useDefaultColor')}
                        onToggle={() => actions?.common?.onCoverColorChange?.(!useCoverColorBg)}
                    >
                        <Cone size={14} />
                    </QuickControlToggle>
                    <QuickControlToggle
                        active={vignette}
                        label={t('options.visualizerVignette')}
                        onToggle={() => actions?.common?.onDisableVignetteChange?.(vignette)}
                    >
                        <Aperture size={14} />
                    </QuickControlToggle>
                </>
            );
        },
        resetSettings: actions => {
            actions?.common?.onOpacityChange?.(0.75);
            actions?.common?.onCoverColorChange?.(false);
            actions?.common?.onDisableVignetteChange?.(false);
            actions?.common?.onDisableGeometricChange?.(false);
        },
    },
    {
        mode: 'monet',
        order: 20,
        labelKey: 'options.visualizerBackgroundModeMonet',
        labelFallback: '莫奈',
        glyph: glyph(
            <>
                <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
                <path d="M20.5 8.5L8 19.5" opacity="0.55" />
            </>
        ),
        renderSettingsPanel: props => (
            <MonetBackgroundSettingsCard
                t={props.t}
                tuning={props.config?.monet?.tuning ?? DEFAULT_MONET_BACKGROUND_TUNING}
                onTuningChange={props.actions?.monet?.onTuningChange}
                {...drag(props)}
            />
        ),
        renderQuickControls: ({ config, actions, t }: any) => {
            const tuning = config?.monet?.tuning ?? DEFAULT_MONET_BACKGROUND_TUNING;
            const isFullOverlay = tuning.backgroundLayout === 'full-overlay';
            const source = tuning.backgroundSource;
            const sourceLabel = t(BACKGROUND_SOURCE_LABEL_KEYS[source as keyof typeof BACKGROUND_SOURCE_LABEL_KEYS]);
            const hasImage = Boolean(config?.customImage);
            const change = (patch: Record<string, unknown>) => actions?.monet?.onTuningChange?.(patch);
            const layoutLabel = t(isFullOverlay ? 'options.monetLayoutFullOverlay' : 'options.monetLayoutHalfPane');

            return (
                <>
                    <QuickControlChip
                        label={layoutLabel}
                        title={`${t('options.monetBackgroundLayout')}: ${layoutLabel}`}
                        onClick={() => change({ backgroundLayout: isFullOverlay ? 'half-pane-gradient' : 'full-overlay' })}
                    />
                    <QuickControlChip
                        label={sourceLabel}
                        title={`${t('options.monetBackgroundSource')}: ${sourceLabel}`}
                        disabled={!hasImage && source === 'cover-derived'}
                        onClick={() => change({ backgroundSource: hasImage && source === 'cover-derived' ? 'uploaded-global' : 'cover-derived' })}
                    />
                    <QuickControlToggle
                        active={tuning.backgroundStreaksEnabled}
                        label={t('options.monetBackgroundStreaksEnabled')}
                        onToggle={() => change({ backgroundStreaksEnabled: !tuning.backgroundStreaksEnabled })}
                    >
                        <Columns3 size={14} />
                    </QuickControlToggle>
                    <QuickControlToggle
                        active={tuning.backgroundDriftEnabled}
                        label={t('options.monetBackgroundDriftEnabled')}
                        onToggle={() => change({ backgroundDriftEnabled: !tuning.backgroundDriftEnabled })}
                    >
                        <Wind size={14} />
                    </QuickControlToggle>
                </>
            );
        },
        resetSettings: actions => actions?.monet?.onResetTuning?.(),
    },
    {
        mode: 'nomand',
        order: 30,
        labelKey: 'options.visualizerBackgroundModeNomand',
        labelFallback: '漫游',
        glyph: glyph(
            <>
                <rect x="4" y="4" width="6.5" height="6.5" rx="0.8" />
                <rect x="13.5" y="4" width="6.5" height="6.5" rx="0.8" opacity="0.45" />
                <rect x="4" y="13.5" width="6.5" height="6.5" rx="0.8" opacity="0.45" />
                <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="0.8" />
            </>
        ),
        renderSettingsPanel: props => (
            <NomandBackgroundSettingsCard
                t={props.t}
                tuning={props.config?.nomand?.tuning ?? DEFAULT_NOMAND_BACKGROUND_TUNING}
                onTuningChange={props.actions?.nomand?.onTuningChange}
                {...drag(props)}
            />
        ),
        renderQuickControls: ({ config, actions, t }: any) => {
            const tuning = config?.nomand?.tuning ?? DEFAULT_NOMAND_BACKGROUND_TUNING;
            const source = tuning.imageSource;
            const sourceLabel = t(BACKGROUND_SOURCE_LABEL_KEYS[source as keyof typeof BACKGROUND_SOURCE_LABEL_KEYS]);
            const hasImage = Boolean(config?.customImage);
            const effectLabel = t(EFFECT_LABEL_KEYS[tuning.effect as keyof typeof EFFECT_LABEL_KEYS]);
            const change = (patch: Record<string, unknown>) => actions?.nomand?.onTuningChange?.(patch);

            return (
                <>
                    <QuickControlChip
                        label={sourceLabel}
                        title={`${t('options.nomandBackgroundSource')}: ${sourceLabel}`}
                        disabled={!hasImage && source === 'cover-derived'}
                        onClick={() => change({ imageSource: hasImage && source === 'cover-derived' ? 'uploaded-global' : 'cover-derived' })}
                    />
                    <QuickControlChip
                        label={effectLabel}
                        title={`${t('options.nomandBackgroundEffect')}: ${effectLabel}`}
                        onClick={() => change({ effect: cycleValue(EFFECTS, tuning.effect) })}
                    />
                    <QuickControlToggle
                        active={tuning.overlayEnabled}
                        label={t('options.nomandBackgroundOverlay')}
                        onToggle={() => change({ overlayEnabled: !tuning.overlayEnabled })}
                    >
                        <Layers size={14} />
                    </QuickControlToggle>
                </>
            );
        },
        resetSettings: actions => actions?.nomand?.onResetTuning?.(),
    },
    {
        mode: 'latent',
        order: 35,
        labelKey: 'options.visualizerBackgroundModeLatent',
        labelFallback: '隐现',
        glyph: glyph(
            <>
                <path d="M4.5 7.5h.01M9 7.5h.01M13.5 7.5h.01M18 7.5h.01" strokeWidth="2.2" opacity="0.55" />
                <path d="M3 15c3-3.5 6-3.5 9 0s6 3.5 9 0" />
            </>
        ),
        renderSettingsPanel: props => (
            <LatentBackgroundSettingsCard
                t={props.t}
                tuning={props.config?.latent?.tuning ?? DEFAULT_LATENT_BACKGROUND_TUNING}
                onTuningChange={props.actions?.latent?.onTuningChange}
                {...drag(props)}
            />
        ),
        renderQuickControls: ({ config, actions, t }: any) => {
            const tuning = config?.latent?.tuning ?? DEFAULT_LATENT_BACKGROUND_TUNING;
            const displayLabel = t(LATENT_DISPLAY_LABEL_KEYS[tuning.displayMode as keyof typeof LATENT_DISPLAY_LABEL_KEYS]);
            const colorLabel = t(LATENT_COLOR_SOURCE_LABEL_KEYS[tuning.colorSource as keyof typeof LATENT_COLOR_SOURCE_LABEL_KEYS]);

            return (
                <>
                    <QuickControlChip
                        label={displayLabel}
                        title={`${t('options.latentDisplayMode')}: ${displayLabel}`}
                        onClick={() => actions?.latent?.onTuningChange?.({ displayMode: cycleValue(LATENT_DISPLAY_MODES, tuning.displayMode) })}
                    />
                    <QuickControlChip
                        label={colorLabel}
                        title={`${t('options.latentColorSource')}: ${colorLabel}`}
                        onClick={() => actions?.latent?.onTuningChange?.({ colorSource: cycleValue(LATENT_COLOR_SOURCES, tuning.colorSource) })}
                    />
                    <QuickControlToggle
                        active={tuning.overlayEnabled}
                        label={t('options.nomandBackgroundOverlay')}
                        onToggle={() => actions?.latent?.onTuningChange?.({ overlayEnabled: !tuning.overlayEnabled })}
                    >
                        <Layers size={14} />
                    </QuickControlToggle>
                </>
            );
        },
        resetSettings: actions => actions?.latent?.onResetTuning?.(),
    },
    {
        mode: 'url',
        order: 40,
        labelKey: 'options.visualizerBackgroundModeUrl',
        labelFallback: '嵌入',
        glyph: glyph(
            <>
                <rect x="3.5" y="5" width="17" height="14" rx="2" />
                <path d="M3.5 9.5h17" opacity="0.55" />
            </>
        ),
        renderSettingsPanel: props => (
            <UrlBackgroundSettingsCard
                t={props.t}
                urlBackgroundList={props.config?.url?.items}
                urlBackgroundSelectedId={props.config?.url?.selectedId}
                onAddUrlBackgroundItem={props.actions?.url?.onAdd}
                onUpdateUrlBackgroundItem={props.actions?.url?.onUpdate}
                onDeleteUrlBackgroundItem={props.actions?.url?.onDelete}
                onSetUrlBackgroundSelectedId={props.actions?.url?.onSelect}
            />
        ),
    },
    {
        mode: 'sora',
        order: 50,
        labelKey: 'options.visualizerBackgroundModeSora',
        labelFallback: '空',
        glyph: glyph(
            <>
                <path d="M12 5.5l1.2 2.9 2.9 1.2-2.9 1.2L12 13.7l-1.2-2.9-2.9-1.2 2.9-1.2z" />
                <path d="M5.5 16.5h.01M18 15.5h.01M7 7h.01" strokeWidth="2.2" opacity="0.5" />
            </>
        ),
        renderSettingsPanel: props => (
            <SoraBackgroundSettingsCard
                t={props.t}
                tuning={props.config?.sora?.tuning ?? DEFAULT_SORA_BACKGROUND_TUNING}
                onTuningChange={props.actions?.sora?.onTuningChange}
            />
        ),
        renderQuickControls: ({ config, actions, t }: any) => {
            const tuning = config?.sora?.tuning ?? DEFAULT_SORA_BACKGROUND_TUNING;
            return (
                <QuickControlToggle
                    active={tuning.blank}
                    label={t('options.soraBlank')}
                    onToggle={() => actions?.sora?.onTuningChange?.({ blank: !tuning.blank })}
                >
                    <Square size={14} />
                </QuickControlToggle>
            );
        },
        resetSettings: actions => actions?.sora?.onResetTuning?.(),
    },
];

export const VISUALIZER_BACKGROUND_REGISTRY = entries;

export const hasVisualizerBackgroundMode = (mode: string): mode is VisualizerBackgroundMode =>
    entries.some(entry => entry.mode === mode);

export const getVisualizerBackgroundRegistryEntry = (mode: string): BackgroundEntry =>
    entries.find(entry => entry.mode === mode) ?? entries[0];

export const getVisualizerBackgroundModeLabel = (mode: string, t: (key: string) => string): string => {
    const entry = entries.find(item => item.mode === mode);
    if (!entry) return mode;
    return t(entry.labelKey) || entry.labelFallback;
};
