// 手順・依存関係・採用WAVの条件は tests/README.md を参照。
const assert=require('node:assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const b=require('./audio-fixtures.cjs')('balance');
(async()=>{const browser=await require('playwright').chromium.launch({headless:true});try{
const p=await browser.newPage();await p.evaluate(()=>window.BGM_TEST={});
for(const f of ['bgm-score.js','bgm-forge.js'])await p.addScriptTag({path:path.join(root,f)});
const r=await p.evaluate(async()=>{
const T=BGM_TEST,m=T.MOODS.find(m=>m.id==='night');
const s=T.compose({mood:m,bpm:76,sound:'musicbox',length:30,ending:'loop',lead:true,phrasing:'sparse'},2026);
// 採用WAVは9型拡張（8eddad6）前の内声ずらし0。抽選の回帰ではなく採用音の合成を比較する。
s.innerShift=0;
const t=await T.render(s);return {L:Array.from(t.L),R:Array.from(t.R),peak:t.peak};
});
assert.equal(b.length,44+r.L.length*4,'採用WAVと現行出力の長さが不一致。採用時の尺・構成を確認してください（tests/README.md）');let max=0;
for(let i=0;i<r.L.length;i++){assert(Number.isFinite(r.L[i])&&Number.isFinite(r.R[i]));max=Math.max(max,Math.abs(Math.round(r.L[i]*32767)-b.readInt16LE(44+i*4)),Math.abs(Math.round(r.R[i]*32767)-b.readInt16LE(46+i*4)))}
assert(max<=1,'approved B mismatch: '+max+' PCM units');assert(r.peak<=.95);
console.log('PASS approved B waveform: max PCM difference',max,'peak',r.peak);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
