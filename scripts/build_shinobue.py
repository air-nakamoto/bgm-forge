#!/usr/bin/env python3
"""Build the CC0 flute bank from Freesound 553217 (requires ffmpeg and numpy).

原音は2分ほどの笛の独奏。単音の録音ではないので、箏と同じく「使える区間」を自動で選ぶ。
ただし笛は減衰しない持続音なので、箏の「撥弦の頭を切り出す」方式は使えない。合唱と同じく
安定して伸びている区間にループ点を打ち、そこを繰り返して音を伸ばす。

原音を2つ比べて決めた（2026-09-20）。
  A Freesound 365258（RutgerMuller, 96kHz/24bit, 89秒）安定区間13本・合計14.2秒、
    音高の束は5個で MIDI 71.7〜74.6 と 83 付近だけ。倍音率の中央値0.52。音域を覆えない。
  B Freesound 553217（t-man95, 44.1kHz/16bit モノ, 126秒）安定区間44本・合計48.9秒、
    音高の束14個で MIDI 59.9〜86.0 を連続して覆う。倍音率の中央値0.60。→ こちらを採用。

採用の条件（箏で学んだ検算をそのまま使う）。
  1. 音程が0.8秒以上、±25セント以内で安定していること（調和積スペクトルで毎フレーム測る）
  2. その区間の倍音率（倍音列に乗るエネルギー）が0.45以上
  3. 区間の中で音量が落ち込まないこと（別の音への移り変わりを除く）
  4. ループ点は整数周期ぶん離し、どちらもゼロ交差に寄せる（合唱と同じ）
"""
import base64, hashlib, json, pathlib, subprocess, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1])
RATE = 32000
WANT = 8              # 収録する音数
WIN, HOP, NFFT = int(RATE*0.25), int(RATE*0.05), 32768
MIN_RUN = 0.8         # 安定区間の最短の長さ（秒）
MAX_CENTS = 25        # 区間内で許す音程の揺れ
MIN_HARMONIC = 0.45   # 倍音列に乗っているエネルギーの割合
CROP = 1.15           # 収録秒数。ループするので、これ以上は鳴らしても聞こえない
LOOP_FROM = 0.30      # ループ開始のおおよその位置（ここまでが1回だけ鳴る「吹き始め」）

pcm = subprocess.check_output(['ffmpeg','-v','error','-i',str(SRC),'-ac','1','-ar',str(RATE),'-f','f32le','-'])
x = np.frombuffer(pcm, dtype='<f4').astype(np.float64)
x -= x.mean()

FR = np.fft.rfftfreq(NFFT, 1/RATE)
HANN = np.hanning(WIN)

def analyse(seg):
    """調和積スペクトルで基音を測り、倍音率と高域比も返す。"""
    S = np.abs(np.fft.rfft(seg*HANN, NFFT))
    P = S.copy()
    for k in (2, 3, 4, 5):
        d = S[::k][:len(P)]
        P[:len(d)] *= d
    b = np.where((FR >= 200) & (FR <= 1600))[0]
    f = float(FR[b[np.argmax(P[b])]])
    total = S.sum()
    harmonic = sum(S[(FR > f*k-12) & (FR < f*k+12)].sum() for k in range(1, 14))/total
    return f, float(harmonic), float(S[FR > 6000].sum()/total)

f0s, harms, highs, rmss = [], [], [], []
for i in range(0, len(x)-WIN, HOP):
    seg = x[i:i+WIN]
    r = float(np.sqrt(np.mean(seg**2)))
    if r < 2e-3:
        f0s.append(0.0); harms.append(0.0); highs.append(0.0); rmss.append(r); continue
    f, h, hi = analyse(seg)
    f0s.append(f); harms.append(h); highs.append(hi); rmss.append(r)
f0s, harms, highs, rmss = map(np.array, (f0s, harms, highs, rmss))

# 音程が安定して続いている区間を切り出す。
runs, i, n = [], 0, len(f0s)
while i < n:
    if f0s[i] <= 0 or harms[i] < MIN_HARMONIC:
        i += 1; continue
    j = i+1
    while j < n and f0s[j] > 0 and harms[j] >= MIN_HARMONIC:
        median = np.median(f0s[i:j+1])
        if abs(1200*np.log2(f0s[j]/median)) > MAX_CENTS: break
        if rmss[j] < rmss[i:j].max()*0.35: break            # 次の音へ移り変わった
        j += 1
    duration = (j-i)*HOP/RATE
    if duration >= MIN_RUN:
        runs.append({'at': i*HOP/RATE, 'duration': duration, 'hz': float(np.median(f0s[i:j])),
                     'midi': 69+12*float(np.log2(np.median(f0s[i:j])/440)),
                     'harmonic': float(np.mean(harms[i:j])), 'high': float(np.mean(highs[i:j])),
                     'rms': float(np.mean(rmss[i:j]))})
    i = max(j, i+1)

if len(runs) < WANT:
    sys.exit(f'安定区間が {len(runs)} 本しかない。閾値を緩める前に、原音が笛の独奏か確かめること')

# 半音ごとに束ね、束のなかで一番長い区間を採る。そのうえで音域に等間隔に並ぶ音を選ぶ。
bins = {}
for r in runs:
    k = round(r['midi'])
    if k not in bins or r['duration'] > bins[k]['duration']: bins[k] = r
best = sorted(bins.values(), key=lambda r: r['midi'])
lo, hi = best[0]['midi'], best[-1]['midi']
picks = []
for i in range(WANT):
    target = lo + (hi-lo)*i/(WANT-1)
    picks.append(min((r for r in best if r not in picks), key=lambda r: abs(r['midi']-target)))
picks.sort(key=lambda r: r['midi'])

entries, meta = [], []
for r in picks:
    period = RATE/r['hz']
    start = int((r['at']+0.05)*RATE)                        # 区間の頭は遷移が残るので内側から
    length = int(min(r['duration']-0.1, CROP)*RATE)
    y = x[start:start+length].copy()
    y -= y.mean()
    original_peak = float(np.abs(y).max())
    y *= 0.85/max(original_peak, 1e-9)
    k = int(RATE*0.035); y[:k]  *= np.linspace(0, 1, k)     # 笛の立ち上がりは速すぎない
    k = int(RATE*0.12);  y[-k:] *= np.linspace(1, 0, k)

    def near_zero(i):
        a = max(1, i-int(period//2)); b = min(len(y)-1, i+int(period//2))
        return a+int(np.argmin(np.abs(y[a:b])))
    a = near_zero(int(RATE*LOOP_FROM))
    cycles = int((len(y)-int(RATE*0.14)-a)//period)          # 末尾のフェードには掛からない
    if cycles < 8:
        sys.exit(f'MIDI {r["midi"]:.1f} のループが {cycles} 周期しか取れない。CROP を延ばすこと')
    b = near_zero(a+int(round(cycles*period)))

    i16 = np.clip(y*32767, -32768, 32767).astype('<i2')
    entries.append({'kind':'shinobue','root':float(r['midi']),'rate':RATE,
                    'loopStart':round(a/RATE,5),'loopEnd':round(b/RATE,5),
                    'pcm':base64.b64encode(i16.tobytes()).decode('ascii')})
    meta.append({'atSeconds':round(r['at'],3),'hz':round(r['hz'],2),'rootMidi':round(r['midi'],3),
                 'steadySeconds':round(r['duration'],2),'harmonicRatio':round(r['harmonic'],3),
                 'highBandRatio':round(r['high'],4),'loopSeconds':[round(a/RATE,5),round(b/RATE,5)],
                 'loopCycles':cycles,'originalPeak':round(original_peak,4)})

(ROOT/'samples/shinobue').mkdir(parents=True, exist_ok=True)
(ROOT/'samples/shinobue/bank.js').write_text(
    'window.BGM_SHINOBUE_BANK=' + json.dumps(entries, separators=(',',':')) + ';\n', encoding='utf-8')
(ROOT/'samples/shinobue/manifest.json').write_text(json.dumps({
    'source':'https://freesound.org/people/t-man95/sounds/553217/',
    'license':'CC0-1.0',
    'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
    'sourceDuration':round(len(x)/RATE,3),
    'instrument':'unidentified oriental flute; the uploader does not name it',
    'sampleRate':RATE,'cropSeconds':CROP,'steadyRuns':len(runs),
    'pitchMethod':'harmonic product spectrum per 0.25 s frame; a run must hold within 25 cents',
    'gates':{'minRunSeconds':MIN_RUN,'maxCents':MAX_CENTS,'minHarmonicRatio':MIN_HARMONIC},
    'notes':meta,
}, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"安定区間 {len(runs)}本 / 音高の束 {len(bins)}個 → {len(entries)}音を収録 "
      f"/ bank.js {(ROOT/'samples/shinobue/bank.js').stat().st_size/1e6:.2f}MB")
for m in meta: print('  ', m['rootMidi'], 'Hz', m['hz'], '倍音率', m['harmonicRatio'],
                     '>6k', m['highBandRatio'], 'ループ', m['loopCycles'], '周期')
