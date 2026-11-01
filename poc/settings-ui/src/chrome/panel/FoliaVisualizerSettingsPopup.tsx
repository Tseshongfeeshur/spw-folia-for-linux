import React from 'react';
import VisPlayground from '@/components/visualizer/window/VisPlayground';
import type { Theme, SubtitleContentMode, VisualizerMode } from '@/types';
import { parseFontFamilyStack } from '~/publisher/themeFonts';
import { importFontFile } from '~/model/uploadedFonts';
import type { VisualizerBackgroundActions, VisualizerBackgroundConfig } from '@/components/visualizer/backgrounds/definition';

interface FoliaVisualizerSettingsPopupProps {
    state: any;
    theme: Theme;
    isDaylight: boolean;
    visualizerMode: VisualizerMode;
    initialEditSection?: 'visualizer' | 'background' | 'common' | 'subtitle' | 'global';
    backgroundConfig: VisualizerBackgroundConfig;
    backgroundActions: VisualizerBackgroundActions;
    currentFontLabel: string;
    onClose: () => void;
}

/**
 * The panel's settings icon opens Folia's own lyric-style workbench. Keeping this as a thin
 * adapter means the popup's frame, transitions, preview and controls continue to come from Folia,
 * while each write is redirected to the plugin's settings store.
 */
const FoliaVisualizerSettingsPopup: React.FC<FoliaVisualizerSettingsPopupProps> = ({
    state,
    theme,
    isDaylight,
    visualizerMode,
    initialEditSection = 'visualizer',
    backgroundConfig,
    backgroundActions,
    currentFontLabel,
    onClose,
}) => {
    const subtitle = state.subtitle;
    const appearance = state.appearance;
    const subtitleContentMode = subtitle.subtitleContentMode as SubtitleContentMode;
    const customFontFamily = appearance.customFontFamily;
    const customFontStack = parseFontFamilyStack(appearance.customFontStack);
    const subtitleUsesCustomFont = subtitle.subtitleFontStyle === 'custom' || Boolean(subtitle.subtitleFontFamily);
    const subtitleFontFamily = subtitleUsesCustomFont ? subtitle.subtitleFontFamily : null;
    const subtitleFontStack = subtitleUsesCustomFont ? parseFontFamilyStack(subtitle.subtitleFontStack) : [];
    const fontStyle = appearance.fontStyle === 'custom' ? 'sans' : appearance.fontStyle;

    return (
        <div className="pointer-events-auto fixed inset-0 z-[2147483400]">
            <VisPlayground
                theme={theme}
                isDaylight={isDaylight}
                visualizerMode={visualizerMode}
                initialEditSection={initialEditSection}
                linuxOnly={false}
                visualizerOpacity={appearance.visualizerOpacity}
                staticMode={false}
                backgroundConfig={backgroundConfig}
                backgroundActions={backgroundActions}
                hideTranslationSubtitle={subtitle.hideTranslationSubtitle}
                showSubtitleTranslation={subtitleContentMode !== 'none'}
                subtitleContentMode={subtitleContentMode}
                subtitleOverlayLayout={subtitle.subtitleOverlayLayout}
                subtitleOverlayOpacity={subtitle.subtitleOverlayOpacity}
                subtitleOverlayBackground={subtitle.subtitleOverlayBackground}
                subtitleUpcomingLyricsBlur={subtitle.subtitleUpcomingLyricsBlur}
                showHarmonySubtitle={subtitle.showHarmonySubtitle}
                harmonySubtitleBackground={subtitle.harmonySubtitleBackground}
                fontStyle={fontStyle}
                fontScale={appearance.fontScale}
                subtitleFontScale={subtitle.subtitleFontScale}
                fontWeight={appearance.fontWeight}
                customFontFamily={customFontFamily}
                customFontLabel={currentFontLabel}
                fontFallbackFamilies={customFontStack}
                subtitleFontInheritsLyrics={subtitle.subtitleFontInheritsLyrics}
                subtitleFontStyle={subtitleUsesCustomFont ? 'sans' : subtitle.subtitleFontStyle}
                subtitleFontWeight={subtitle.subtitleFontWeight}
                subtitleFontFamily={subtitleFontFamily}
                subtitleFontFallbackFamilies={subtitleFontStack}
                onFontStyleChange={next => state.setAppearance({ fontStyle: next, customFontFamily: null, customFontStack: null, customFontSource: null })}
                onFontScaleChange={next => state.setAppearance({ fontScale: next })}
                onSubtitleFontScaleChange={next => state.setSubtitle({ subtitleFontScale: next })}
                onFontWeightChange={next => state.setAppearance({ fontWeight: next })}
                onCustomFontChange={font => state.setAppearance({
                    fontStyle: font ? 'custom' : 'sans',
                    customFontFamily: font?.family ?? null,
                    customFontStack: null,
                    customFontSource: font?.source ?? null,
                })}
                onUploadCustomFont={async file => {
                    try {
                        const { descriptor } = await importFontFile(file);
                        state.setAppearance({
                            fontStyle: 'custom',
                            customFontFamily: descriptor.family,
                            customFontStack: null,
                            customFontSource: 'uploaded',
                        });
                        return { ok: true };
                    } catch (error) {
                        return {
                            ok: false,
                            error: error instanceof Error && error.message ? error.message : undefined,
                        };
                    }
                }}
                onFontFallbackFamiliesChange={families => state.setAppearance({ customFontStack: families.join(', ') })}
                onSubtitleFontInheritsLyricsChange={next => state.setSubtitle({ subtitleFontInheritsLyrics: next })}
                onSubtitleFontStyleChange={next => state.setSubtitle({ subtitleFontStyle: next, subtitleFontFamily: null, subtitleFontStack: null })}
                onSubtitleFontWeightChange={next => state.setSubtitle({ subtitleFontWeight: next })}
                onSubtitleFontFamilyChange={family => state.setSubtitle({ subtitleFontStyle: family ? 'custom' : 'sans', subtitleFontFamily: family })}
                onSubtitleFontFallbackFamiliesChange={families => state.setSubtitle({ subtitleFontStack: families.join(', ') || null })}
                onVisualizerModeChange={next => state.setVisualizerMode(next as never)}
                onVisualizerOpacityChange={next => state.setAppearance({ visualizerOpacity: next })}
                onToggleHideTranslationSubtitle={next => state.setSubtitle({ hideTranslationSubtitle: next })}
                onToggleShowSubtitleTranslation={next => state.setSubtitle({ subtitleContentMode: next ? 'translation' : 'none' })}
                onSubtitleContentModeChange={next => state.setSubtitle({ subtitleContentMode: next })}
                onSubtitleOverlayLayoutChange={subtitleOverlayLayout => state.setSubtitle({ subtitleOverlayLayout })}
                onSubtitleOverlayOpacityChange={next => state.setSubtitle({ subtitleOverlayOpacity: next })}
                onToggleSubtitleOverlayBackground={next => state.setSubtitle({ subtitleOverlayBackground: next })}
                onToggleSubtitleUpcomingLyricsBlur={next => state.setSubtitle({ subtitleUpcomingLyricsBlur: next })}
                onToggleShowHarmonySubtitle={next => state.setSubtitle({ showHarmonySubtitle: next })}
                onToggleHarmonySubtitleBackground={next => state.setSubtitle({ harmonySubtitleBackground: next })}
                onClose={onClose}
            />
        </div>
    );
};

export default FoliaVisualizerSettingsPopup;
