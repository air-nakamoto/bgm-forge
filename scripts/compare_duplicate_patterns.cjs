// Render the formerly duplicated setting before/after and both revised long-form B choices.
// node scripts/compare_duplicate_patterns.cjs <before.js> <new output directory>
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),before=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||'');
assert(process.argv[2]&&process.argv[3]&&!fs.existsSync(out),'Specify before.js and a new output directory');fs.mkdirSync(out,{recursive:true});
const ids=['town','victory','wonder','kagura','sorrow','dark','machine','chase','ritual'],rows=[];
const banks=['vsco2','sitar','koto','choir','shinobue'].map(x=>`samples/${x}/bank.js`);
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const meta={beforeSha256:hash(before),afterSha256:hash(path.join(root,'bgm-score.js')),rendererSha256:hash(path.join(root,'bgm-forge.js')),banks:Object.fromEntries(banks.map(f=>[f,hash(path.join(root,f))])),seed:2026,arrangementVariant:2,innerShift:1,lead:false,humanize:false,listening:'PENDING'};
function write(name,value){fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2))}
(async()=>{const browser=await chromium.launch({headless:true});meta.browser=browser.version();write('meta.json',meta);
try{
 for(const id of ids)for(const [label,length,b] of [['before',30,0],['after',30,0],['B0',120,0],['B1',120,1]]){
  const p=await browser.newPage();
  try{
   await p.evaluate(()=>window.BGM_TEST={});for(const f of banks)await p.addScriptTag({path:path.join(root,f)});
   await p.addScriptTag({path:label==='before'?before:path.join(root,'bgm-score.js')});await p.addScriptTag({path:path.join(root,'bgm-forge.js')});
   const result=await p.evaluate(async({id,label,length,b})=>{
    const T=BGM_TEST,m=T.MOODS.find(x=>x.id===id),d=T.DEFAULTS[id];
    const s=T.compose({mood:m,bpm:d[0],sound:d[1],length,ending:'loop',lead:false},2026);
    Object.assign(s,{arrangementVariant:2,innerShift:1,sceneBVariant:b,humanize:false});
    const t=await T.render(s);let peak=0,sum=0,clipped=0;
    for(const channel of [t.L,t.R])for(const n of channel){if(!Number.isFinite(n))throw Error('Nonfinite audio');peak=Math.max(peak,Math.abs(n));sum+=n*n;if(Math.abs(n)>=1)clipped++}
    const bytes=new Uint8Array(await T.wav(t).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    const plan=BGMScore.longFormPlan(s);
    return {id,name:m.name,label,bpm:d[0],sound:d[1],requestedLength:length,seconds:t.length/44100,peak,rms:Math.sqrt(sum/(2*t.length)),clipped,score:s,bStart:length>=90?plan.close1Start*60/s.bpm:null,bEnd:length>=90?plan.close2Start*60/s.bpm:null,wav:btoa(binary)};
   },{id,label,length,b});
   assert(result.peak>0&&result.peak<1&&result.clipped===0);const wav=Buffer.from(result.wav,'base64');delete result.wav;
   result.file=`${id}-${label}.wav`;fs.writeFileSync(path.join(out,result.file),wav);result.sha256=hash(path.join(out,result.file));
   write(`${id}-${label}-score.json`,result.score);delete result.score;
   rows.push(result);write('audio.json',rows);console.log(`${rows.length}/36 ${id} ${label} peak=${result.peak.toFixed(4)}`);
  }finally{await p.close()}
 }
 assert.equal(rows.length,36);
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={before:'修正前',after:'修正案',B0:'修正案・長尺B候補1',B1:'修正案・長尺B候補2'};
 const cards=ids.map(id=>{const group=rows.filter(r=>r.id===id);return `<section><h2>${esc(group[0].name)}</h2><p>${group[0].bpm} BPM · ${esc(group[0].sound)}</p><div class="grid">${group.map(r=>`<div><h3>${labels[r.label]}</h3><p>指定${r.requestedLength}秒・実尺${r.seconds.toFixed(1)}秒${r.bStart===null?'':` · Bは${r.bStart.toFixed(1)}〜${r.bEnd.toFixed(1)}秒`}</p><audio controls preload="none" src="${r.file}"></audio>${r.bStart===null?'':`<button data-audio="${r.file}" data-start="${Math.max(0,r.bStart-4)}">Bの4秒前から聴く</button>`}</div>`).join('')}</div></section>`}).join('');
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>伴奏の重複修正・比較試聴</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f3ef;color:#282c30;font:14px/1.7 system-ui}main{max-width:880px;margin:28px auto;padding:0 16px}h1{font-size:24px}h2{font-size:19px}h3{font-size:15px}section{background:white;border:1px solid #ddd;border-radius:10px;padding:18px;margin:18px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}audio{width:100%}button{font:inherit;margin-top:8px;padding:6px 10px}p{font-size:13px}@media(max-width:550px){.grid{grid-template-columns:1fr}}</style><main><h1>伴奏の重複修正・比較試聴</h1><p>9場面の「型2・ずらし1」の内声を¼拍遅らせた修正案です。まず30秒の修正前→修正案を同じ再生音量で比較してください。遅れて聞こえる、拍が取りにくい、場面に合わない場合は「場面・音源・秒位置」をお知らせください。</p><p>seed 2026・既定テンポ／音色・旋律なし・ゆらぎなし・ループ。長尺2本は修正後のB候補を確認するための音源です。音源への追加フェード・音量調整はせず、製品の書き出しを使っています。聴感の採否は未確認です。</p>${cards}<p><a href="meta.json">生成条件</a> · <a href="audio.json">計測値</a></p></main><script>document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);document.querySelectorAll('[data-audio]').forEach(b=>b.onclick=()=>{const a=document.querySelector('audio[src="'+b.dataset.audio+'"]');a.currentTime=Number(b.dataset.start);a.play()});</script></html>`);
 assert.equal(hash(path.join(root,'bgm-score.js')),meta.afterSha256,'Score source changed during rendering');
 write('completion.json',{cases:36,exitCode:0,listening:'PENDING'});
}finally{await browser.close()}})().catch(e=>{console.error(e);write('completion.json',{exitCode:1,error:String(e),listening:'PENDING'});process.exitCode=1});
