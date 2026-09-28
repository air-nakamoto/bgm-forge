// Local listening page for audit_long_form.cjs. No network, PCM edits or autoplay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=path.resolve(process.argv[2]||'');assert(process.argv[2]);
const read=f=>JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
const done=read('completion.json'),meta=read('meta.json'),rows=read('audio.json');
assert.equal(done.exitCode,0);assert.equal(rows.length,27);assert.equal(done.cases,rows.length);
for(const r of rows){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,r.wav))).digest('hex'),r.wavSha256);
 for(const f of [...r.clips.map(c=>c.file),r.seamClip])assert(fs.existsSync(path.join(dir,f)));
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const db=(a,b)=>a>0&&b>0?20*Math.log10(a/b):null;
const summary={cases:rows.length,clips:rows.reduce((n,r)=>n+r.clips.length+1,0),maxPeak:Math.max(...rows.map(r=>r.audio.peak)),maxSeamStep:Math.max(...rows.map(r=>r.audio.seamStep)),maxSeamVsInternalMax:Math.max(...rows.map(r=>r.audio.seamVsInternalMax)),maxLowSeconds:Math.max(...rows.map(r=>r.audio.maxBelowMinus60DbfsSeconds)),representative:rows.filter(r=>r.seed===2026&&r.requestedLength===120).map(r=>({id:r.id,seconds:r.seconds,restStart:r.restStart,restEnd:r.restEnd,restVsPre4sDb:r.restVsPre4sDb,restVsInitialADb:db(r.restRms,r.sections[0].rms),sections:r.sections,boundaries:r.clips.map(c=>({label:c.label,seconds:c.seconds,afterVsBefore4sDb:db(c.rmsAfter,c.rmsBefore)})),headVsTail2sDb:r.audio.headVsTail2sDb,residual:r.residual?{first2sVsPreMixDb:db(r.residual.rawStemFirst2sRms,r.residual.rawMixPre4sRms),middleVsPreMixDb:db(r.residual.rawStemMiddleRms,r.residual.rawMixPre4sRms),last2sVsPreMixDb:db(r.residual.rawStemLast2sRms,r.residual.rawMixPre4sRms)}:null})),listening:'INCOMPLETE'};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));
const sound={organ:'オルガン',tape:'ローファイ・テープ',samples:'室内楽'};
const audio=f=>`<audio controls preload="none" src="${esc(f)}"></audio>`;
const cards=rows.map(r=>`<article data-id="${r.id}" data-seed="${r.seed}" data-length="${r.requestedLength}" hidden>
<h2>${esc(r.name)} <small>指定${r.requestedLength}秒</small></h2>
<p class="conditions">${r.bpm} BPM · ${sound[r.sound]} · 旋律なし · seed ${r.seed} · 実尺${r.seconds.toFixed(2)}秒</p>
<h3>全曲</h3>${audio(r.wav)}
<p class="hint">まず全体の流れを聴き、気になる箇所を下の抜粋で確認してください。</p>
<div class="timeline">${r.sections.map(s=>`<span style="flex-grow:${s.end-s.start}">${esc(s.label)}<small>${s.start.toFixed(1)}–${s.end.toFixed(1)}秒</small></span>`).join('')}</div>
<h3>切り替わりを確認</h3><p class="hint">各抜粋の4秒位置が切り替わりです。元の音量のまま、追加フェードなし。</p>
<div class="clips">${r.clips.map(c=>`<section><h4>${esc(c.label)} <small>${c.seconds.toFixed(2)}秒</small></h4>${audio(c.file)}</section>`).join('')}
<section><h4>ループの継ぎ目 <small>末尾4秒 → 先頭4秒</small></h4>${audio(r.seamClip)}</section></div>
<details><summary>この条件の計測値</summary><p>休止：${r.restStart.toFixed(2)}–${r.restEnd.toFixed(2)}秒。休む対象の新規発音は${r.newMutedNotes}音。全パートの無音を意図した区間ではありません。</p><p>休止中の全体RMSは直前4秒比${r.restVsPre4sDb.toFixed(2)} dB。ピーク${r.audio.peak.toFixed(5)}、クリップしたサンプル${r.audio.clippedSamples}。数値だけで自然さや音の良さは判定できません。</p><p><a href="${r.id}-${r.requestedLength}-${r.seed}-score.json">この曲のスコア</a> · <a href="${esc(r.wav)}" download>全曲WAVを保存</a></p></details>
</article>`).join('');
const html=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>鎮魂・疑惑・荘厳の長尺試聴</title><style>
*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#292c30;font:15px/1.7 system-ui,sans-serif}main{max-width:900px;margin:36px auto;padding:0 22px}h1{font-size:27px;line-height:1.45;margin:0 0 12px}h2{margin:0;font-size:24px}h3{font-size:18px;margin:22px 0 8px}h4{font-size:15px;margin:0 0 9px}small{font-size:12px;font-weight:400;color:#62696e}p{margin:8px 0 16px}.eyebrow{color:#68756d;font-size:12px;letter-spacing:.08em}.intro{max-width:720px}.filters{display:flex;flex-wrap:wrap;gap:12px;margin:22px 0}label{display:flex;flex-direction:column;gap:5px;font-size:12px;flex:1;min-width:130px}select{width:100%;font:inherit;font-size:15px;padding:10px;border:1px solid #b9c3bc;border-radius:7px;background:white;color:#292c30}article{padding:24px;background:#fff;border:1px solid #dce0da;border-radius:12px}article[hidden]{display:none}audio{width:100%;display:block}section{border:1px solid #e0e3df;background:#fafbf9;border-radius:8px;padding:14px}.clips{display:grid;grid-template-columns:1fr 1fr;gap:12px}.conditions,.hint{color:#606765;font-size:13px}.timeline{display:flex;flex-wrap:wrap;gap:5px;margin:20px 0}.timeline span{background:#edf2ee;min-width:80px;padding:8px;border-radius:5px;font-size:12px}.timeline small{display:block;font-size:10px}details{margin-top:24px;font-size:13px}summary{cursor:pointer;color:#42624f}a{color:#315f49}footer{font-size:12px;color:#66716a;margin:24px 0}.note{padding:12px 16px;background:#e9eee8;border-radius:8px;font-size:13px}@media(max-width:550px){main{margin:22px auto;padding:0 14px}h1{font-size:23px}article{padding:16px}.clips{grid-template-columns:1fr}.filters{gap:8px}label{min-width:95px}.timeline span{min-width:76px}}
</style><main><div class="eyebrow">BGM FORGE · 長尺の確認</div><h1>鎮魂・疑惑・荘厳を聴く</h1><p class="intro">休止からの復帰、Bへの切り替え、最後のA、ループの継ぎ目を確認するための音源です。まず各場面の「120秒・seed 2026」を、同じ再生音量で聴いてください。</p><p class="note">試聴の判定は未記入です。気になったら「場面・指定尺・seed・曲の秒位置・感じたこと」をお伝えください。60秒版の休止は曲末にあり、復帰はループ先頭で確認します。</p>
<div class="filters"><label>場面<select id="scene"><option value="requiem">鎮魂</option><option value="doubt">疑惑</option><option value="solemn">荘厳</option></select></label><label>指定尺<select id="length"><option value="120">120秒</option><option value="90">90秒</option><option value="60">60秒</option></select></label><label>曲の種（seed）<select id="seed"><option>2026</option><option>1</option><option>42</option></select></label></div>
${cards}<footer>計測：実音27条件・譜面${done.scoreCases.toLocaleString('ja-JP')}条件。音楽ソース ${esc(meta.commit.slice(0,7))}。44.1kHz・16bit・ステレオ。新規作曲、ループ用。<br><a href="audio.json">全計測データ</a> · <a href="meta.json">生成条件・ソースハッシュ</a> · <a href="score-audit.json">譜面検査</a></footer></main>
<script>const scene=document.querySelector('#scene'),length=document.querySelector('#length'),seed=document.querySelector('#seed');function show(){document.querySelectorAll('audio').forEach(a=>a.pause());document.querySelectorAll('article').forEach(a=>a.hidden=!(a.dataset.id===scene.value&&a.dataset.length===length.value&&a.dataset.seed===seed.value))}document.querySelectorAll('select').forEach(s=>s.addEventListener('change',show));document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);show();</script></html>`;
fs.writeFileSync(path.join(dir,'index.html'),html);console.log(path.join(dir,'index.html'));
