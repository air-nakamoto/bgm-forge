# Koto — Freesound 365242

- Original: Japan_Koto_Improv_Amateur_Session_3.wav by RutgerMuller
- Source: https://freesound.org/people/RutgerMuller/sounds/365242/
- License: CC0 1.0 Universal, verified 2026-09-20 on the source page.
- License text: https://creativecommons.org/publicdomain/zero/1.0/
- Description: a 13-minute amateur improvisation on a Japanese koto (2ch, 96 kHz).
- Processing: the recording is a performance, not isolated notes. `scripts/build_koto.py`
  finds plucks whose preceding 0.24 s is quiet and whose pitch stays steady for a further
  0.6 s, bins them by semitone, keeps the cleanest one per bin and spreads five across the
  range. Each is cropped to 2.5 s, mono 32 kHz, DC removed, peak normalized to 0.85,
  2 ms attack fade and 400 ms tail fade, signed 16-bit PCM embedded in bank.js.
- Pitch is measured from the waveform, not inferred. The koto is not in equal temperament,
  so the roots are fractional MIDI numbers. Exact values and the original checksum are in
  manifest.json.
- Rebuild: `python3 scripts/build_koto.py /path/to/365242__rutgermuller__japan_koto_improv_amateur_session_3.wav`
- CC0 legal text is also bundled at ../vsco2/LICENSE. This recording is not part of VSCO.
