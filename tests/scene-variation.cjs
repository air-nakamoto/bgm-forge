const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
// 単体版を1ファイルで渡しても、同じファビコンが残ること。
const icon=fs.readFileSync(path.join(root,'favicon.svg'));
assert.match(fs.readFileSync(path.join(root,'bgm_forge_v2.html'),'utf8'), /rel="icon"[^>]+href="favicon\.svg\?v=/);
const bundledIcon=fs.readFileSync(path.join(root,'bgm_forge_standalone.html'),'utf8').match(/rel="icon"[^>]+href="data:image\/svg\+xml;base64,([^"]+)"/);
assert(bundledIcon,'standalone favicon must be embedded');
assert.deepEqual(Buffer.from(bundledIcon[1],'base64'),icon);
// 共有画像の参照先と寸法を、配布するPNGの実体に合わせる。
const ogp=fs.readFileSync(path.join(root,'ogp.png'));
assert.equal(ogp.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(ogp.readUInt32BE(16),1200);
assert.equal(ogp.readUInt32BE(20),630);
for(const file of ['bgm_forge_v2.html','bgm_forge_standalone.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert.match(html, /property="og:image" content="https:\/\/air-nakamoto\.github\.io\/bgm-forge\/ogp\.png"/);
 assert.match(html, /name="twitter:card" content="summary_large_image"/);
}
const score=require(path.join(root,'bgm-score.js'));
const context={window:{BGM_TEST:{}},BGMScore:score};
vm.runInNewContext(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),context);
const {MOODS,MODES,DEFAULTS,selfTest,playGuideLabel}=context.window.BGM_TEST;
// 文言は現在のテイクの作成経路で決まる。切替・取り消しでも元の表示へ戻る。
const freshTake={adjusted:false},adjustedTake={adjusted:true};
for(const [take,label] of [[null,'聴いてみる'],[freshTake,'聴いてみる'],[adjustedTake,'作り直した曲を　聴いてみる'],[freshTake,'聴いてみる'],[adjustedTake,'作り直した曲を　聴いてみる']])assert.equal(playGuideLabel(take),label);
const compose=(m,seed,extra={})=>score.compose({mood:m,scale:MODES[m.mode],bpm:DEFAULTS[m.id][0],sound:DEFAULTS[m.id][1],length:30,ending:'loop',lead:false,...extra},seed);
const shape=events=>JSON.stringify(events.filter(n=>n.part!==0&&n.part!==4).map(n=>[n.part,+n.beat.toFixed(5),+n.duration.toFixed(5)]));
function valid(s){
 const events=score.events(s),total=s.length*s.bpm/60;
 assert(events.length>0);
 const ends=new Map();
 for(const n of events){
  for(const key of ['pitch','beat','duration','velocity'])assert(Number.isFinite(n[key]),key);
  assert(n.pitch>=0&&n.pitch<=127);assert(n.velocity>0&&n.velocity<=127);
  assert(n.beat>=0&&n.duration>0&&n.beat+n.duration<=total+1e-6);
  const key=n.part+':'+n.pitch;assert(n.beat+1e-8>=(ends.get(key)||0),'overlapping same-pitch notes');ends.set(key,n.beat+n.duration);
 }
 assert.equal(events.some(n=>n.part===0),s.lead!==false);
 if(s.drums==='none')assert(!events.some(n=>n.part===4));
 return events;
}
selfTest();
let tested=0;
for(const mood of MOODS){
 const arrangements=new Map();
 for(let seed=1;seed<=24;seed++){
  const s=compose(mood,seed),events=valid(s);tested++;
  assert.deepEqual(events,score.events(compose(mood,seed)),'seed must reproduce score');
  arrangements.set(s.arrangementVariant,shape(events));
  // Hidden melody must not determine the accompaniment register or rhythm.
  assert.deepEqual(events,score.events({...s,melody:[],melodyLow:30}));
 }
 assert.equal(arrangements.size,3,mood.id+' needs all three arrangements');
 assert.equal(new Set(arrangements.values()).size,3,mood.id+' needs audible rhythmic variations');
 const s=compose(mood,42);
 if(mood.id==='wonder'){
  for(let seed=1;seed<=12;seed++){
   const loop=compose(mood,seed),end=loop.length*loop.bpm/60;
   const events=score.events(loop);
   assert(events.some(n=>n.part===1&&n.beat>=end-2&&n.beat+n.duration>=end-1e-6),'wonder must carry harmony into the loop boundary');
   const preview=score.sample(loop,{sound:loop.sound,bpm:loop.bpm,lead:false});
   assert(!score.events(preview).some(n=>n.part===1&&n.beat>=6),'preview must not insert a false turnaround');
  }
 }

 for(const lead of [false,true])for(const ending of ['loop','cadence']){
  valid(compose(mood,7,{lead,ending,length:20}));tested++;
 }
 for(const choice of score.ACCOMPANIMENTS){valid({...s,accompaniment:choice.id});tested++;}
 const remix=score.remix(s,'accompaniment',567);
 assert.notEqual(remix.arrangementVariant,s.arrangementVariant);
 assert.equal(JSON.stringify(remix.prog),JSON.stringify(s.prog));assert.equal(JSON.stringify(remix.melody),JSON.stringify(s.melody));
 assert.notEqual(shape(score.events(remix)),shape(score.events(s)),mood.id+' remix must change accompaniment');
 const preview=score.sample(s,{sound:s.sound,bpm:s.bpm,lead:false});valid(preview);
 const disabled=score.adjust(s,{sound:s.sound,bpm:s.bpm,length:30,ending:'loop',lead:false,level:1,drums:false,phrasing:'auto'});valid(disabled);
 // No universal forced V-I: the selected progression determines every loop chord.
 for(let bar=0;bar<s.themeBars;bar++){
  const useB=s.themeBars>=16&&bar>=8;
  assert.equal(score.chordAt(s,bar),(useB?s.progB:s.prog)[Math.floor((useB?bar-8:bar)/s.harmonyEvery)%4]);
 }
}
// Compare in beat units with identical tempo, sound and duration: scenes must
// differ in orchestration/timing, not merely pitch transposition or timbre.
for(const seed of [1,7,42]){
 const signatures=MOODS.map(m=>shape(score.events(compose(m,seed,{bpm:96,sound:'synth',length:40}))));
 assert.equal(new Set(signatures).size,MOODS.length,'scene rhythm collision');
}
assert.match(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),/function selectMood\(mood\)[^\n]*state\.lead=false/);
console.log(`PASS: ${tested} scene cases; ${MOODS.length} distinct scene rhythms, 3 arrangements each, melody off, determinism, remix, previews, manual patterns and note bounds.`);
