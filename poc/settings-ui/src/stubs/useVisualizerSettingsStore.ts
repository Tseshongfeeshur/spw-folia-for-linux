/* Folia's visualizer store facade.
 *
 * Folia's controls use historical field names (visualizerBackgroundMode,
 * handleSetSonnetTuning, ...), while the Linux bridge keeps a structured store.
 * This adapter exposes the original names without duplicating state, so every
 * reused control remains live and writes through to the bridge-backed store.
 */
import { getBackgroundTunings, getVisualizerTuning, getVisualizerTuningModes } from '@/components/visualizer/tuningRegistry';
import { useSettingsStore, type StyleMode } from '../model/settings';

const adaptState = (state: ReturnType<typeof useSettingsStore.getState>): Record<string, any> => {
    const adapted: Record<string, any> = {
        ...state,
        visualizerBackgroundMode: state.backgroundMode,
        backgroundOpacity: state.commonBackground.opacity,
        disableVisualizerGeometricBackground: state.commonBackground.disableGeometricBackground,
        disableVisualizerVignette: state.commonBackground.disableVignette,
        urlBackgroundList: state.urlBackgroundItems,
        urlBackgroundSelectedId: state.urlBackgroundSelectedId,
        handleSetVisualizerBackgroundMode: state.setBackgroundMode,
        handleSetBackgroundOpacity: (opacity: number) => state.setCommonBackground({ opacity }),
        handleToggleDisableVisualizerGeometricBackground: (disabled: boolean) => state.setCommonBackground({ disableGeometricBackground: disabled }),
        handleToggleDisableVisualizerVignette: (disabled: boolean) => state.setCommonBackground({ disableVignette: disabled }),
        handleSetUrlBackgroundList: (items: any[]) => {
            const current = state.urlBackgroundItems;
            for (const item of current) if (!items.some(candidate => candidate.id === item.id)) state.deleteUrlBackgroundItem(item.id);
            for (const item of items) state.addUrlBackgroundItem(item);
        },
        handleSetUrlBackgroundSelectedId: state.selectUrlBackgroundItem,
    };

    // Folia's registry is the source of truth for field and action names. This keeps newly added
    // lyric styles live without another Linux-only list that can drift from the upstream entry.
    for (const mode of getVisualizerTuningModes()) {
        const tuning = getVisualizerTuning(mode);
        if (!tuning) continue;
        const current = state.styleTunings[mode as StyleMode] ?? tuning.defaults;
        adapted[tuning.settingsKey] = current;
        adapted[tuning.settingsSetterKey] = (patch: Record<string, unknown>) => {
            const latest = useSettingsStore.getState().styleTunings[mode as StyleMode] ?? tuning.defaults;
            const merged = tuning.storage?.merge
                ? tuning.storage.merge(latest, patch)
                : { ...latest, ...patch };
            useSettingsStore.getState().setStyleTuning(mode as StyleMode, merged as Record<string, unknown>);
        };
        if (tuning.settingsResetterKey) {
            adapted[tuning.settingsResetterKey] = () => state.resetStyleTuning(mode as StyleMode);
        }
    }
    for (const tuning of getBackgroundTunings()) {
        const mode = tuning.mode as keyof typeof state.backgroundTunings;
        const current = state.backgroundTunings[mode] ?? tuning.defaults;
        adapted[tuning.settingsKey] = current;
        adapted[tuning.settingsSetterKey] = (patch: Record<string, unknown>) => {
            if (mode in state.backgroundTunings) state.setBackgroundTuning(mode as 'monet' | 'nomand' | 'latent' | 'sora', patch);
        };
        adapted[tuning.settingsResetterKey] = () => {
            if (mode in state.backgroundTunings) state.resetBackgroundTuning(mode as 'monet' | 'nomand' | 'latent' | 'sora');
        };
    }
    return adapted;
};

type Selector<T> = (state: Record<string, any>) => T;
type Facade = {
    <T>(selector: Selector<T>): T;
    getState: () => Record<string, any>;
    subscribe: typeof useSettingsStore.subscribe;
};

export const useVisualizerSettingsStore = ((selector: Selector<unknown>) => (
    useSettingsStore(state => selector(adaptState(state)))
)) as Facade;

useVisualizerSettingsStore.getState = () => adaptState(useSettingsStore.getState());
useVisualizerSettingsStore.subscribe = useSettingsStore.subscribe;

export const selectVisualizerSettingsSnapshot = (state: ReturnType<typeof useSettingsStore.getState>) => adaptState(state);
