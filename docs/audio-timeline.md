# Audio and Playback Timeline

The Kotlin plugin sends an interpolated playback state every 100 ms. The page converts the state to
Folia's clock event and performs its normal rendering interpolation.

The Qt host captures the system playback mix through PipeWire. It requests a sink monitor stream,
stores mono float samples, and runs a 2048-point Hann-windowed FFT at roughly 30 Hz. The output
matches the Folia visualizer contract:

- 1024 raw spectrum bytes in the 0..255 AnalyserNode scale
- bass 20-150 Hz
- low-mid 150-400 Hz
- mid 400-1200 Hz
- vocal 1000-3500 Hz
- treble 3500-12000 Hz
- gamma-shaped power and five bands in the 0..255 scale

When playback is paused or the capture is silent, the host sends an empty spectrum and writes
`(sin(nowMs / 2000) + 1) * 20` to power and all five bands. This keeps Folia's documented breathing
fallback active without forwarding audio through the JVM.
