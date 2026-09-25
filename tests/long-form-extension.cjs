const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),B=require('../bgm-score.js'),ctx={window:{BGM_TEST:{}},BGMScore:B};
vm.runInNewContext(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),ctx);
const {MOODS,MODES}=ctx.window.BGM_TEST;let cases=0;
for(const mood of MOODS)for(const bpm of [46,60,76,96,116,132])for(const seed of [1,2026])for(const lead of [false,true])for(const accompaniment of ['auto','wave','up','chords'])for(const edited of [false,true]){
 const settings={mood,scale:MODES[mood.mode],bpm,sound:'synth',ending:'loop',lead,accompaniment};
 const source=B.compose({...settings,length:30},seed);
 const make=length=>edited?B.adjust(source,{...source,length,drums:source.drums!=='none'}):B.compose({...settings,length},seed);
 const short=make(90),long=make(120),a=B.longFormPlan(short),b=B.longFormPlan(long);
 for(const key of ['start','end','recoverEnd','close1Start','close2Start'])assert.equal(a[key],b[key],`extension moved ${key}`);
 assert.equal(b.returnAt,Math.round(short.length*bpm/60),'return to A after the complete 90s form');
 if(bpm===60)assert.deepEqual([b.start,b.end,b.recoverEnd,b.close1Start,b.close2Start,b.returnAt],[44,60,68,72,76,92],'preserve existing 60 BPM timeline, then add A at 92s');
 // Accompaniment before the ending transition is retained. Melody has its own
 // final-note sustain rule and is deliberately outside this arrangement check.
 const end=b.returnAt-4;
 // Compare on the written beat grid: the last-bar drum humanization can fall
 // just before this cutoff and differs when that bar is no longer a loop end.
 const prefix=s=>B.events({...s,humanize:false}).filter(n=>n.part!==0&&n.beat<end).map(n=>({...n,duration:Math.min(n.duration,end-n.beat)}));
 assert.deepEqual(prefix(short),prefix(long),`${mood.id}/${bpm}/${seed}/${lead}/${accompaniment}/${edited}: changed prefix`);
 assert.equal(b.recoverEnd-b.end,8);
 if(B.accompanimentFor(long)==='scene'){
  const tail=s=>B.events({...s,humanize:false}).filter(n=>n.part===3&&n.beat>=b.returnAt);
  assert.deepEqual(tail(long),tail({...long,requestedLength:30}),'added tail must use ordinary A inner pattern');
 }
 assert((b.end-b.start)*60/bpm<=16+1e-7);cases++;
}
console.log(`PASS: ${cases} 90-to-120 extensions preserve pre-ending accompaniment (new/edit, melody on/off, four routes)`);
