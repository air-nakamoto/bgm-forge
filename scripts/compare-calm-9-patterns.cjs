const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'comparison/calm-9-patterns-20260926');
const pairs=[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[0,2],[1,2],[2,2]];
(async()=>{const browser=await require('playwright').chromium.launch({channel:'chrome',headless:true});
try{const p=await browser.newPage();await p.evaluate(()=>window.BGM_TEST={});
for(const f of ['samples/vsco2/bank.js','samples/sitar/bank.js','samples/koto/bank.js','samples/choir/bank.js','samples/shinobue/bank.js','bgm-score.js','bgm-forge.js'])await p.addScriptTag({path:path.join(root,f)});
const rows=[];
for(let i=0;i<9;i++){
const r=await p.evaluate(async([v,shift])=>{const T=BGM_TEST,m=T.MOODS.find(x=>x.id==='calm'),d=T.DEFAULTS.calm,s=BGMScore.compose({mood:m,scale:T.MODES[m.mode],bpm:d[0],sound:d[1],length:30,ending:'loop',lead:false},2026);
Object.assign(s,{arrangementVariant:v,innerShift:shift===2?0:shift,scenePattern:shift===2?2:0});
const events=BGMScore.events(s),t=await T.render(s);let peak=0;
for(const channel of [t.L,t.R])for(const n of channel){if(!Number.isFinite(n))throw Error('nonfinite');peak=Math.max(peak,Math.abs(n))}
const bytes=new Uint8Array(await T.wav(t).arrayBuffer());let x='';for(let j=0;j<bytes.length;j+=8192)x+=String.fromCharCode(...bytes.subarray(j,j+8192));
return {wav:btoa(x),events,peak,seconds:t.length/44100}},pairs[i]);
if(!(r.peak>0&&r.peak<=1))throw Error('peak');fs.writeFileSync(path.join(out,(i+1)+'.wav'),Buffer.from(r.wav,'base64'));delete r.wav;rows.push(r);console.log((i+1)+'/9');
}
if(new Set(rows.map(r=>JSON.stringify(r.events))).size!==9)throw Error('duplicate');
fs.writeFileSync(path.join(out,'verified.json'),JSON.stringify(rows,null,2));
const positions=['0・1.5・2・3.5','0.5・1・2.5・3','0・1・2・2.5・3.5'];
const cards=pairs.map(([v,s],i)=>'<section><h2>'+(i+1)+'：'+(i<6?'既存':'追加')+'／'+['根音を2拍ごと','4分音符で歩く低音','根音と5度を交互'][v]+'</h2><p>内声型'+((v+s)%3+1)+'：'+positions[(v+s)%3]+'拍に発音。</p><audio controls preload="none" src="'+(i+1)+'.wav?v=corrected"></audio></section>').join('');
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>のどか・修正版9種</title><style>body{max-width:780px;margin:24px auto;padding:0 16px;font:15px/1.7 system-ui;background:#f7f6f2}section{background:white;padding:16px;margin:12px 0}h1{font-size:24px}h2{font-size:18px}audio{width:100%}</style><h1>のどか・修正版9種</h1><p>旧ページの説明と音源の不一致を修正しました。1〜6は既存、7〜9は既存の低音と内声の未使用の組み合わせです。</p><p>96 BPM・スチール弦・seed 2026・伴奏のみ。30秒指定、実尺40秒。小節頭を0とする4拍表記です。4小節目は内声の最後の1音を休みます。</p><p>基本3音の場合、内声型1の音順は低→高→中→高、型2は高→中→低→中、型3は低→中→高→中→低。型3は4小節ごとに音順も変わります。</p><p>1・2・7、3・4・8、5・6・9の順で低音を揃えて比較できます。</p>'+cards+'<script>document.addEventListener("play",e=>{document.querySelectorAll("audio").forEach(a=>{if(a!==e.target)a.pause()})},true)</script></html>');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
