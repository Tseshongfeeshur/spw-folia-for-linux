/* Theme settings facade. AppearanceSection reads these values from Folia's separate store. */
import { useSettingsStore } from '../model/settings';

type ThemeSettingsState = {
    disableAnimations: boolean;
    useSystemTheme: boolean;
    useCoverColorBg: boolean;
    isDaylight: boolean;
};

export const useThemeSettingsStore = ((selector: (state: ThemeSettingsState) => unknown) => (
    useSettingsStore(state => selector({
        disableAnimations: false,
        useSystemTheme: true,
        useCoverColorBg: state.commonBackground.useCoverColorBg,
        isDaylight: state.isDaylightTheme,
    }))
)) as any;

useThemeSettingsStore.getState = () => ({
    disableAnimations: false,
    useSystemTheme: true,
    useCoverColorBg: useSettingsStore.getState().commonBackground.useCoverColorBg,
    isDaylight: useSettingsStore.getState().isDaylightTheme,
});
