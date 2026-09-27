// 手順・依存関係・採用WAVの条件は tests/README.md を参照。
const path=require('path'),assert=require('assert');
const wav=require('./audio-fixtures.cjs')('wonder');
(async()=>{
 const browser=await require('playwright').chromium.launch({headless:true});
 try{
 const page=await browser.newPage();await page.evaluate(()=>window.BGM_TEST={});
 for(const f of ['bgm-score.js','bgm-forge.js'])await page.addScriptTag({path:path.resolve(__dirname,'..',f)});
 const r=await page.evaluate(async()=>{
 const T=BGM_TEST,m=T.MOODS.find(x=>x.id==='wonder');
 const s=BGMScore.compose({mood:m,scale:T.MODES[m.mode],bpm:60,sound:'glass',length:90,ending:'loop',lead:false},2026);
 const t=await T.render(s);return {L:Array.from(t.L),R:Array.from(t.R),peak:t.peak};
 });
 assert.equal(wav.length,44+r.L.length*4,'採用WAVと現行出力の長さが不一致。採用時の尺・構成を確認してください（tests/README.md）');let max=0;
 for(let i=0;i<r.L.length;i++){
 assert(Number.isFinite(r.L[i])&&Number.isFinite(r.R[i]));
 max=Math.max(max,Math.abs(Math.round(r.L[i]*32767)-wav.readInt16LE(44+i*4)),Math.abs(Math.round(r.R[i]*32767)-wav.readInt16LE(46+i*4)));
 }
 assert(max<=1,'approved -15 dB mismatch: '+max);assert(r.peak<=.95);
 console.log('PASS wonder approved -15 dB: max PCM difference',max,'peak',r.peak);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
