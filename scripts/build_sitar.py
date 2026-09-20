#!/usr/bin/env python3
"""Build the CC0 sitar bank from Freesound 42192 (requires ffmpeg and numpy)."""
import base64
import hashlib
import json
import pathlib
import subprocess
import sys
import numpy as np

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
rate = 32000
pcm = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(source), '-ac', '1', '-ar', str(rate), '-f', 'f32le', '-'])
x = np.frombuffer(pcm, dtype='<f4')
# First isolated strike, including its sympathetic-string tail. No synthetic looping.
x = x[:8 * rate].copy()
x -= x.mean()
y = x[int(.2*rate):int(1.2*rate)]
nfft = 262144
power = abs(np.fft.rfft(y*np.hanning(len(y)), nfft))
freq = np.fft.rfftfreq(nfft, 1/rate)
band = np.where((freq > 150) & (freq < 190))[0]
i = band[np.argmax(power[band])]
offset = .5*(power[i-1]-power[i+1])/(power[i-1]-2*power[i]+power[i+1])
hz = (i+offset)*rate/nfft
root_midi = 69 + 12*np.log2(hz/440)
peak_before = float(max(abs(x)))
x *= .85/peak_before
x[:64] *= np.linspace(0, 1, 64)
x[-int(.5*rate):] *= np.linspace(1, 0, int(.5*rate))
data = np.round(np.clip(x, -1, 1)*32767).astype('<i2').tobytes()
entry = dict(id='sitar-42192', kind='sitar', root=float(root_midi), rate=rate,
             loopStart=0, loopEnd=0, pcm=base64.b64encode(data).decode())
out = root/'samples/sitar'
out.mkdir(parents=True, exist_ok=True)
(out/'bank.js').write_text('// Freesound 42192, CC0-1.0. See CREDITS.md and manifest.json.\nwindow.BGM_SITAR_BANK='+json.dumps([entry], separators=(',', ':'))+';\n')
manifest = dict(source='https://freesound.org/people/deleted_user_229898/sounds/42192/',
               license='CC0-1.0', sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
               sourceDuration=len(pcm)/4/rate, cropSeconds=[0,8], fundamentalHz=float(hz),
               rootMidi=float(root_midi), originalPeak=peak_before, processedPeak=float(max(abs(x))),
               sampleRate=rate, pcmBytes=len(data), fadeInSeconds=.002, fadeOutSeconds=.5)
(out/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps(manifest, indent=2))
