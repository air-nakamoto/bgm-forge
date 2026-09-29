// Compare an explicitly saved pre-change score engine with the current engine.
// node scripts/audit_duplicate_patterns.cjs <before.js> <new report.json>
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),beforePath=path.resolve(process.argv[2]||''),out=process.argv[3];
assert(process.argv[2]&&out&&!fs.existsSync(out),'Specify before.js and a new report.json');
const beforeSource=fs.readFileSync(beforePath,'utf8'),beforeContext={module:{exports:{}}};
vm.runInNewContext(beforeSource,beforeContext);const before=beforeContext.module.exports,after=require('../bgm-score.js');
const ctx={window:{BGM_TEST:{}},BGMScore:after};vm.runInNewContext(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),ctx);
const {MOODS,MODES,DEFAULTS}=ctx.window.BGM_TEST,ids=['town','victory','wonder','kagura','sorrow','dark','machine','chase','ritual'];
const shape=ev=>JSON.stringify(ev),range=ev=>[Math.min(...ev.map(n=>n.pitch)),Math.max(...ev.map(n=>n.pitch))];
let cases=0,unchanged=0,changed=0;const rows=[];
for(const id of ids){
 const mood=MOODS.find(m=>m.id===id),d=DEFAULTS[id];let summary;
 for(const seed of [2026,1,42])for(const length of [30,90,120])for(const b of [0,1]){
  const base=after.compose({mood,scale:MODES[mood.mode],bpm:d[0],sound:d[1],length,ending:'loop',lead:false},seed);
  const oldShapes=new Set(),newShapes=new Set(),oldCounts=[],newCounts=[];
  for(let v=0;v<3;v++)for(let shift=0;shift<3;shift++){
   const s={...base,arrangementVariant:v,innerShift:shift,sceneBVariant:b,humanize:false},old=before.events(s),now=after.events(s);
   cases++;oldShapes.add(shape(old));newShapes.add(shape(now));oldCounts.push(old.length);newCounts.push(now.length);
   assert.equal(now.length,old.length,id+' note count');assert.deepEqual(range(now),range(old),id+' range');
   assert.equal(shape(now.filter(n=>n.part!==3)),shape(old.filter(n=>n.part!==3)),id+' other parts');
   const pitches=ev=>ev.filter(n=>n.part===3).map(n=>n.pitch).sort((a,b)=>a-b);
   assert.equal(JSON.stringify(pitches(now)),JSON.stringify(pitches(old)),id+' inner pitches');
   if(v===2&&shift===1){assert.notEqual(shape(now),shape(old));changed++}else{assert.equal(shape(now),shape(old));unchanged++}
  }
  assert.equal(newShapes.size,9,id+' nine distinct scores');assert.deepEqual(oldCounts,newCounts);
  if(seed===2026&&length===30&&b===0){const bars=base.length*base.bpm/240;summary={id,name:mood.name,bpm:d[0],sound:d[1],before:oldShapes.size,after:newShapes.size,minNotesPerBar:Math.min(...newCounts)/bars,maxNotesPerBar:Math.max(...newCounts)/bars,densityRatio:Math.max(...newCounts)/Math.min(...newCounts)};}
 }
 rows.push(summary);
}
// Every non-target scene must stay byte-for-byte identical at the event level.
for(const mood of MOODS.filter(m=>!ids.includes(m.id)))for(const seed of [2026,1,42])for(const length of [30,90,120]){
 const d=DEFAULTS[mood.id],s=after.compose({mood,scale:MODES[mood.mode],bpm:d[0],sound:d[1],length,ending:'loop',lead:false},seed);
 assert.equal(shape(after.events(s)),shape(before.events(s)),mood.id+' unaffected scene');
}
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const report={beforeSha256:sha(beforeSource),afterSha256:sha(fs.readFileSync(path.join(root,'bgm-score.js'))),cases,changed,unchanged,unaffectedSceneCases:135,seeds:[2026,1,42],lengths:[30,90,120],lead:false,humanize:false,rows,listening:'PENDING'};
fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
