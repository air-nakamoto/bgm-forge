#!/usr/bin/env python3
"""Build the CC0 koto bank from Freesound 365242 (requires ffmpeg and numpy).

原音は13分の即興演奏で、単音の録音ではない。そこから「直前が静かで、周期が安定している」
撥弦だけを自動で選ぶ。選び方は乱数を使わないので、同じ原音からは同じ音が出る。
"""
import base64, hashlib, json, pathlib, subprocess, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1])
RATE = 32000
CROP = 2.5          # 1音あたりの収録秒数
WANT = 5            # 収録する音数

pcm = subprocess.check_output(['ffmpeg','-v','error','-i',str(SRC),'-ac','1','-ar',str(RATE),'-f','f32le','-'])
x = np.frombuffer(pcm, dtype='<f4').astype(np.float64)
x -= x.mean()

H = int(RATE*0.02)
n = len(x)//H
e = np.sqrt(np.array([np.mean(x[i*H:(i+1)*H]**2) for i in range(n)])+1e-12)
d = np.diff(e, prepend=e[0])
th = np.percentile(d, 99.2)

def f0(seg, lo=60, hi=900):
    seg = seg - seg.mean()
    if seg.std() < 1e-5: return 0.0, 0.0
    w = seg*np.hanning(len(seg))
    a = np.correlate(w, w, 'full')[len(w)-1:]
    a /= a[0]+1e-12
    l1, l2 = int(RATE/hi), int(RATE/lo)
    k = l1+int(np.argmax(a[l1:l2]))
    return RATE/k, float(a[k])

need = int(RATE*(CROP+0.6))
cand = []
for i in range(3, n-need//H-2):
    if d[i] <= th or d[i] != d[max(0,i-3):i+4].max(): continue
    t = i*H
    if e[max(0,i-12):i-1].max() > e[i:i+5].max()*0.22: continue    # 前の音の残りが大きい
    f, q = f0(x[t+int(RATE*0.05):t+int(RATE*0.45)])
    if q < 0.7 or not 80 < f < 800: continue
    f2, q2 = f0(x[t+int(RATE*0.6):t+int(RATE*1.0)])                # 余韻も同じ音程か
    if f2 <= 0 or abs(1200*np.log2(f2/f)) > 35 or q2 < 0.7: continue
    cand.append({'start': t, 'hz': f, 'q': q, 'peak': float(e[i:i+5].max())})

# 半音ごとに束ね、束のなかで一番きれいな1音を採る。そこから音域が広くなるよう選ぶ。
bins = {}
for c in cand:
    k = round(69+12*np.log2(c['hz']/440))
    if k not in bins or (c['q'], c['peak']) > (bins[k]['q'], bins[k]['peak']): bins[k] = c
picks, keys = [], sorted(bins)
if len(keys) > WANT:
    keys = [keys[round(i*(len(keys)-1)/(WANT-1))] for i in range(WANT)]
picks = [bins[k] for k in keys]

entries, meta = [], []
for c in picks:
    a = c['start']-int(RATE*0.005)
    y = x[a:a+int(RATE*CROP)].copy()
    y -= y.mean()
    y *= 0.85/max(np.abs(y).max(), 1e-9)
    k = int(RATE*0.002); y[:k] *= np.linspace(0, 1, k)
    k = int(RATE*0.4);   y[-k:] *= np.linspace(1, 0, k)
    i16 = np.clip(y*32767, -32768, 32767).astype('<i2')
    entries.append({'kind':'koto','root':69+12*float(np.log2(c['hz']/440)),'rate':RATE,
                    'loopStart':0,'loopEnd':0,
                    'pcm':base64.b64encode(i16.tobytes()).decode('ascii')})
    meta.append({'atSeconds':round(c['start']/RATE,3),'hz':round(c['hz'],2),
                 'rootMidi':round(69+12*float(np.log2(c['hz']/440)),3),
                 'periodicity':round(c['q'],3),'originalPeak':round(c['peak'],4)})

(ROOT/'samples/koto').mkdir(parents=True, exist_ok=True)
(ROOT/'samples/koto/bank.js').write_text(
    'window.BGM_KOTO_BANK=' + json.dumps(entries, separators=(',',':')) + ';\n', encoding='utf-8')
(ROOT/'samples/koto/manifest.json').write_text(json.dumps({
    'source':'https://freesound.org/people/RutgerMuller/sounds/365242/',
    'license':'CC0-1.0',
    'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
    'sourceDuration':round(len(x)/RATE,3),
    'sampleRate':RATE,'cropSeconds':CROP,'candidates':len(cand),'notes':meta,
}, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"候補 {len(cand)}個 → {len(entries)}音を収録 / bank.js {(ROOT/'samples/koto/bank.js').stat().st_size/1e6:.2f}MB")
for m in meta: print('  ', m)
