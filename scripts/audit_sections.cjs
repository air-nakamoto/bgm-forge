// Inspect the exact scores used by a completed representative audio audit.
// Extract unchanged PCM around section boundaries; do not re-render music.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {inspect}=require('./check_audit_result.cjs');
const root=path.resolve(__dirname,'..'),dir=path.resolve(process.argv[2]||'');
assert.equal(inspect(dir).exit,0,'audio audit must pass first');
assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'completion.json'))).exitCode,0);
const B=require('../bgm-score.js'),ctx={window:{BGM_TEST:{}},BGMScore:B};
vm.runInNewContext(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),ctx);
const T=ctx.window.BGM_TEST,rows=JSON.parse(fs.readFileSync(path.join(dir,'audio.json'))),result=[];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function energy(wav,start,end){
 let sum=0,n=0;const frames=(wav.length-44)/4;
 for(let i=Math.max(0,Math.floor(start*44100));i<Math.min(frames,Math.floor(end*44100));i++){
  sum+=(wav.readInt16LE(44+i*4)/32768)**2+(wav.readInt16LE(46+i*4)/32768)**2;n+=2;
 }return n?Math.sqrt(sum/n):null;
}
for(const r of rows){
 const mood=T.MOODS.find(m=>m.id===r.id),d=T.DEFAULTS[r.id];
 const s=B.compose({mood,scale:T.MODES[mood.mode],bpm:d[0],sound:r.sound,length:r.requestedLength,ending:r.ending,lead:r.lead,phrasing:d[3]||'auto'},r.seed);
 const notes=B.events(s),total=s.length*s.bpm/60,beatSeconds=60/s.bpm,inner=notes.filter(n=>n.part===3);
 assert.equal(notes.length,r.notes,'reproduced score differs');
 assert(Math.abs(s.length-r.seconds)<1/44100+1e-8,'rendered duration differs');
 // Expected rest derived from documented duration requirements, not from longFormPlan.
 const restBars=Math.max(1,Math.min(4,Math.floor(16/(4*beatSeconds)+1e-8)));
 const restStart=r.length===60?total-restBars*4:Math.round(45/beatSeconds/4)*4,restEnd=restStart+restBars*4;
 const overlap=inner.filter(n=>n.beat<restEnd-1e-7&&n.beat+n.duration>restStart+1e-7);
 const plan=B.longFormPlan(s);
 assert(plan&&Math.abs(plan.start-restStart)<1e-7&&Math.abs(plan.end-restEnd)<1e-7);
 assert.equal(overlap.length,0,'inner notes overlap required rest');
 const after=inner.filter(n=>n.beat>=restEnd-1e-7).length;
 if(r.length>60)assert(after>0,'inner voice never returns');
 const route=B.accompanimentFor(s),boundaries=[['休止に入る',restStart],['休止後の発音',restEnd]];
 if(r.length>60&&route==='scene')boundaries.push(['復帰後の接続区間',plan.recoverEnd],['別型区間へ',plan.close1Start],['終端接続区間へ',plan.close2Start],['通常型へ戻る',plan.returnAt]);
 const wav=r.wav?fs.readFileSync(path.join(dir,r.wav)):null;
 const clips=[];
 for(const [label,beat] of boundaries){
  if(!Number.isFinite(beat)||beat<=0||beat>=total-1e-7)continue;
  const at=beat*beatSeconds,start=Math.max(0,at-4),end=Math.min(r.seconds,at+4);
  const item={label,seconds:at,excerptStart:start,excerptEnd:end,boundaryInExcerpt:at-start};
  if(wav){
   const first=Math.round(start*44100),last=Math.min((wav.length-44)/4,Math.round(end*44100));
   const out=Buffer.concat([wav.subarray(0,44),wav.subarray(44+first*4,44+last*4)]);
   out.writeUInt32LE(out.length-8,4);out.writeUInt32LE(out.length-44,40);
   item.file=r.wav.replace('.wav',`-section-${clips.length}.wav`);fs.writeFileSync(path.join(dir,item.file),out);
   item.mixRmsBefore=energy(wav,start,at);item.mixRmsAfter=energy(wav,at,end);
  }clips.push(item);
 }
 result.push({id:r.id,name:mood.name,length:r.length,seed:r.seed,bpm:s.bpm,route,restStartSeconds:restStart*beatSeconds,restEndSeconds:restEnd*beatSeconds,restBars,innerOverlaps:overlap.length,innerNotesAfterRest:after,alternateStatus:route==='scene'?'section positions recorded; musical effect needs listening':'not implemented by scene section control',mixRmsDuringRest:wav?energy(wav,restStart*beatSeconds,restEnd*beatSeconds):null,clips});
}
const summary={cases:result.length,restChecksPassed:result.length,postRestChecksPassed:result.filter(r=>r.length>60).length,alternateRouteNotApplied:result.filter(r=>r.length>60&&r.route!=='scene').length,clips:result.flatMap(r=>r.clips).filter(c=>c.file).length,limitations:['RMS is full-mix PCM, not isolated inner voice or perceptual loudness.','Section labels are planned positions; pattern identity and listening quality are not asserted.'],rows:result};
fs.writeFileSync(path.join(dir,'sections.json'),JSON.stringify(summary,null,2));
const html=result.filter(r=>r.seed===2026).map(r=>`<section><h2>${esc(r.name)} ${r.length}秒</h2><p>内声の休止：${r.restStartSeconds.toFixed(2)}〜${r.restEndSeconds.toFixed(2)}秒（${r.restBars}小節）。全曲の無音ではありません。</p>${r.route!=='scene'?'<p>疑惑の自動伴奏は別経路です。休止は確認済みですが、場面専用の別型切替は適用されません。</p>':''}${r.clips.filter(c=>c.file).map(c=>`<div><h3>${esc(c.label)} · 曲の${c.seconds.toFixed(2)}秒</h3><p>抜粋の${c.boundaryInExcerpt.toFixed(2)}秒位置が境界。原音のまま、追加フェード・音量調整なし。</p><audio controls preload="none" src="${esc(c.file)}"></audio></div>`).join('')}</section>`).join('');
fs.writeFileSync(path.join(dir,'sections.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>長尺の区間試聴</title><style>body{max-width:850px;margin:32px auto;padding:0 16px;background:#f7f6f2;color:#222;font:16px/1.7 system-ui}section{background:white;border:1px solid #ddd;padding:20px;margin:20px 0;border-radius:12px}audio{width:100%}h2{font-size:21px}h3{font-size:17px}a{color:#245b86}</style><h1>長尺の区間試聴</h1><p><a href="index.html">全曲・ループの試聴へ戻る</a> · <a href="sections.json">検証データ</a></p><p>${summary.cases}条件の内声休止を確認。90/120秒の${summary.postRestChecksPassed}条件は休止後に内声が再発音することを確認しました。別型の音楽的な効果・自然さは未判定です。</p><p>まず各場面の「休止に入る」「休止後の発音」を聴いてください。変化が急すぎないか、故障のような間にならないかを確認します。</p>${html}</html>`);
console.log(JSON.stringify({...summary,rows:undefined},null,2));
