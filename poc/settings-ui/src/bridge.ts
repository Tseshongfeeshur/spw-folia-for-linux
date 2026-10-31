/* Page-side bridge shared by the Qt host and the browser preview harness. */
import type { ObsBrowserSourceConfig } from '@/types/obsBrowserSource';
import { useSettingsStore, snapshotFromState, applySnapshot, type SettingsSnapshot } from '~/model/settings';

export type BridgeEventType = 'hello' | 'settings' | 'state' | 'lyrics' | 'track' | 'audio' | 'config' | 'ui';

export interface BridgeStateMessage {
    currentTime: number;
    duration: number;
    playerState: 'IDLE' | 'PLAYING' | 'PAUSED';
    sentAtMs: number;
    playbackRate?: number;
    lyricOffsetMs?: number;
}

export interface BridgeTrackMessage {
    id: string;
    title: string;
    artist?: string | null;
    album?: string | null;
    coverUrl?: string | null;
    coverDataUrl?: string | null;
    durationMs?: number;
    lyrics?: unknown;
}

export type PlaybackControlAction = 'toggle' | 'previous' | 'next' | 'seek';
export interface PlaybackControlExtra { positionMs?: number }
export interface PlaybackControlPayload extends PlaybackControlExtra { action: PlaybackControlAction }

export const bridgeTrackCover = (track: BridgeTrackMessage | null | undefined): string | null => {
    const value = track?.coverUrl ?? track?.coverDataUrl ?? null;
    return typeof value === 'string' && value.length > 0 ? value : null;
};

interface SettingsUiApi {
    isSettingsOpen: () => boolean;
    openSettings: () => void;
    closeSettings: () => void;
}

export interface SpwFoliaBridge {
    protocol?: number;
    on: (type: string, listener: (payload: never) => void) => (() => void) | void;
    off?: (type: string, listener: (payload: never) => void) => void;
    emit: (type: string, payload?: unknown) => void;
    pushConfig: (config: ObsBrowserSourceConfig) => void;
    getSettings: () => unknown;
    setSettings: (partial: unknown) => void;
    requestClose?: () => void;
    lastConfig?: () => ObsBrowserSourceConfig | null;
    inputs?: { state?: BridgeStateMessage | null; lyrics?: unknown; track?: BridgeTrackMessage | null };
    ui?: SettingsUiApi;
}

interface SettingsUiController {
    open: () => void;
    close: () => void;
    toggle: () => void;
    isOpen: () => boolean;
}

declare global {
    interface Window {
        __SPW_FOLIA__?: SpwFoliaBridge;
        __SPW_FOLIA_UI__?: SettingsUiController;
        __SPW_FOLIA_SETTINGS_UI__?: SettingsUiController;
        __SPW_FOLIA_LAST_CONFIG__?: ObsBrowserSourceConfig;
        __SPW_FOLIA_TEST_CONTROLS__?: PlaybackControlPayload[];
    }
}

const listeners = new Map<string, Set<(payload: unknown) => void>>();

const emitLocally = (type: string, payload: unknown): void => {
    for (const listener of listeners.get(type) ?? []) {
        try { listener(payload); } catch (error) { console.error('[settings-ui] bridge listener failed', type, error); }
    }
};

export const DEMO_TRACK: BridgeTrackMessage = {
    id: 'spike-song', title: 'Spike Track', artist: 'Folia', album: 'POC', coverUrl: null,
    lyrics: { lines: [
        { startMs: 0, endMs: 4000, main: '静かな夜に', sub: '在寂静的夜里' },
        { startMs: 4000, endMs: 8000, main: '光が満ちて', sub: '光芒洒满' },
        { startMs: 8000, endMs: 12000, main: '君の声が', sub: '你的声音' },
        { startMs: 12000, endMs: 16000, main: '遠くへ響く', sub: '响彻远方' },
    ] },
};

const demoTracks: BridgeTrackMessage[] = [
    DEMO_TRACK,
    { id: 'demo-02', title: '夜航星', artist: '不才', album: '夜航星' },
    { id: 'demo-03', title: '星间旅行 Interstellar Journey', artist: '知更鸟, HOYO-MiX' },
];
const DEMO_DURATION_MS = 245_000;
let bridgeInstance: SpwFoliaBridge | null = null;
let demoIndex = 0;
let demoPlaying = true;
let demoPositionMs = 31_000;
let demoAtMs = Date.now();
let demoDurationMs = DEMO_DURATION_MS;

const isInjected = (): boolean => !!window.__SPW_FOLIA__;
const demoPosition = (): number => Math.min(demoDurationMs, Math.max(0, demoPositionMs + (demoPlaying ? Date.now() - demoAtMs : 0)));

const emitDemoState = (): void => {
    const posMs = Math.round(demoPosition());
    const state: BridgeStateMessage = {
        currentTime: posMs / 1000, duration: demoDurationMs / 1000,
        playerState: demoPlaying ? 'PLAYING' : 'PAUSED', sentAtMs: Date.now(), playbackRate: 1,
    };
    if (bridgeInstance) bridgeInstance.inputs = { ...bridgeInstance.inputs, state };
    emitLocally('state', { posMs, durationMs: demoDurationMs, playing: demoPlaying, rate: 1, tsMs: Date.now() });
};

const emitDemoTrack = (): void => {
    const track = { ...demoTracks[demoIndex], durationMs: demoDurationMs };
    if (bridgeInstance) bridgeInstance.inputs = { ...bridgeInstance.inputs, track };
    emitLocally('track', track);
};

const handleDemoControl = (value: unknown): void => {
    const control = value as Partial<PlaybackControlPayload>;
    if (!control.action) return;
    const record: PlaybackControlPayload = { action: control.action };
    if (typeof control.positionMs === 'number') record.positionMs = control.positionMs;
    window.__SPW_FOLIA_TEST_CONTROLS__ = [...(window.__SPW_FOLIA_TEST_CONTROLS__ ?? []), record];
    switch (control.action) {
        case 'toggle':
            demoPositionMs = demoPosition(); demoAtMs = Date.now(); demoPlaying = !demoPlaying;
            emitDemoState();
            break;
        case 'previous':
        case 'next':
            demoIndex = (demoIndex + (control.action === 'next' ? 1 : -1) + demoTracks.length) % demoTracks.length;
            demoPositionMs = 0; demoAtMs = Date.now(); emitDemoTrack(); emitDemoState();
            break;
        case 'seek':
            demoPositionMs = Math.max(0, Math.min(demoDurationMs, control.positionMs ?? demoPosition()));
            demoAtMs = Date.now(); emitDemoState();
            break;
    }
};

const createFakeBridge = (): SpwFoliaBridge => {
    window.__SPW_FOLIA_TEST_CONTROLS__ = [];
    window.setTimeout(() => { emitDemoTrack(); emitDemoState(); }, 0);
    return {
        protocol: 1,
        on: (type, listener) => {
            const set = listeners.get(type) ?? new Set();
            set.add(listener as (payload: unknown) => void);
            listeners.set(type, set);
            return () => set.delete(listener as (payload: unknown) => void);
        },
        emit: (type, payload) => {
            if (type === 'control') handleDemoControl(payload);
            else emitLocally(type, payload);
        },
        pushConfig: config => { window.__SPW_FOLIA_LAST_CONFIG__ = config; emitLocally('config', config); },
        getSettings: () => null,
        setSettings: partial => console.info('[settings-ui] setSettings', partial),
        requestClose: () => console.info('[settings-ui] requestClose'),
        inputs: { state: null, lyrics: DEMO_TRACK.lyrics, track: DEMO_TRACK },
    };
};

export const getBridge = (): SpwFoliaBridge => {
    if (bridgeInstance) return bridgeInstance;
    bridgeInstance = isInjected() ? window.__SPW_FOLIA__ as SpwFoliaBridge : createFakeBridge();
    if (!isInjected()) window.__SPW_FOLIA__ = bridgeInstance;
    return bridgeInstance;
};

export const bridgeIsInjected = (): boolean => isInjected();

export const bridgeOn = <T,>(type: string, listener: (payload: T) => void): (() => void) => {
    const bridge = getBridge();
    const callback = listener as never;
    const off = bridge.on(type, callback);
    if (typeof off === 'function') return off;
    if (bridge.off) return () => bridge.off?.(type, callback);
    return () => undefined;
};

export const sendPlaybackControl = (action: PlaybackControlAction, extra: PlaybackControlExtra = {}): void => {
    getBridge().emit('control', { action, ...extra });
};

export const SETTINGS_EMIT_MIN_INTERVAL_MS = 100;
let applyingRemote = false;
let pendingSnapshot: SettingsSnapshot | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
let lastEmitAt = 0;
let lastEmitJson = '';

const flushSettingsEmit = (): void => {
    const snapshot = pendingSnapshot;
    pendingSnapshot = null;
    if (!snapshot) return;
    lastEmitAt = Date.now();
    lastEmitJson = JSON.stringify(snapshot);
    getBridge().setSettings(snapshot);
};

const scheduleSettingsEmit = (snapshot: SettingsSnapshot): void => {
    if (JSON.stringify(snapshot) === lastEmitJson) return;
    pendingSnapshot = snapshot;
    const wait = Math.max(0, SETTINGS_EMIT_MIN_INTERVAL_MS - (Date.now() - lastEmitAt));
    if (wait === 0) {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = null;
        flushSettingsEmit();
    } else if (!pendingTimer) {
        pendingTimer = setTimeout(() => { pendingTimer = null; flushSettingsEmit(); }, wait);
    }
};

export const subscribeSettingsRoundTrip = (): (() => void) => {
    const bridge = getBridge();
    const incoming = bridge.getSettings?.();
    if (incoming && typeof incoming === 'object') applySnapshot(incoming as Partial<SettingsSnapshot>);
    const off = bridgeOn<SettingsSnapshot>('settings', snapshot => {
        applyingRemote = true;
        try { applySnapshot(snapshot); } finally { applyingRemote = false; }
    });
    lastEmitJson = JSON.stringify(snapshotFromState(useSettingsStore.getState()));
    const unsubscribe = useSettingsStore.subscribe(state => {
        if (!applyingRemote) scheduleSettingsEmit(snapshotFromState(state));
    });
    emitLocally('bridgeReady', { injected: isInjected() });
    return () => {
        off(); unsubscribe();
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingTimer = null; pendingSnapshot = null;
    };
};

const isSettingsUiOpen = (): boolean => openState;
let openState = false;
export const setSettingsUiOpenState = (open: boolean): void => { openState = open; };

export const registerSettingsUiController = (controls: { open: () => void; close: () => void }): (() => void) => {
    const controller: SettingsUiController = {
        ...controls,
        toggle: () => (isSettingsUiOpen() ? controls.close() : controls.open()),
        isOpen: isSettingsUiOpen,
    };
    window.__SPW_FOLIA_UI__ = controller;
    window.__SPW_FOLIA_SETTINGS_UI__ = controller;
    getBridge().ui = {
        isSettingsOpen: isSettingsUiOpen,
        openSettings: controls.open,
        closeSettings: controls.close,
    };
    const off = bridgeOn<{ action?: string }>('ui', payload => {
        if (payload?.action === 'open-settings') controls.open();
        else if (payload?.action === 'close-settings') controls.close();
        else if (payload?.action === 'toggle-settings') controller.toggle();
    });
    return () => { off(); delete window.__SPW_FOLIA_UI__; delete window.__SPW_FOLIA_SETTINGS_UI__; };
};
