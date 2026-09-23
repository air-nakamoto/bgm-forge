// Offline audit; requires Playwright + an installed Chrome. Does not modify music.
// NODE_PATH=/path/to/node_modules BGM_CHROME=/path/to/chrome node scripts/audit_audio.cjs OUTPUT_DIR
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||path.join(root,'Claude outputs/audio-audit'));
fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),score=require(path.join(root,'bgm-score.js'));
const context={window:{BGM_TEST:{}},BGMScore:score};vm.runInNewContext(source,context);
const {MOODS,MODES,DEFAULTS,SOUNDS,TEMPOS,LENGTHS}=context.window.BGM_TEST;
const settings=(m,extra={})=>{const d=DEFAULTS[m.id];return{mood:m,scale:MODES[m.mode],bpm:d[0],sound:d[1],length:30,ending:'loop',lead:d[2]===true,phrasing:d[3]||'auto',...extra}};
const scoreReport={cases:0,errors:[],pitchedRange:[127,0],maxNotes:0,maxPolyphony:0};
for(const mood of MOODS)for(const seed of [1,42,101,2026,9999])for(const tempo of TEMPOS)for(const length of LENGTHS)for(const ending of ['loop','cadence'])for(const lead of [false,true]){
 const s=score.compose(settings(mood,{bpm:tempo.bpm,length,ending,lead}),seed),notes=score.events(s),end=s.length*s.bpm/60,key={mood:mood.id,seed,bpm:tempo.bpm,length,ending,lead};scoreReport.cases++;
 const errors=[],last=new Map(),points=[];
 if(!notes.length)errors.push('no notes');
 for(const n of notes){if(!['part','pitch','beat','duration','velocity','pan'].every(k=>Number.isFinite(n[k])))errors.push('nonfinite note');
 if(n.pitch<0||n.pitch>127||n.velocity<=0||n.velocity>127||n.duration<=0||n.beat<0||n.beat+n.duration>end+1e-6)errors.push('note bounds');
 const k=n.part+':'+n.pitch;if((last.get(k)||0)>n.beat+1e-8)errors.push('same-pitch overlap');last.set(k,n.beat+n.duration);
 if(n.part!==4){scoreReport.pitchedRange[0]=Math.min(scoreReport.pitchedRange[0],n.pitch);scoreReport.pitchedRange[1]=Math.max(scoreReport.pitchedRange[1],n.pitch);}
 points.push([n.beat,1],[n.beat+n.duration,-1]);}
 if(notes.some(n=>n.part===0)!==lead)errors.push('melody toggle');
 points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let poly=0;for(const p of points){poly+=p[1];scoreReport.maxPolyphony=Math.max(scoreReport.maxPolyphony,poly)}
 scoreReport.maxNotes=Math.max(scoreReport.maxNotes,notes.length);
 if(errors.length)scoreReport.errors.push({...key,errors:[...new Set(errors)]});
}
fs.writeFileSync(path.join(out,'score.json'),JSON.stringify(scoreReport,null,2));console.log('SCORE',JSON.stringify(scoreReport));
if(process.env.BGM_SCORE_ONLY==='1')process.exit(scoreReport.errors.length?1:0);
const cases=[];
for(const mood of MOODS){for(const seed of [2026,101])for(const lead of [false,true])cases.push({group:'lead-toggle',id:mood.id,seed,lead});cases.push({group:'long',id:mood.id,seed:42,length:120});cases.push({group:'cadence',id:mood.id,seed:2026,ending:'cadence'});}
for(const id of ['wonder','tense'])for(const sound of SOUNDS)cases.push({group:'sound-edit',id,seed:2026,sound:sound.id,lead:true});
const selected=process.env.BGM_AUDIT_FILTER?cases.filter(c=>JSON.stringify(c).includes(process.env.BGM_AUDIT_FILTER)):cases;
const meta={createdAt:new Date().toISOString(),cases:selected.length,seeds:[2026,101,42],sourceHashes:Object.fromEntries(['bgm-score.js','bgm-forge.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),casesDescription:'24 scenes × (2 seeds × melody on/off + 120s defaults + cadence defaults), plus 17 sounds × 2 scenes with melody. Other settings use scene defaults.'};
fs.writeFileSync(path.join(out,'meta.json'),JSON.stringify(meta,null,2));
(async()=>{const {chromium}=require('playwright');const browser=await chromium.launch(process.env.BGM_CHROME?{headless:true,executablePath:process.env.BGM_CHROME}:{headless:true,channel:'chrome'});const rows=[];let page;
try{for(let i=0;i<selected.length;i++){
 if(i%24===0){if(page)await page.close();page=await browser.newPage();await page.evaluate(()=>window.BGM_TEST={});for(const f of ['samples/vsco2/bank.js','samples/sitar/bank.js','samples/koto/bank.js','samples/choir/bank.js','samples/shinobue/bank.js','bgm-score.js','bgm-forge.js'])await page.addScriptTag({path:path.join(root,f)});}
 const c=selected[i];let r;
 try{r=await page.evaluate(async(c)=>{const T=BGM_TEST,mood=T.MOODS.find(m=>m.id===c.id),d=T.DEFAULTS[c.id],s=BGMScore.compose({mood,scale:T.MODES[mood.mode],bpm:d[0],sound:c.sound||d[1],length:c.length||30,ending:c.ending||'loop',lead:c.lead===undefined?d[2]===true:c.lead,phrasing:d[3]||'auto'},c.seed);
 const t=await T.render(s),n=t.length,sr=44100;let sum=0,peak=0,dcL=0,dcR=0,nearLimit=0,nonfinite=0,derivMax=0,derivSum=0,cross=0,l2=0,r2=0;const energy=[],derivatives=[];
 for(let i=0;i<n;i++){const l=t.L[i],r=t.R[i];if(!Number.isFinite(l)||!Number.isFinite(r))nonfinite++;sum+=l*l+r*r;dcL+=l;dcR+=r;cross+=l*r;l2+=l*l;r2+=r*r;peak=Math.max(peak,Math.abs(l),Math.abs(r));nearLimit+=(Math.abs(l)>=.94)+(Math.abs(r)>=.94);if(i){const dl=Math.abs(l-t.L[i-1]),dr=Math.abs(r-t.R[i-1]);derivMax=Math.max(derivMax,dl,dr);derivSum+=dl*dl+dr*dr;if(i%16===0)derivatives.push(Math.max(dl,dr));}}
 const rms=Math.sqrt(sum/(2*n)),win=882;for(let i=0;i+win<=n;i+=win){let e=0;for(let j=i;j<i+win;j++)e+=t.L[j]**2+t.R[j]**2;energy.push(Math.sqrt(e/(2*win)));}
 let silent=0,low=0,maxSilent=0,maxLow=0,silentCount=0;for(const e of energy){silent=e<1e-5?silent+1:0;low=e<rms*.01?low+1:0;maxSilent=Math.max(maxSilent,silent);maxLow=Math.max(maxLow,low);silentCount+=e<1e-5;}
 const sorted=energy.slice().sort((a,b)=>a-b);derivatives.sort((a,b)=>a-b);const p=(xs,q)=>xs[Math.min(xs.length-1,Math.floor(xs.length*q))];
 return{...c,sound:s.sound,lead:s.lead,ending:s.ending,seconds:n/sr,requestedLength:s.requestedLength,notes:BGMScore.events(s).length,nonfinite,peak,rms,dc:Math.max(Math.abs(dcL/n),Math.abs(dcR/n)),nearLimitPct:nearLimit/(2*n)*100,maxSilentSeconds:maxSilent*.02,relativeLowSeconds:maxLow*.02,silentPct:silentCount/energy.length*100,windowP05:p(sorted,.05),windowP95:p(sorted,.95),derivMax,derivRms:Math.sqrt(derivSum/(2*(n-1))),derivP999:p(derivatives,.999),seamStep:t.step,stereoCorrelation:cross/Math.sqrt(l2*r2)};},c)}catch(e){r={...c,error:String(e)}}
 rows.push(r);fs.writeFileSync(path.join(out,'audio.json'),JSON.stringify(rows,null,2));console.log(`${i+1}/${selected.length} ${JSON.stringify(r)}`);
 }}finally{await browser.close()}
 const failures=rows.filter(r=>r.error||r.nonfinite||r.peak>1||!(r.rms>1e-7));console.log('DONE',JSON.stringify({rendered:rows.length,failures}));if(failures.length||scoreReport.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
