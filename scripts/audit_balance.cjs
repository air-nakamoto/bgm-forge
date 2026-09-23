// Candidate-only balance audit: raw stems, shared-gain A/B WAVs. Product audio unchanged.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.argv[2]||'Claude outputs/balance-20260923');fs.mkdirSync(out,{recursive:true});
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage();await page.evaluate(()=>window.BGM_TEST={});
for(const f of ['samples/vsco2/bank.js','samples/sitar/bank.js','samples/koto/bank.js','samples/choir/bank.js','samples/shinobue/bank.js','bgm-score.js'])await page.addScriptTag({path:path.join(root,f)});
let src=fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8');
const marker='    let sum=0,peak=0;for(let i=0;i<n;i++)';if(!src.includes(marker))throw Error('raw hook missing');
src=src.replace(marker,'    return {L,R,length:n,score};\n'+marker);await page.addScriptTag({content:src});
const rows=[];
for(const mood of ['night','ritual','japanese'])for(const sound of ['musicbox','choir','koto'])for(const seed of [2026,101]){
const result=await page.evaluate(async({mood,sound,seed})=>{
const T=BGM_TEST,m=T.MOODS.find(x=>x.id===mood),d=T.DEFAULTS[mood];
const base=T.compose({mood:m,bpm:d[0],sound:d[1],length:30,ending:'loop',lead:true,phrasing:'sparse'},seed);
const s=BGMScore.adjust(base,{...base,sound,length:30,drums:base.drums!=='none'}),original=BGMScore.events,events=original(s);
async function stem(lead){BGMScore.events=()=>events.filter(n=>(n.part===0)===lead);try{return await T.render(s)}finally{BGMScore.events=original}}
const l=await stem(true),b=await stem(false),n=l.length;
function rms(t){let e=0;for(let i=0;i<n;i++)e+=t.L[i]**2+t.R[i]**2;return Math.sqrt(e/(2*n))}
const lr=rms(l),br=rms(b),ratio=20*Math.log10(lr/br);
// Experimental ceiling: melody energy no greater than backing. Not a perceptual target.
const trim=Math.min(1,br/lr);let e=0;for(let i=0;i<n;i++)e+=(l.L[i]+b.L[i])**2+(l.R[i]+b.R[i])**2;
const gain=.075/Math.sqrt(e/(2*n));
function mix(k){const L=new Float32Array(n),R=new Float32Array(n);let peak=0;for(let i=0;i<n;i++){L[i]=Math.tanh((k*l.L[i]+b.L[i])*gain);R[i]=Math.tanh((k*l.R[i]+b.R[i])*gain);peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]))}if(peak>.95)for(let i=0;i<n;i++){L[i]*=.95/peak;R[i]*=.95/peak}return{L,R,length:n,peak:Math.min(peak,.95)}}
function wav(t){const bytes=new Uint8Array(44+n*4),v=new DataView(bytes.buffer),str=(at,x)=>[...x].forEach((c,i)=>v.setUint8(at+i,c.charCodeAt(0)));str(0,'RIFF');v.setUint32(4,36+n*4,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,2,true);v.setUint32(24,44100,true);v.setUint32(28,176400,true);v.setUint16(32,4,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*4,true);for(let i=0;i<n;i++){v.setInt16(44+i*4,Math.round(t.L[i]*32767),true);v.setInt16(46+i*4,Math.round(t.R[i]*32767),true)}let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text)}
const a=mix(1),c=mix(trim);return{row:{mood,sound,seed,seconds:n/44100,leadRms:lr,backingRms:br,ratioDb:ratio,candidateTrim:trim,candidateRatioDb:20*Math.log10(lr*trim/br),gain,peakA:a.peak,peakB:c.peak},files:seed===2026?[wav(a),wav(c)]:[]};
},{mood,sound,seed});rows.push(result.row);for(let i=0;i<result.files.length;i++)fs.writeFileSync(path.join(out,`${mood}-${sound}-${i?'B':'A'}.wav`),Buffer.from(result.files[i],'base64'));fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(rows,null,2));console.log(JSON.stringify(result.row));
}
fs.writeFileSync(path.join(out,'sources.json'),JSON.stringify(Object.fromEntries(['bgm-score.js','bgm-forge.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex')])),null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
