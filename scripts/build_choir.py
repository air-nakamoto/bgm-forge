#!/usr/bin/env python3
"""Build the CC0 choir bank from Freesound 764124 (requires ffmpeg and numpy).

原音は4チャンネルのB-format（FuMa）。先頭のWチャンネルが無指向成分なので、そこだけを使う。
群衆が同じ母音を伸ばした録音で、1.4〜8.3秒がF3付近で安定している。原音のピークは0.07と
極端に小さいため正規化する（AGENTS.md §5 のフルートと同じ落とし穴）。
"""
import base64, hashlib, json, pathlib, subprocess, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1])
RATE = 32000
START, END = 1.45, 8.30

pcm = subprocess.check_output(['ffmpeg','-v','error','-i',str(SRC),'-af','pan=mono|c0=c0',
                               '-ar',str(RATE),'-f','f32le','-'])
w = np.frombuffer(pcm, dtype='<f4').astype(np.float64)
y = w[int(START*RATE):int(END*RATE)].copy()
y -= y.mean()

def f0(seg, lo=80, hi=600):
    seg = seg-seg.mean(); h = seg*np.hanning(len(seg))
    a = np.correlate(h, h, 'full')[len(h)-1:]; a /= a[0]+1e-12
    l1, l2 = int(RATE/hi), int(RATE/lo)
    k = l1+int(np.argmax(a[l1:l2]))
    return RATE/k, float(a[k])

hz, q = f0(y[int(RATE*0.5):int(RATE*4.5)])
period = RATE/hz
original_peak = float(np.abs(y).max())
y *= 0.85/max(original_peak, 1e-9)
k = int(RATE*0.06);  y[:k]  *= np.linspace(0, 1, k)      # 群衆の立ち上がりは速すぎない
k = int(RATE*0.55);  y[-k:] *= np.linspace(1, 0, k)

# ループ点は整数周期ぶん離し、どちらもゼロ交差に寄せる。長い音でも伸ばし続けられる。
def near_zero(i):
    lo = max(1, i-int(period)); hi = min(len(y)-1, i+int(period))
    j = lo+int(np.argmin(np.abs(y[lo:hi])))
    return j
a = near_zero(int(RATE*1.2))
b = near_zero(a+int(round(4*RATE/period))*int(round(period)))
i16 = np.clip(y*32767, -32768, 32767).astype('<i2')

entry = [{'kind':'choir','root':69+12*float(np.log2(hz/440)),'rate':RATE,
          'loopStart':round(a/RATE,5),'loopEnd':round(b/RATE,5),
          'pcm':base64.b64encode(i16.tobytes()).decode('ascii')}]
(ROOT/'samples/choir').mkdir(parents=True, exist_ok=True)
(ROOT/'samples/choir/bank.js').write_text(
    'window.BGM_CHOIR_BANK=' + json.dumps(entry, separators=(',',':')) + ';\n', encoding='utf-8')
(ROOT/'samples/choir/manifest.json').write_text(json.dumps({
    'source':'https://freesound.org/people/ShangusBurger/sounds/764124/',
    'license':'CC0-1.0',
    'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
    'sourceChannels':'4ch B-format (FuMa); only the omnidirectional W channel is used',
    'cropSeconds':[START, END], 'sampleRate':RATE,
    'fundamentalHz':round(hz,3), 'rootMidi':round(69+12*float(np.log2(hz/440)),3),
    'periodicity':round(q,3), 'originalPeak':round(original_peak,4), 'processedPeak':0.85,
    'loopSeconds':[round(a/RATE,5), round(b/RATE,5)],
}, ensure_ascii=False, indent=1), encoding='utf-8')
names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
m=69+12*np.log2(hz/440); nr=round(m)
print(f"{hz:.2f}Hz ({names[nr%12]}{nr//12-1} {(m-nr)*100:+.0f}セント) 周期性{q:.3f} "
      f"原音ピーク{original_peak:.3f} ループ {a/RATE:.3f}〜{b/RATE:.3f}秒 "
      f"/ bank.js {(ROOT/'samples/choir/bank.js').stat().st_size/1e6:.2f}MB")
