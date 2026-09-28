// Focused, reproducible listening audit. Product sources and approved WAVs are never edited.
// node scripts/audit_long_form.cjs <new output directory>
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'');
assert(process.argv[2]&&!fs.existsSync(out),'Specify a new output directory');
fs.mkdirSync(out,{recursive:true});
const B=require('../bgm-score.js'),ctx={window:{BGM_TEST:{}},BGMScore:B};
vm.runInNewContext(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),ctx);
const T=ctx.window.BGM_TEST,ids=['requiem','doubt','solemn'],seeds=[2026,1,42],lengths=[120,90,60];
const files=['bgm-score.js','bgm-forge.js','samples/vsco2/bank.js'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2));
const sources=()=>Object.fromEntries(files.map(f=>[f,hash(fs.readFileSync(path.join(root,f)))]));
const meta={commit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),createdAt:new Date().toISOString(),sourceHashes:sources(),auditHash:hash(fs.readFileSync(__filename)),seeds,lengths,sampleRate:44100,lead:false,ending:'loop',composition:'new',listening:'INCOMPLETE'};
write('meta.json',meta);
function compose(id,seed,length,bpm=T.DEFAULTS[id][0],lead=false){
 const mood=T.MOODS.find(m=>m.id===id),d=T.DEFAULTS[id];
 return B.compose({mood,scale:T.MODES[mood.mode],bpm,sound:d[1],length,ending:'loop',lead,phrasing:d[3]||'auto'},seed);
}
const mutedParts=id=>id==='requiem'?[0,1,3]:id==='solemn'?[0,2,3]:[0,3];
function structure(s){
 const ev=B.events(s),p=B.longFormPlan(s),sec=60/s.bpm,total=s.length/sec;
 const start=s.requestedLength<90?total-4*Math.min(4,Math.floor(16/(4*sec)+1e-8)):Math.round(45/(4*sec))*4;
 assert(Math.abs(p.start-start)<1e-7);
 assert((p.end-p.start)*sec<=16+1e-7);
 assert.equal(Math.round(total)%4,0);
 const muted=mutedParts(s.moodId),starts=ev.filter(n=>muted.includes(n.part)&&n.beat>=p.start-1e-7&&n.beat<p.end-1e-7);
 assert.equal(starts.length,0,'New notes in required rest');
 assert.equal(ev.filter(n=>n.part===3&&n.beat<p.start&&n.beat+n.duration>p.start+1e-7).length,0,'Inner voice crosses rest');
 for(const n of ev)assert(['pitch','beat','duration','velocity','pan'].every(k=>Number.isFinite(n[k]))&&n.duration>0&&n.beat>=0&&n.beat+n.duration<=total+1e-6);
 const target=s.moodId==='requiem'?1:s.moodId==='solemn'?2:3;
 if(s.requestedLength>=90)assert(ev.some(n=>n.part===target&&n.beat>=p.end),'Target does not return');
 const ranges=[['A',0,p.start],['休止',p.start,p.end]];
 if(s.requestedLength>=90)ranges.push(['A復帰',p.end,p.recoverEnd],['接続',p.recoverEnd,p.close1Start],['B',p.close1Start,p.close2Start],['終端接続',p.close2Start,Math.min(total,p.returnAt)],['追加A',p.returnAt,total]);
 const sections=ranges.filter(([,a,z])=>Number.isFinite(a)&&z>a&&a<total).map(([label,a,z])=>({label,start:a*sec,end:Math.min(z,total)*sec,onsetsByPart:[0,1,2,3,4].map(part=>ev.filter(n=>n.part===part&&n.beat>=a&&n.beat<Math.min(z,total)).length)}));
 const boundaries=[['休止に入る',p.start],['休止から復帰',p.end]];
 if(s.requestedLength>=90)boundaries.push(['接続開始',p.recoverEnd],['B開始',p.close1Start],['終端接続開始',p.close2Start],['追加Aに戻る',p.returnAt]);
 return {route:B.accompanimentFor(s),notes:ev.length,mutedParts:muted,restStart:p.start*sec,restEnd:p.end*sec,newMutedNotes:starts.length,heldMutedNotes:ev.filter(n=>muted.includes(n.part)&&n.beat<p.start&&n.beat+n.duration>p.start+1e-7).map(n=>({part:n.part,remainingSeconds:(n.beat+n.duration-p.start)*sec})),sections,boundaries:boundaries.filter(([,b])=>Number.isFinite(b)&&b>0&&b<total-1e-7).map(([label,b])=>({label,seconds:b*sec}))};
}
// Broaden score checks across nine accompaniment settings and both melody states.
const scoreAudit={cases:0,tempos:[46,60,96],patterns:9,lead:[false,true],maxHeldSeconds:0};
for(const id of ids)for(const seed of seeds)for(const length of lengths)for(const bpm of scoreAudit.tempos)for(const lead of scoreAudit.lead)for(let k=0;k<9;k++){
 const s=compose(id,seed,length,bpm,lead);
 if(id==='doubt'){s.arrangementVariant=k%3;s.innerShift=Math.floor(k/3)}else s.quietPattern=k;
 const r=structure(s);scoreAudit.cases++;for(const n of r.heldMutedNotes)scoreAudit.maxHeldSeconds=Math.max(scoreAudit.maxHeldSeconds,n.remainingSeconds);
}
write('score-audit.json',scoreAudit);console.log('SCORE',JSON.stringify(scoreAudit));
function pcm(wav){
 assert.equal(wav.toString('ascii',0,4),'RIFF');assert.equal(wav.toString('ascii',8,12),'WAVE');
 assert.equal(wav.toString('ascii',36,40),'data');assert.equal(wav.readUInt16LE(22),2);assert.equal(wav.readUInt32LE(24),44100);assert.equal(wav.readUInt16LE(34),16);
 assert.equal(wav.readUInt32LE(40),wav.length-44);return {wav,n:(wav.length-44)/4};
}
function energy(t,a,z){let sum=0,n=0;for(let i=Math.max(0,Math.round(a*44100));i<Math.min(t.n,Math.round(z*44100));i++){sum+=(t.wav.readInt16LE(44+i*4)/32768)**2+(t.wav.readInt16LE(46+i*4)/32768)**2;n+=2}return n?Math.sqrt(sum/n):null}
const db=(a,b)=>a>0&&b>0?20*Math.log10(a/b):null;
function metrics(t){
 let peak=0,dmax=0,clipped=0;const deriv=[];
 for(let i=0;i<t.n;i++)for(let c=0;c<2;c++){
  const v=t.wav.readInt16LE(44+i*4+c*2);peak=Math.max(peak,Math.abs(v)/32768);clipped+=Math.abs(v)>=32767;
  if(i){const d=Math.abs(v-t.wav.readInt16LE(44+(i-1)*4+c*2))/32768;dmax=Math.max(dmax,d);if(i%16===0)deriv.push(d)}
 }
 deriv.sort((a,b)=>a-b);
 const seam=Math.max(...[0,1].map(c=>Math.abs(t.wav.readInt16LE(44+c*2)-t.wav.readInt16LE(44+(t.n-1)*4+c*2))/32768));
 const duration=t.n/44100;
 let run=0,max=0;for(let a=0;a+.02<=duration;a+=.02){run=energy(t,a,a+.02)<.001?run+.02:0;max=Math.max(max,run)}
 return {peak,clippedSamples:clipped,rms:energy(t,0,duration),maxBelowMinus60DbfsSeconds:max,derivativeMax:dmax,derivativeP999Sampled:deriv[Math.floor(deriv.length*.999)],seamStep:seam,seamVsInternalMax:dmax?seam/dmax:null,headVsTail2sDb:db(energy(t,0,2),energy(t,duration-2,duration))};
}
function clip(t,intervals,name){
 const chunks=intervals.map(([a,z])=>t.wav.subarray(44+Math.max(0,Math.round(a*44100))*4,44+Math.min(t.n,Math.round(z*44100))*4));
 const body=Buffer.concat(chunks),v=Buffer.concat([t.wav.subarray(0,44),body]);v.writeUInt32LE(v.length-8,4);v.writeUInt32LE(body.length,40);pcm(v);
 assert(v.subarray(44).equals(Buffer.concat(chunks)));fs.writeFileSync(path.join(out,name),v);return name;
}
(async()=>{
 const browser=await chromium.launch({headless:true});meta.browser=browser.version();write('meta.json',meta);
 const rows=[];
 try{
  for(const id of ids)for(const seed of seeds)for(const requestedLength of lengths){
   const s=compose(id,seed,requestedLength),r={id,name:s.moodName,seed,requestedLength,bpm:s.bpm,sound:s.sound,seconds:s.length,quietPattern:s.quietPattern,arrangementVariant:s.arrangementVariant,innerShift:s.innerShift,...structure(s)};
   const key=`${id}-${requestedLength}-${seed}`,page=await browser.newPage();
   page.setDefaultTimeout(180000);await page.evaluate(()=>window.BGM_TEST={});
   for(const f of ['samples/vsco2/bank.js','bgm-score.js','bgm-forge.js'])await page.addScriptTag({path:path.join(root,f)});
   const timer=setTimeout(()=>browser.close().catch(()=>{}),180000);
   try{
    const rendered=await page.evaluate(async s=>{
     const t=await BGM_TEST.render(s);let nonfinite=0;for(let i=0;i<t.length;i++)if(!Number.isFinite(t.L[i])||!Number.isFinite(t.R[i]))nonfinite++;
     const bytes=new Uint8Array(await BGM_TEST.wav(t).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
     return {base64:btoa(text),nonfinite};
    },s);
    assert.equal(rendered.nonfinite,0);const wav=Buffer.from(rendered.base64,'base64'),t=pcm(wav);
    assert.equal(t.n,Math.floor(s.length*44100));r.wav=key+'.wav';fs.writeFileSync(path.join(out,r.wav),wav);r.wavSha256=hash(wav);write(key+'-score.json',s);
    r.audio=metrics(t);assert(r.audio.rms>1e-7&&r.audio.clippedSamples===0);
    r.restRms=energy(t,r.restStart,r.restEnd);r.restVsPre4sDb=db(r.restRms,energy(t,r.restStart-4,r.restStart));
    for(const sec of r.sections){sec.rms=energy(t,sec.start,sec.end);sec.onsetsPerSecond=sec.onsetsByPart.reduce((a,b)=>a+b,0)/(sec.end-sec.start)}
    r.clips=r.boundaries.map((b,i)=>({...b,file:clip(t,[[Math.max(0,b.seconds-4),Math.min(s.length,b.seconds+4)]],`${key}-boundary-${i}.wav`),rmsBefore:energy(t,b.seconds-4,b.seconds),rmsAfter:energy(t,b.seconds,b.seconds+4)}));
    r.seamClip=clip(t,[[s.length-4,s.length],[0,4]],key+'-loop.wav');
    if(seed===2026&&requestedLength===120){
     // Export raw rendering only in this page. Identical DSP, no independent stem normalization.
     const src=fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),marker='{compose,render,partTrim';assert(src.includes(marker));
     const rawPage=await browser.newPage();
     await rawPage.evaluate(()=>window.BGM_TEST={});
     for(const f of ['samples/vsco2/bank.js','bgm-score.js'])await rawPage.addScriptTag({path:path.join(root,f)});
     await rawPage.addScriptTag({content:src.replace(marker,'{renderRaw:(s)=>renderAudio(s,null,null,undefined,{raw:true}),compose,render,partTrim')});
     r.residual=await rawPage.evaluate(async({s,muted,a,z})=>{
      const original=BGMScore.events,events=original(s);
      function rms(t,a,z){let e=0,n=0;for(let i=Math.round(a*44100);i<Math.min(t.length,Math.round(z*44100));i++){e+=t.L[i]**2+t.R[i]**2;n+=2}return Math.sqrt(e/n)}
      const full=await BGM_TEST.renderRaw(s);let stem;
      try{BGMScore.events=()=>events.filter(n=>muted.includes(n.part));stem=await BGM_TEST.renderRaw(s)}finally{BGMScore.events=original}
      return {mutedParts:muted,rawMixPre4sRms:rms(full,a-4,a),rawStemPre4sRms:rms(stem,a-4,a),rawStemFirst2sRms:rms(stem,a,a+2),rawStemMiddleRms:rms(stem,a+2,z-2),rawStemLast2sRms:rms(stem,z-2,z)};
     },{s,muted:r.mutedParts,a:r.restStart,z:r.restEnd});
     await rawPage.close();
    }
    rows.push(r);write('audio.json',rows);console.log(`${rows.length}/27 ${key} peak=${r.audio.peak.toFixed(5)} rest=${r.restVsPre4sDb.toFixed(2)}dB seam=${r.audio.seamStep.toFixed(6)}`);
   }finally{clearTimeout(timer);await page.close()}
  }
  assert.deepEqual(sources(),meta.sourceHashes,'Product sources changed during audit');assert.equal(rows.length,27);
  write('completion.json',{exitCode:0,cases:rows.length,scoreCases:scoreAudit.cases,completedAt:new Date().toISOString(),listening:'INCOMPLETE'});
 }finally{await browser.close()}
})().catch(e=>{console.error(e);write('completion.json',{exitCode:1,error:String(e),listening:'INCOMPLETE'});process.exitCode=1});
