// Requires Playwright, Chrome and the locally approved listening fixture.
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await require('playwright').chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage();await page.evaluate(()=>window.BGM_TEST={});
 for(const f of ['bgm-score.js','bgm-forge.js'])await page.addScriptTag({path:path.resolve(__dirname,'..',f)});
 const r=await page.evaluate(async()=>{
 const T=BGM_TEST,m=T.MOODS.find(x=>x.id==='wonder');
 const s=BGMScore.compose({mood:m,scale:T.MODES[m.mode],bpm:60,sound:'glass',length:90,ending:'loop',lead:false},2026);
 const t=await T.render(s);return {L:Array.from(t.L),R:Array.from(t.R),peak:t.peak};
 });
 const wav=fs.readFileSync(path.resolve(__dirname,'../Claude outputs/wonder-pad-correct-20260924/minus15/B.wav'));
 assert.equal(wav.length,44+r.L.length*4);let max=0;
 for(let i=0;i<r.L.length;i++){
 assert(Number.isFinite(r.L[i])&&Number.isFinite(r.R[i]));
 max=Math.max(max,Math.abs(Math.round(r.L[i]*32767)-wav.readInt16LE(44+i*4)),Math.abs(Math.round(r.R[i]*32767)-wav.readInt16LE(46+i*4)));
 }
 assert(max<=1,'approved -15 dB mismatch: '+max);assert(r.peak<=.95);
 console.log('PASS wonder approved -15 dB: max PCM difference',max,'peak',r.peak);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
