# Flute — Freesound 553217

- Original: Oriental flute by t-man95
- Source: https://freesound.org/people/t-man95/sounds/553217/
- License: CC0 1.0 Universal, verified 2026-09-20 on the source page.
- License text: https://creativecommons.org/publicdomain/zero/1.0/
- Description: 2 minutes of solo flute, mono 44.1 kHz, recorded with an AT4040. The uploader
  calls it "oriental style flute music" and does not say which instrument it is, so this
  bank does not claim it is a shinobue, a ryuteki or any other named Japanese flute.
  The in-app voice is still called 神楽笛 (kagura-bue) because that is the character the
  preset aims for, not a claim about the recording.
- Processing: the recording is a performance, not isolated notes. `scripts/build_shinobue.py`
  measures the pitch of every 0.25 s frame with a harmonic product spectrum, keeps runs that
  hold within 25 cents for at least 0.8 s with a harmonic ratio of 0.45 or better, bins them
  by semitone, keeps the longest run per bin and spreads eight evenly across the range.
  Each is cropped to 1.15 s, mono 32 kHz, DC removed, peak normalized to 0.85, 35 ms attack
  fade, 120 ms tail fade, signed 16-bit PCM embedded in bank.js.
- A flute does not decay, so these are looped rather than one-shot: loop points sit an integer
  number of periods apart and are nudged onto zero crossings, the same approach as the choir.
- Pitch is measured from the waveform, not inferred. Exact values, loop points and the
  original checksum are in manifest.json.
- A second CC0 candidate was measured and rejected: Freesound 365258 (RutgerMuller,
  96 kHz/24 bit, 89 s) yields only 13 steady runs totalling 14.2 s, clustered at MIDI
  71.7–74.6 with a second island near 83, which cannot cover the range.
- Rebuild: `python3 scripts/build_shinobue.py /path/to/553217__t-man95__oriental-flute.wav`
- CC0 legal text is also bundled at ../vsco2/LICENSE. This recording is not part of VSCO.
