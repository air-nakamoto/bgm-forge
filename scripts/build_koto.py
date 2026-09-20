#!/usr/bin/env python3
"""Build the CC0 koto bank from Freesound 365242 (requires ffmpeg and numpy).

原音は13分の即興演奏で、単音の録音ではない。そこから「直前が静かで、音程が安定していて、
単音で、倍音のある」撥弦だけを自動で選ぶ。選び方は乱数を使わないので、同じ原音からは同じ音が出る。

2026-09-20 に作り直した。以前は自己相関だけで音程を決めていたため、5音のうち4音の音高表示が
+1.0〜+18.7半音ずれていた（倍音や隣の弦を基音と誤認）。和風の旋律はその表示を信じて早回しするので、
実際には1半音高い音や4半音低い音が鳴っていた。さらに、倍音をほとんど持たない細い高音（第2倍音が
基音の2%、4kHz以上のエネルギーが他の音の2.4倍）が旋律の56%を占め、これが「ぴーん」の正体だった。

いまは次の4つを全部満たす音だけを採る。
  1. 音程の検算 — 自己相関ではなく調和積スペクトル（HPS）で基音を推定し、
     立ち上がり・その少し後・余韻の3つの窓すべてで±20セント以内に一致すること。
     窓を1つしか見ないと、隣の弦が鳴っている音で推定が半音ずれる（302Hzと320Hzが混じる）。
  2. 収録の最大振幅が立ち上がり（先頭0.15秒）にあること。旧版は直前が静かかしか見ておらず、
     収録の途中でより強い別の撥弦が入る音が混じっていた。ピーク正規化はその強いほうに合わせる
     ので、狙った音が小さくなり、実質「別の音の収録」になっていた。
     原音は13分の連続した即興なので、2.5秒まるごと他の弦が鳴らない箇所はほぼ無い
     （2.5秒だと条件を満たす音は2つしか残らなかった）。収録長を1.5秒に縮めて、
     「最初に鳴るのが狙った音である」ことを保証するほうを採った。
  3. 単音 — 基音の倍音列から外れた強いピークが2本以下（和音・隣の弦の混入を防ぐ）。
     倍音列とみなす幅は±3%。±6%だと302Hzに対して320Hzが「倍音」に見えてしまう。
  4. 倍音がある — 第2〜4倍音の合計が基音の10%以上（純音的な「ぴーん」を除外）
  5. 明るすぎない — 4kHz以上のエネルギーが全体の9%以下
"""
import base64, hashlib, json, pathlib, subprocess, sys
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = pathlib.Path(sys.argv[1])
RATE = 32000
CROP = 1.5          # 1音あたりの収録秒数（原音が連続演奏なので、長くすると別の弦が混じる）
WANT = 6            # 収録する音数
MIN_HARMONIC = 0.40 # 倍音列に乗っているエネルギーの割合
MAX_STRAY = 2       # 倍音列から外れた強いピークの本数
MIN_UPPER = 0.10    # （第2+第3+第4倍音）÷ 基音。これを下回る音は純音的で「ぴーん」と鳴る
MAX_HIGH = 0.09     # 4kHz以上のエネルギー比

pcm = subprocess.check_output(['ffmpeg','-v','error','-i',str(SRC),'-ac','1','-ar',str(RATE),'-f','f32le','-'])
x = np.frombuffer(pcm, dtype='<f4').astype(np.float64)
x -= x.mean()

H = int(RATE*0.02)
n = len(x)//H
e = np.sqrt(np.array([np.mean(x[i*H:(i+1)*H]**2) for i in range(n)])+1e-12)
d = np.diff(e, prepend=e[0])
th = np.percentile(d, 99.0)

def spectrum(seg, N=8*RATE):
    w = seg*np.hanning(len(seg))
    return np.abs(np.fft.rfft(w, N)), np.fft.rfftfreq(N, 1/RATE)

def f0_hps(seg, lo=100, hi=1400):
    """調和積スペクトル。倍音を畳み込むので、自己相関と違って1オクターブ下を選ばない。"""
    S, fr = spectrum(seg)
    P = S.copy()
    for k in (2, 3, 4, 5):
        dd = S[::k][:len(P)]
        P[:len(dd)] *= dd
    b = np.where((fr >= lo) & (fr <= hi))[0]
    return float(fr[b[np.argmax(P[b])]])

def quality(seg, f0):
    S, fr = spectrum(seg)
    total = S.sum()
    def level(k):
        m = (fr > f0*k-10) & (fr < f0*k+10)
        return float(S[m].max()) if m.any() else 0.0
    harmonic = sum(S[(fr > f0*k-10) & (fr < f0*k+10)].sum() for k in range(1, 16))/total
    m = (fr > 80) & (fr < 3000)
    ss, ff = S[m], fr[m]
    peaks = []
    for j in np.argsort(ss)[::-1][:400]:
        if ss[j] < ss.max()*0.12: break
        if all(abs(ff[j]-q) > 15 for q in peaks): peaks.append(float(ff[j]))
    stray = sum(1 for f in peaks if min(abs(f-f0*k) for k in range(1, 16)) > f0*0.03)
    upper = (level(2)+level(3)+level(4))/(level(1)+1e-9)
    return harmonic, stray, upper, float(S[fr > 4000].sum()/total), float((S*fr).sum()/total)

need = int(RATE*(CROP+0.6))
cand = []
for i in range(3, n-need//H-2):
    if d[i] <= th or d[i] != d[max(0,i-3):i+4].max(): continue
    t = i*H
    if e[max(0,i-12):i-1].max() > e[i:i+5].max()*0.18: continue    # 前の音の残りが大きい
    head = x[t+int(RATE*0.05):t+int(RATE*0.55)]
    if head.std() < 1e-4: continue
    # 3つの窓で測って全部一致することを求める。1つだけだと隣の弦に引きずられる。
    windows = [f0_hps(head),
               f0_hps(x[t+int(RATE*0.3):t+int(RATE*0.8)]),
               f0_hps(x[t+int(RATE*(CROP-0.55)):t+int(RATE*(CROP-0.05))])]
    if min(windows) <= 0: continue
    if abs(1200*np.log2(max(windows)/min(windows))) > 20: continue
    f0 = float(np.median(windows))
    # 収録の最大振幅は立ち上がりにあること。後ろに強い撥弦があると、ピーク正規化がそちらに
    # 合わさって狙った音が小さくなり、実質「別の音の収録」になる。
    crop = x[t-int(RATE*0.005):t-int(RATE*0.005)+int(RATE*CROP)]
    if int(np.argmax(np.abs(crop)))/RATE > 0.15: continue
    harmonic, stray, upper, high, centroid = quality(head, f0)
    if harmonic < MIN_HARMONIC or stray > MAX_STRAY: continue      # 単音でない
    if upper < MIN_UPPER or high > MAX_HIGH: continue              # 細い／明るすぎる
    cand.append({'start': t, 'hz': f0, 'midi': 69+12*np.log2(f0/440), 'harmonic': harmonic,
                 'stray': stray, 'upper': upper, 'high': high, 'centroid': centroid,
                 'peak': float(e[i:i+5].max())})

if len(cand) < WANT:
    sys.exit(f'条件を満たす音が {len(cand)} 個しかない。閾値を緩める前に、原音が正しいか確かめること')

# 半音ごとに束ね、束のなかで一番きれいな1音を採る。そのうえで、音域に等間隔に並ぶ音を選ぶ。
# （索引を等間隔に取ると、候補が密な音域に偏る）
bins = {}
for c in cand:
    k = round(c['midi'])
    if k not in bins or c['harmonic'] > bins[k]['harmonic']: bins[k] = c
best = sorted(bins.values(), key=lambda c: c['midi'])
lo, hi = best[0]['midi'], best[-1]['midi']
picks = []
for i in range(WANT):
    target = lo + (hi-lo)*i/(WANT-1)
    c = min((c for c in best if c not in picks), key=lambda c: abs(c['midi']-target))
    picks.append(c)
picks.sort(key=lambda c: c['midi'])

entries, meta = [], []
for c in picks:
    a = c['start']-int(RATE*0.005)
    y = x[a:a+int(RATE*CROP)].copy()
    y -= y.mean()
    y *= 0.85/max(np.abs(y).max(), 1e-9)
    k = int(RATE*0.002);  y[:k]  *= np.linspace(0, 1, k)
    k = int(RATE*0.45);   y[-k:] *= np.linspace(1, 0, k)
    i16 = np.clip(y*32767, -32768, 32767).astype('<i2')
    entries.append({'kind':'koto','root':float(c['midi']),'rate':RATE,
                    'loopStart':0,'loopEnd':0,
                    'pcm':base64.b64encode(i16.tobytes()).decode('ascii')})
    meta.append({'atSeconds':round(c['start']/RATE,3),'hz':round(c['hz'],2),
                 'rootMidi':round(c['midi'],3),'harmonicRatio':round(c['harmonic'],3),
                 'strayPeaks':c['stray'],'upperOverFundamental':round(c['upper'],3),
                 'highBandRatio':round(c['high'],4),'centroidHz':round(c['centroid'],1),
                 'originalPeak':round(c['peak'],4)})

(ROOT/'samples/koto').mkdir(parents=True, exist_ok=True)
(ROOT/'samples/koto/bank.js').write_text(
    'window.BGM_KOTO_BANK=' + json.dumps(entries, separators=(',',':')) + ';\n', encoding='utf-8')
(ROOT/'samples/koto/manifest.json').write_text(json.dumps({
    'source':'https://freesound.org/people/RutgerMuller/sounds/365242/',
    'license':'CC0-1.0',
    'sourceSha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
    'sourceDuration':round(len(x)/RATE,3),
    'sampleRate':RATE,'cropSeconds':CROP,'candidates':len(cand),
    'pitchMethod':'harmonic product spectrum, attack and sustain must agree within 30 cents',
    'gates':{'minHarmonicRatio':MIN_HARMONIC,'maxStrayPeaks':MAX_STRAY,
             'minUpperOverFundamental':MIN_UPPER,'maxHighBandRatio':MAX_HIGH},
    'notes':meta,
}, ensure_ascii=False, indent=1), encoding='utf-8')
print(f"条件を満たす候補 {len(cand)}個 → {len(entries)}音を収録 / bank.js {(ROOT/'samples/koto/bank.js').stat().st_size/1e6:.2f}MB")
for m in meta: print('  ', m)
