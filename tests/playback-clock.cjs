// NODE_PATH=<playwright node_modules> node tests/playback-clock.cjs [screenshot directory]
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true,args:['--autoplay-policy=no-user-gesture-required']});try{
for(const file of ['bgm_forge.html','bgm_forge_standalone.html'])for(const reducedMotion of ['no-preference','reduce']){
 const p=await browser.newPage({reducedMotion});await p.addInitScript(()=>window.BGM_TEST={});
 await p.goto(pathToFileURL(path.resolve(__dirname,'..',file)).href);
 assert.equal(await p.locator('#playbackTime').textContent(),'0:00 / --:--');
 await p.evaluate(async()=>{const T=BGM_TEST,m=T.MOODS.find(m=>m.id==='wonder'),score=T.compose({mood:m,bpm:60,sound:'glass',length:120,ending:'loop',lead:false},2026);
 T.state.take={score,length:44100*120,L:new Float32Array(44100*120),R:new Float32Array(44100*120)};await T.play(T.state.take,false,74);});
 await p.waitForFunction(()=>document.getElementById('playbackTime').textContent==='1:14 / 2:00');
 await p.evaluate(()=>BGM_TEST.seekMeter(.25));
 await p.waitForFunction(()=>document.getElementById('playbackTime').textContent==='0:30 / 2:00');
 await p.evaluate(()=>{const s=BGM_TEST.state;s.playStartedAt=s.playCtx.currentTime-121;});
 await p.waitForFunction(()=>document.getElementById('playbackTime').textContent==='0:01 / 2:00');
 // 一時停止：その位置で止まり、再開で続きから鳴る。一時停止中のシークは位置だけ動かす。
 await p.evaluate(async()=>{const s=BGM_TEST.state;s.playStartedAt=s.playCtx.currentTime-50;await BGM_TEST.togglePlayback();});
 assert.equal(await p.evaluate(()=>!!BGM_TEST.state.playSource),false);
 assert.equal(await p.locator('#play').textContent(),'▶ 再開');
 assert.equal(await p.locator('#playbackTime').textContent(),'0:50 / 2:00');
 await p.waitForTimeout(1200);
 assert.equal(await p.locator('#playbackTime').textContent(),'0:50 / 2:00','paused clock must not advance');
 await p.evaluate(()=>BGM_TEST.seekMeter(.5));
 assert.equal(await p.evaluate(()=>!!BGM_TEST.state.playSource),false,'seeking while paused must not start playback');
 assert.equal(await p.locator('#playbackTime').textContent(),'1:00 / 2:00');
 await p.evaluate(()=>BGM_TEST.togglePlayback());
 await p.waitForFunction(()=>!!BGM_TEST.state.playSource);
 assert.equal(await p.locator('#play').textContent(),'⏸ 一時停止');
 const resumed=await p.evaluate(()=>BGM_TEST.meterProgress()*120);
 assert(resumed>=59.9&&resumed<61.5,'resume must continue from the paused position: '+resumed);
 await p.evaluate(()=>BGM_TEST.stopPlayback());assert.equal(await p.locator('#playbackTime').textContent(),'0:00 / 2:00');
 // Verify rounded actual length, not the requested score length.
 await p.evaluate(async()=>{const T=BGM_TEST;T.state.take={...T.state.take,length:Math.round(91.58*44100)};await T.play();});
 await p.waitForFunction(()=>document.getElementById('playbackTime').textContent==='0:00 / 1:32');
 if(process.argv[2]&&file==='bgm_forge.html'&&reducedMotion==='reduce'){
  fs.mkdirSync(process.argv[2],{recursive:true});
  for(const width of [390,820]){await p.setViewportSize({width,height:850});await p.locator('.listen').scrollIntoViewIfNeeded();await p.locator('.listen').screenshot({path:path.join(process.argv[2],`playback-${width}.png`)});}
 }
 await p.evaluate(()=>BGM_TEST.stopPlayback());await p.close();
 console.log('PASS clock:',file,reducedMotion,'seek, loop, pause/resume, stop, actual duration');
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
