// NODE_PATH=<Playwright node_modules> node tests/balance-audio.cjs
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await require('playwright').chromium.launch({channel:'chrome',headless:true});try{
const p=await browser.newPage();await p.evaluate(()=>window.BGM_TEST={});
for(const f of ['bgm-score.js','bgm-forge.js'])await p.addScriptTag({path:path.join(root,f)});
const r=await p.evaluate(async()=>{
const T=BGM_TEST,m=T.MOODS.find(m=>m.id==='night');
const s=T.compose({mood:m,bpm:76,sound:'musicbox',length:30,ending:'loop',lead:true,phrasing:'sparse'},2026);
const t=await T.render(s);return {L:Array.from(t.L),R:Array.from(t.R),peak:t.peak};
});
const file=path.join(root,'Claude outputs/balance-20260923/night-musicbox-B.wav');
assert(fs.existsSync(file),'generate the approved B fixture before this comparison');
const b=fs.readFileSync(file);assert.equal(b.length,44+r.L.length*4);let max=0;
for(let i=0;i<r.L.length;i++){assert(Number.isFinite(r.L[i])&&Number.isFinite(r.R[i]));max=Math.max(max,Math.abs(Math.round(r.L[i]*32767)-b.readInt16LE(44+i*4)),Math.abs(Math.round(r.R[i]*32767)-b.readInt16LE(46+i*4)))}
assert(max<=1,'approved B mismatch: '+max+' PCM units');assert(r.peak<=.95);
console.log('PASS approved B waveform: max PCM difference',max,'peak',r.peak);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
