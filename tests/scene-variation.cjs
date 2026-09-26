const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const mit=fs.readFileSync(path.join(root,'LICENSE'),'utf8').split('\n---')[0].trim();
const standalone=fs.readFileSync(path.join(root,'bgm_forge_standalone.html'),'utf8');
assert(standalone.includes('<!--\nBGM Forge\n'+mit+'\n-->'),'standalone must retain the complete MIT notice in a comment');
// 単体版を1ファイルで渡しても、同じファビコンが残ること。
const icon=fs.readFileSync(path.join(root,'favicon.svg'));
assert.match(fs.readFileSync(path.join(root,'bgm_forge.html'),'utf8'), /rel="icon"[^>]+href="favicon\.svg\?v=/);
const bundledIcon=fs.readFileSync(path.join(root,'bgm_forge_standalone.html'),'utf8').match(/rel="icon"[^>]+href="data:image\/svg\+xml;base64,([^"]+)"/);
assert(bundledIcon,'standalone favicon must be embedded');
assert.deepEqual(Buffer.from(bundledIcon[1],'base64'),icon);
// 共有画像の参照先と寸法を、配布するPNGの実体に合わせる。
const ogp=fs.readFileSync(path.join(root,'ogp.png'));
assert.equal(ogp.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(ogp.readUInt32BE(16),1200);
assert.equal(ogp.readUInt32BE(20),630);
for(const file of ['bgm_forge.html','bgm_forge_standalone.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert.match(html, /property="og:image" content="https:\/\/bgm-forge\.suihei\.workers\.dev\/ogp\.png"/);
 assert.match(html, /name="twitter:card" content="summary_large_image"/);
}
// 単体版は分割ソースの生成物であって別系統ではない。埋め込まれた4本が原本と1文字でも違えば、
// python3 scripts/build_standalone.py を忘れたということ。2026-09-16 の乖離はここを見ていなかった。
// 読み込む順と本数は bgm_forge.html が正。ここに書き写すと音源を足すたびに古くなる。
const v2html=fs.readFileSync(path.join(root,'bgm_forge.html'),'utf8');
const oldPage=fs.readFileSync(path.join(root,'bgm_forge_v2.html'),'utf8');
assert.match(oldPage,/http-equiv="refresh" content="0;url=bgm_forge\.html"/);
// 整形ツール（エディタの自動フォーマット）を通すと空白が入るので、空白を潰して見る。
// 2026-09-20 に bgm_forge.html 全体が整形され、ここだけが「空白ありの同じコード」で落ちた。
const flat=t=>t.replace(/\s+/g,'');
assert(flat(oldPage).includes("location.replace('bgm_forge.html'+location.search+location.hash)"));
assert(v2html.includes('https://bgm-forge.suihei.workers.dev/'));
assert(flat(v2html).includes("if(location.hostname==='air-nakamoto.github.io')location.replace("));
const EMBEDDED=Array.from(v2html.matchAll(/<script src="([^"?]+)\?v=[^"]*"><\/script>/g),m=>m[1]);
assert(EMBEDDED.length>=5,'bgm_forge.html の <script src> が読めていない');
const embedded=Array.from(standalone.matchAll(/<script[^>]*>\n([\s\S]*?)\n<\/script>/g),m=>m[1]);
assert.equal(embedded.length,EMBEDDED.length,'単体版の <script> は '+EMBEDDED.length+' 本のはず');
EMBEDDED.forEach((rel,i)=>{
 const src=fs.readFileSync(path.join(root,rel),'utf8').replace(/\n*$/,'');
 assert.equal(embedded[i].replace(/\n*$/,''),src,
  rel+' が単体版の中身と違う。python3 scripts/build_standalone.py を実行すること');
});
// ?v= を上げ忘れると、ブラウザが古いJSを使い続けて「直したのに直らない」になる。
// 版の末尾に中身のsha256先頭8桁を付ける決まりにして、忘れたらここで落とす。
for(const rel of EMBEDDED){
 const digest=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,rel))).digest('hex').slice(0,8);
 const tag=v2html.match(new RegExp('<script src="'+rel.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&')+'\\?v=([^"]+)"'));
 assert(tag,rel+' の <script src> に ?v= が付いていない');
 assert(tag[1].endsWith('-'+digest),
  rel+' の ?v= が中身と合っていない。bgm_forge.html を ?v='
  +tag[1].replace(/-[0-9a-f]{8}$/,'')+'-'+digest+' に直すこと');
}
// 「意見を送る」は分割版だけの機能。単体版はオフラインで配るものなので、外へ出る通信を残さない。
// 送信先は <meta> に入れる（ソースには書かない）。空でも壊れないことは配線側で守っている。
assert.match(v2html,/<meta name="feedback-endpoint" content="[^"]*">/,'v2 に送信先の <meta> が無い');
assert(v2html.includes('data-feedback-open'),'v2 に「意見を送る」のボタンが無い');
assert(v2html.includes('id="feedbackText"'),'v2 に意見の入力欄が無い');
assert.match(v2html,/<header>\s*<!-- feedback:start --><button class="helpbtn feedback-top"/,'意見ボタンはヘッダ右上に独立して置く');
assert(!v2html.match(/<div class="lead">[\s\S]*?<\/div>/)[0].includes('data-feedback-open'),'ヘルプの隣に意見ボタンを置かない');

for(const token of ['feedback-endpoint','data-feedback-open','feedbackText','feedback:start']){
 assert(!standalone.includes(token),'単体版に意見送信の痕跡が残っている: '+token);
}

require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'feedback.cjs')],{stdio:'inherit'});
require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,'hosting.cjs')],{stdio:'inherit'});

// 使用素材・ライセンスは、他の詳細と同じ重ねて出す画面（#license）に入れる。折りたたみへ戻さないこと。
// 中身はHTMLに置いたまま開く（単体版では全文ライセンスが数MBになり、複製すると開くたびに重い）。
for(const [name,html] of [['分割版',v2html],['単体版',standalone]]){
 assert(html.includes('id="license"'),name+' に使用素材・ライセンスの画面が無い');
 assert(html.includes('id="licenseOpen"'),name+' に使用素材・ライセンスを開くボタンが無い');
 assert(!html.includes('material-credits'),name+' が折りたたみ（material-credits）に戻っている');
 assert(html.includes('https://github.com/air-nakamoto/bgm-forge'),name+' にGitHubへのリンクが無い');
 const modal=html.slice(html.indexOf('id="license"'));
 assert(modal.slice(0,modal.indexOf('</div>\n</div>')).includes('音源: VSCO 2 Community Edition')
   ||modal.slice(0,modal.indexOf('id="detail"')).includes('VSCO 2'),name+' の画面に音源のクレジットが入っていない');
}

// 単体版は1ファイルで配るので、隣に LICENSE が無い。相対リンクのままだと開けない。
assert(!/<a href="LICENSE"(?:\s|>)/.test(standalone),'単体版のMITリンクがGitHubへ向いていない');
assert(/<a href="LICENSE"(?:\s|>)/.test(v2html),'分割版は同じフォルダのLICENSEを指すこと');

const score=require(path.join(root,'bgm-score.js'));
const context={window:{BGM_TEST:{}},BGMScore:score};
vm.runInNewContext(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),context);
const {MOODS,MODES,DEFAULTS,selfTest,playGuideLabel}=context.window.BGM_TEST;
const sitarContext={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'samples/sitar/bank.js'),'utf8'),sitarContext);
const sitar=sitarContext.window.BGM_SITAR_BANK[0];
const sitarManifest=JSON.parse(fs.readFileSync(path.join(root,'samples/sitar/manifest.json'),'utf8'));
assert.equal(sitarManifest.license,'CC0-1.0');
assert.equal(sitar.kind,'sitar');
assert(Math.abs(sitar.root-52.44)<.05,'sitar root must follow measured pitch, not the source octave label');
const sitarPcm=Buffer.from(sitar.pcm,'base64');
assert.equal(sitarPcm.length,8*32000*2);
let sitarPeak=0;for(let i=0;i<sitarPcm.length;i+=2)sitarPeak=Math.max(sitarPeak,Math.abs(sitarPcm.readInt16LE(i)/32768));
assert(sitarPeak>.84&&sitarPeak<.86);
assert.equal(sitarPcm.readInt16LE(sitarPcm.length-2),0,'sitar tail must fade to zero');
// 文言は現在のテイクの作成経路で決まる。切替・取り消しでも元の表示へ戻る。
const freshTake={adjusted:false},adjustedTake={adjusted:true};
for(const [take,label] of [[null,'聴いてみる'],[freshTake,'聴いてみる'],[adjustedTake,'作り直した曲を　聴いてみる'],[freshTake,'聴いてみる'],[adjustedTake,'作り直した曲を　聴いてみる']])assert.equal(playGuideLabel(take),label);
// 曲数と音声メモリの上限を別々に検査する。
const {retainTakes,syncTakeTransport,state}=context.window.BGM_TEST;
const shortTakes=Array.from({length:13},(_,id)=>({id,length:44100*30}));
assert.deepEqual(Array.from(retainTakes(shortTakes),t=>t.id),Array.from({length:12},(_,i)=>i));
assert.equal(retainTakes(Array.from({length:12},()=>({length:44100*120}))).length,4);
const transport={play:{},takePlay:{dataset:{takePlay:'0'}}};
context.document={getElementById:id=>transport[id],querySelectorAll:sel=>[transport.takePlay]};
syncTakeTransport();assert.equal(transport.takePlay.disabled,true);
state.take={};state.takes=[state.take];syncTakeTransport();assert.equal(transport.takePlay.disabled,false);
assert.equal(transport.play.textContent,'▶ 再生');
state.playSource={};state.playTake=state.take;syncTakeTransport();assert.equal(transport.play.textContent,'⏸ 一時停止');assert.equal(transport.takePlay.textContent,'⏸');
state.playTake={};syncTakeTransport();assert.equal(transport.takePlay.textContent,'▶');
state.playTake=state.take;state.busy=true;syncTakeTransport();assert.equal(transport.takePlay.disabled,true);
state.busy=false;state.playSource=null;state.playTake=null;syncTakeTransport();assert.equal(transport.takePlay.textContent,'▶');
assert.equal(transport.play.textContent,'▶ 再生');
state.take=null;state.takes=[];delete context.document;
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
// 46 BPM・20秒は2小節になる。「ごく少ない」で両方が休符だと melodyLow が999に
// なり、旋律オン時の内声をMIDI 995まで上げていた。短い主題でも旋律の手掛かりを残す。
let shortMelodyCases=0;
for(const mood of MOODS)for(const seed of [101,9999,...Array.from({length:32},(_,i)=>i+1)]){
 for(const ending of ['loop','cadence']){
  const short=compose(mood,seed,{bpm:46,length:20,ending,lead:true,phrasing:'minimal'});
  assert.equal(short.themeBars,2,'regression must exercise a two-bar theme');
  assert(short.melody.length>0,mood.id+' short minimal theme must contain a melody note');
  assert.equal(short.melodyLow,Math.min(...short.melody.map(n=>n.pitch)),'inner register must use an actual melody pitch');
  valid(short);shortMelodyCases++;
 }
}
console.log(`PASS: ${shortMelodyCases} short minimal melody cases; melody present and all notes within MIDI bounds`);
// Long form: duration and actual note intervals, including the edit path.
let longCases=0;
for(const mood of MOODS)for(const bpm of [46,60,76,96,116,132])for(const length of [60,90,120])for(const seed of [1,2026]){
 const fresh=compose(mood,seed,{bpm,length,lead:false});
 const source=compose(mood,seed,{bpm,length:30,lead:false});
 const edited=score.adjust(source,{...source,bpm,length,drums:true});
 for(const s of [fresh,edited])for(const accompaniment of ['auto','wave','up','chords']){
  s.accompaniment=accompaniment;
  assert(s.length>=length-1e-7&&s.length<length+240/bpm+1e-7,'duration within one bar');
 const totalBars=Math.round(s.length*bpm/240);
  const restBars=bpm===46?3:4;
  const restBar=length===60?totalBars-restBars:Math.round(45*bpm/240);
  const start=restBar*4,end=start+restBars*4;
  const plan=score.longFormPlan(s);
  assert.equal(plan.start,start,'rest starts at the intended musical boundary');
  assert.equal(plan.end,end,'rest duration follows tempo');
  assert((end-start)*60/bpm<=16+1e-7,'slow tempo must not create a rest longer than 16 seconds');
  if(length>60){
   assert.equal(plan.recoverEnd,end+8,'return to A for two bars');
   assert.equal(plan.returnAt,length===120?Math.round(score.loopLength(bpm,90)*bpm/60):Infinity,'120s adds A after the 90s form');
   assert(plan.recoverEnd<=plan.close1Start&&plan.close1Start<plan.close2Start,'closing transition precedes B section');
   assert(plan.close2Start<Math.min(plan.returnAt,Math.round(s.length*bpm/60/4)*4),'B section has a closing boundary');
  }
  assert(end<=s.length*bpm/60+1e-7,'tempo-aware rest fits');
  const notes=score.events(s),inner=notes.filter(n=>n.part===3);
  assert(!inner.some(n=>n.beat<end&&n.beat+n.duration>start+1e-7),'no inner note overlaps rest');
  if(inner.some(n=>n.beat<start)&&length>60)assert(inner.some(n=>n.beat>=end),'inner voice returns');
  assert.deepEqual(notes,score.events(s),'deterministic');
  valid(s);longCases++;
 }
}
console.log(`PASS: ${longCases} long-form duration/rest checks, new and edited, all accompaniment paths`);
// 同梱音源の root は「実音」でなければならない。箏は13分の即興から自動抽出しているため、
// 2026-09-20 まで5音中4音の root が +1.0〜+18.7半音ずれていた（自己相関が倍音や隣の弦を
// 基音と誤認していた）。表示を信じて早回しするので、和風は実際に音を外して鳴っていた。
// ここでは波形そのものから調和積スペクトルで基音を測り直し、root と一致することを見る。
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){
  let bit=n>>1;
  for(;j&bit;bit>>=1)j^=bit;
  j^=bit;
  if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]]}
 }
 for(let len=2;len<=n;len<<=1){
  const ang=-2*Math.PI/len,wr=Math.cos(ang),wi=Math.sin(ang);
  for(let i=0;i<n;i+=len){
   let cr=1,ci=0;
   for(let k=0;k<len/2;k++){
    const ur=re[i+k],ui=im[i+k],j2=i+k+len/2;
    const vr=re[j2]*cr-im[j2]*ci,vi=re[j2]*ci+im[j2]*cr;
    re[i+k]=ur+vr;im[i+k]=ui+vi;re[j2]=ur-vr;im[j2]=ui-vi;
    const nr=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=nr;
   }
  }
 }
}
function measuredRoot(entry){
 const raw=Buffer.from(entry.pcm,'base64'),n=raw.length/2,x=new Float64Array(n);
 for(let i=0;i<n;i++)x[i]=raw.readInt16LE(i*2)/32768;
 // ループする音源は伸びているところ（loopStart）を、一度鳴りの音源は最大振幅の位置を測る。
 let from=0;
 if(entry.loopEnd>entry.loopStart)from=Math.round(entry.loopStart*entry.rate);
 else{let peak=0;for(let i=0;i<n;i++)if(Math.abs(x[i])>Math.abs(x[peak]))peak=i;from=peak}
 const N=32768,L=Math.min(N,n-from),re=new Float64Array(N),im=new Float64Array(N);
 for(let i=0;i<L;i++)re[i]=x[from+i]*(0.5-0.5*Math.cos(2*Math.PI*i/(L-1)));
 fft(re,im);
 const half=N/2,S=new Float64Array(half);
 for(let i=0;i<half;i++)S[i]=Math.hypot(re[i],im[i]);
 const hz=i=>i*entry.rate/N;
 let best=-1,bestP=-1;
 for(let i=1;i<half/5;i++){
  if(hz(i)<100||hz(i)>1400)continue;
  const p=S[i]*S[2*i]*S[3*i]*S[4*i]*S[5*i];
  if(p>bestP){bestP=p;best=i}
 }
 return 69+12*Math.log2(hz(best)/440);
}
{
 const kotoCtx={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'samples/koto/bank.js'),'utf8'),kotoCtx);
 const bank=kotoCtx.window.BGM_KOTO_BANK;
 assert(bank.length>=5,'箏の同梱音源が5音未満');
 for(const entry of bank){
  assert.equal(entry.kind,'koto');
  const got=measuredRoot(entry);
  assert(Math.abs(got-entry.root)<0.5,
   '箏の音源 root='+entry.root.toFixed(2)+' は実測 '+got.toFixed(2)
   +'（ずれ '+(got-entry.root).toFixed(2)+'半音）。scripts/build_koto.py で作り直すこと');
 }
 // 倍音を持たない純音的な音は、早回しすると「ぴーん」と鳴る。混ざっていないことを見る。
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'samples/koto/manifest.json'),'utf8'));
 assert.equal(manifest.license,'CC0-1.0');
 assert.equal(manifest.notes.length,bank.length);
 for(const note of manifest.notes){
  assert(note.upperOverFundamental>=0.10,'純音的な箏（上倍音/基音 '+note.upperOverFundamental+'）が混ざっている');
  assert(note.highBandRatio<=0.09,'明るすぎる箏（4kHz以上 '+note.highBandRatio+'）が混ざっている');
  assert(note.harmonicRatio>=0.40,'倍音列に乗らない箏（'+note.harmonicRatio+'）が混ざっている');
 }
}
// 民族は東方旋法（ヒジャーズ）。オリエンタルに聞こえる正体は♭2と3のあいだの増2度なので、
// 音階そのものと、旋律に増2度が現れることを固定する。ミクソリディアに戻ると落ちる。
{
 const m=MOODS.find(x=>x.id==='ethnic'),de=DEFAULTS.ethnic;
 assert.equal(m.mode,'phrygianDominant');
 // MODES は vm のサンドボックス側で作られた配列なので、deepEqual は原型が違って落ちる。
 assert.equal(MODES.phrygianDominant.join(','),'0,1,4,5,7,8,10','ヒジャーズの音程が違う');
 let steps={},notes=0,tonicBass=0,bassTotal=0;
 for(let seed=1;seed<=40;seed++){
  const s=score.compose({mood:m,scale:MODES[m.mode],bpm:de[0],sound:de[1],
   length:30,ending:'loop',lead:true,phrasing:de[3]||'auto'},seed);
  const beat=60/s.bpm,ev=score.events(s);
  const mel=ev.filter(n=>n.part===0).sort((a,b)=>a.beat-b.beat);
  for(let i=1;i<mel.length;i++){
   const d=Math.abs(mel[i].pitch-mel[i-1].pitch);
   if(d>0&&d<=4){steps[d]=(steps[d]||0)+1;notes++}
  }
  for(const n of ev.filter(n=>n.part===2)){
   bassTotal+=n.duration*beat;
   if(((n.pitch-s.root)%12+12)%12===0)tonicBass+=n.duration*beat;
  }
 }
 // ヒジャーズでは度数5が増三和音・度数4が減三和音になり、鳴らすと調が変わって聞こえる。
 // 使ってよいのは 0（主音）・1（♭2）・3 だけ。全曲が主音の和音で始まること。
 for(const prog of m.progs){
  assert.equal(prog[0],0,'民族の進行が主音で始まっていない '+JSON.stringify(prog));
  for(const deg of prog)assert([0,1,3].includes(deg),
   '民族の進行に調が動く度数が入っている '+deg+' '+JSON.stringify(prog));
 }
 // 民族の内声（part3）。シタールはこの内声が全部なので、鳴っていることを固定する。
 // 毎小節だと「コードがたくさん続く」、全部止めると1曲6音で「民族っぽくない」と言われた。
 // 奇数小節だけ＝アルペジオの小節が2つ続かず、必ず1小節空く。
 // 撥弦の飾り（じゃらん）は2026-09-20に入れて同日に外した。再導入しないこと（§6.0）。
 for(const seed of [1,3,7,11,23]){
  const s=score.compose({mood:m,scale:MODES[m.mode],bpm:de[0],sound:de[1],
   length:30,ending:'loop',lead:false,phrasing:de[3]||'auto'},seed);
  const inner=score.events(s).filter(n=>n.part===3);
  assert(inner.length>0,'民族の内声が鳴っていない（シタールが消える） seed='+seed);
  const innerBars=[...new Set(inner.map(n=>Math.floor(n.beat/4)))].sort((a,b)=>a-b);
  for(const bar of innerBars)assert(bar%2===1,
   '民族の内声が偶数小節に入っている bar='+bar+' seed='+seed);
  for(let i=1;i<innerBars.length;i++)assert(innerBars[i]-innerBars[i-1]>=2,
   '民族のアルペジオが2小節続いている bar='+innerBars[i]+' seed='+seed);
 }
 // 増2度（3半音）が隣り合う割合。ミクソリディアでは17.8%、ヒジャーズでは24.8%だった。
 assert(steps[3]/notes>0.21,'民族の旋律に増2度が出ていない '+(100*steps[3]/notes).toFixed(1)+'%');
 // 半音の隣接。ミクソリディア17.4% → ヒジャーズ37.7%。
 assert(steps[1]/notes>0.30,'民族の旋律に半音が足りない '+(100*steps[1]/notes).toFixed(1)+'%');
 // 持続低音。歩く低音だけに戻ると33%まで落ちる。
 assert(tonicBass/bassTotal>0.45,'民族の低音が主音を保っていない '+(100*tonicBass/bassTotal).toFixed(1)+'%');
}
// 神楽鈴。4小節の頭で一振りだけ鳴る。打楽器の枠の中にあるので、打楽器を切ると止まる。
// 神楽の打楽器は場面ごとの経路で作られる。events() 後半の legacy 用の塊に書いても鳴らない
// （2026-09-20 に踏んだ）。ここは「実際に音符として出てくるか」を見ている。
{
 const m=MOODS.find(x=>x.id==='kagura'),dk=DEFAULTS.kagura;
 let withDrums=0,withoutDrums=0;
 for(let seed=1;seed<=40;seed++){
  const s=score.compose({mood:m,scale:MODES[m.mode],bpm:dk[0],sound:dk[1],
   length:30,ending:'loop',lead:dk[2]===true,phrasing:dk[3]||'auto'},seed);
  const suzu=score.events(s).filter(n=>n.part===4&&n.pitch===84);
  assert(suzu.length>0,'神楽に神楽鈴が入っていない seed='+seed);
  withDrums+=suzu.length;
  // 4小節（16拍）ごと、頭から2小節（8拍）ずらした位置。曲の先頭では鳴らさない
  // （鈴で曲が始まるのが気になると言われたため）。humanize のずれを許容する。
  for(const n of suzu){
   assert(n.beat>1,'神楽鈴が曲の先頭で鳴っている beat='+n.beat);
   assert(Math.abs(n.beat-(Math.round((n.beat-8)/16)*16+8))<0.2,
    '神楽鈴が4小節ごとの定位置にない beat='+n.beat);
  }
  const off={...s,drums:'none'};
  withoutDrums+=score.events(off).filter(n=>n.part===4).length;
 }
 assert(withDrums>=40,'神楽鈴の数が少なすぎる '+withDrums);
 assert.equal(withoutDrums,0,'打楽器を切っても part4 が残っている');
 // 鈴は合成音。同梱音源に頼っていないこと（音色を変えても鳴る）。
 assert.match(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),
  /n\.pitch===84\)suzuTone\(/,'神楽鈴の合成が発音経路に繋がっていない');
}
// 笛は減衰しない持続音なので、収録をループさせて伸ばす。ループ点が壊れていると
// 神楽の音が伸びない／ぷつぷつ鳴る。音高の実測と、ループが成立していることを見る。
{
 const fluteCtx={window:{}};
 vm.runInNewContext(fs.readFileSync(path.join(root,'samples/shinobue/bank.js'),'utf8'),fluteCtx);
 const bank=fluteCtx.window.BGM_SHINOBUE_BANK;
 assert(bank.length>=5,'笛の同梱音源が5音未満');
 for(const entry of bank){
  assert.equal(entry.kind,'shinobue');
  const seconds=Buffer.from(entry.pcm,'base64').length/2/entry.rate;
  assert(entry.loopEnd>entry.loopStart,'笛のループ点が立っていない root='+entry.root);
  assert(entry.loopEnd-entry.loopStart>=0.2,'笛のループが短すぎる root='+entry.root);
  assert(entry.loopEnd<=seconds,'笛のループ終点が収録の外 root='+entry.root);
  const got=measuredRoot(entry);
  assert(Math.abs(got-entry.root)<0.5,
   '笛の音源 root='+entry.root.toFixed(2)+' は実測 '+got.toFixed(2)
   +'（ずれ '+(got-entry.root).toFixed(2)+'半音）。scripts/build_shinobue.py で作り直すこと');
 }
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'samples/shinobue/manifest.json'),'utf8'));
 assert.equal(manifest.license,'CC0-1.0');
 assert.equal(manifest.notes.length,bank.length);
 for(const note of manifest.notes)assert(note.harmonicRatio>=0.45,'倍音の薄い笛が混ざっている');
 // 神楽は既定で旋律を鳴らさない。内声(3)も差し替えないと笛が一度も鳴らない。
 const {DEFAULTS:D}=context.window.BGM_TEST;
 assert.equal(D.kagura[1],'shinobue');
 assert.notEqual(D.kagura[2],true,'神楽に旋律が付いたなら、下の内声の検査を見直すこと');
 assert.match(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),
  /shinobue:\{kinds:\['shinobue','strings','piano','shinobue','drums'\],parts:\[0,3\]\}/,
  '笛が内声(3)に割り当たっていない。神楽は旋律を鳴らさないので、これだと無音になる');
}
// 箏を音源よりずっと上へ早回しすると、2.5秒の収録が1秒に縮んで細く硬い「ぴーん」になる。
// 同梱は5音で最高が MIDI 70.4。和風の旋律は五音音階のぶん MIDI 88 まで上がるため、
// 2026-09-20 まで +8〜+18半音の音が2.6%混ざっていた（30秒1曲あたり最大10回）。
// foldToBank が音源の上限+7半音を超える音をオクターブ下げる。ここはその上限を固定する。
{
 const {foldToBank}=context.window.BGM_TEST;
 const kotoRoots=Array.from(
  fs.readFileSync(path.join(root,'samples/koto/bank.js'),'utf8').matchAll(/"root":([0-9.]+)/g),
  m=>parseFloat(m[1]));
 assert(kotoRoots.length>=2,'箏の同梱音源が読めていない');
 const kotoChoices=kotoRoots.map(r=>({meta:{root:r}})),kotoTop=Math.max(...kotoRoots);
 const m=MOODS.find(x=>x.id==='japanese'),d=DEFAULTS.japanese;
 let worst=0,raw=0;
 for(let seed=1;seed<=200;seed++){
  const s=score.compose({mood:m,scale:MODES[m.mode],bpm:d[0],sound:d[1],
   length:30,ending:'loop',lead:d[2]===true,phrasing:d[3]||'auto'},seed);
  for(const n of score.events(s)){
   if(n.part!==0&&n.part!==3)continue;
   raw=Math.max(raw,n.pitch-kotoTop);
   worst=Math.max(worst,foldToBank('koto',kotoChoices,n.pitch)-kotoTop);
  }
 }
 assert(raw>7,'和風が箏の音域を超えなくなったなら、この検査ではなく折り返しの要否から見直すこと');
 assert(worst<=7+1e-9,'箏を音源の上限より'+worst.toFixed(1)+'半音上へ早回ししている（ぴーんの再発）');
 // シタールと合唱は同梱が1音だけ。全部の音が一律に早回しされるのが音色なので折り返さない。
 for(const kind of ['sitar','choir'])assert.equal(foldToBank(kind,[{meta:{root:52.44}}],88),88);
}
// 儀式のコーラスだけを減衰し、和琴などの音量を密度設定で下げない。
for(const mood of MOODS){
 const {partTrim}=context.window.BGM_TEST;
 for(const sound of ['choir','koto','samples','chip']){
  const base={moodId:mood.id,sound};
  for(const phrasing of ['minimal','sparse','auto','dense']){
   const s={...base,phrasing};
   // 合唱は伸び続けるので、どの場面で旋律に使っても音量を下げる。
   assert.equal(partTrim(s,0),sound==='choir'?.25:1);
   for(let part=1;part<=4;part++)assert.equal(partTrim(s,part),partTrim(base,part));
  }
 }
}
// 跳躍は度数ではなく半音で抑える。5音音階では4度が9半音になるため、度数のまま制限すると
// 和風だけ跳躍が跳ね上がる（16.3% → 7.9% に直した回の再発防止）。
for(const id of ['japanese','ethnic','puzzle']){
 const mood=MOODS.find(m=>m.id===id);
 let wide=0,total=0,worst=0;
 for(let seed=1;seed<=40;seed++){
  const s=score.compose({mood,scale:MODES[mood.mode],bpm:DEFAULTS[id][0],sound:DEFAULTS[id][1],
    length:60,ending:'loop',lead:true,phrasing:DEFAULTS[id][3]||'sparse'},seed);
  const mel=score.events(s).filter(n=>n.part===0).sort((a,b)=>a.beat-b.beat);
  for(let i=1;i<mel.length;i++){
   const iv=Math.abs(mel[i].pitch-mel[i-1].pitch);
   total++; if(iv>=7)wide++; if(iv>worst)worst=iv;
  }
 }
 assert(worst<=7,`${id} の旋律に8半音以上の跳躍がある（最大 ${worst}）`);
 assert(wide/total<=0.12,`${id} の跳躍が多すぎる（7半音以上が ${(wide/total*100).toFixed(1)}%）`);
}
// ループして伸び続ける音源だけ、音符の中でも引く。撥弦は勝手に小さくなるので対象外。
{
 const src=fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8');
 assert.match(src,/const SUSTAIN_FADE=\{choir:/,'合唱には音符内の減衰が要る');
 assert(!/SUSTAIN_FADE=\{[^}]*(koto|sitar|piano)/.test(src),'撥弦に音符内の減衰を掛けないこと');
 assert.match(src,/const sustain=SUSTAIN_FADE\[kind\]\|\|1/,'sampleNote が SUSTAIN_FADE を見ていること');
}
// 儀式の最後の声をループ末尾まで引き伸ばさず、伴奏にも休む長さを残す。
for(let seed=1;seed<=24;seed++){
 const mood=MOODS.find(m=>m.id==='ritual');
 const s=score.compose({mood,scale:MODES[mood.mode],bpm:60,sound:'choir',length:30,ending:'loop',lead:true,phrasing:'minimal'},seed);
 const notes=score.events(s);
 assert(notes.some(n=>n.part===0),'ritual must contain melody');
 assert(notes.filter(n=>n.part===0).every(n=>n.duration<=2.2),'ritual voice must breathe at the loop end');
 assert(notes.filter(n=>n.part===1).every(n=>n.duration<=3),'ritual harmony must leave room after each entry');
 assert(notes.filter(n=>n.part===2).every(n=>n.duration<=2.4),'ritual bass must release between entries');
}
// クリアは軽い打楽器と弾む内声を持ち、4小節の終わりに主和音へ着地する。
const resolution=MOODS.find(m=>m.id==='victory');
assert(context.window.BGM_TEST.TEMPOS.some(t=>t.bpm===DEFAULTS.victory[0]));
assert.equal(DEFAULTS.victory[1],'wood','clear should use the wood mallet');
assert.equal(DEFAULTS.decision[2],true,'decision should start with melody');
// 儀式：コーラス＋ごく少ない旋律が既定。
assert.deepEqual(Array.from(DEFAULTS.ritual),[60,'choir',true,'minimal'],'ritual should default to a choir with a very sparse melody');
// コーラスだけが母音の共鳴を持つ。formants を持たない音色は従来どおり素通り。
{
 const src=fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8');
 assert.match(src,/if\(spec\.formants\)/,'synthNote がフォルマントに対応していること');
 assert.match(src,/choir:\{[\s\S]{0,400}?formants:\[\[/,'コーラスがフォルマントを持つこと');
}
assert.equal(DEFAULTS.decision[3],'sparse','decision should start with sparse melody phrasing');
assert.equal(MOODS.find(m=>m.id==='japanese').mode,'japanese','japanese must use a pentatonic scale');
assert.deepEqual(Array.from(MODES.japanese),[0,2,4,7,9]);
assert.equal(DEFAULTS.japanese[3],'minimal','japanese should start with very sparse melody');
let minimalNotes=0,sparseNotes=0;
for(let seed=1;seed<=24;seed++){
 const base={mood:MOODS.find(m=>m.id==='japanese'),scale:MODES.japanese,bpm:76,sound:'koto',length:30,ending:'loop',lead:true};
 minimalNotes+=score.events(score.compose({...base,phrasing:'minimal'},seed)).filter(e=>e.part===0).length;
 sparseNotes+=score.events(score.compose({...base,phrasing:'sparse'},seed)).filter(e=>e.part===0).length;
}
assert(minimalNotes<sparseNotes,`minimal melody must be sparser (${minimalNotes} vs ${sparseNotes})`);
for(let seed=1;seed<=24;seed++){
 const s=compose(resolution,seed),ev=score.events(s),bars=s.length*s.bpm/240;
 assert(ev.some(e=>e.part===4),'clear defaults need light percussion');
 assert(!ev.some(e=>e.part===4&&(e.pitch===36||e.pitch===38)),'clear must avoid marching kick/snare');
 assert(ev.filter(e=>e.part===2).length/bars<=2,'resolution bass must not become a march');
 const inner=ev.filter(e=>e.part===3);
 assert(inner.length/bars>=4&&inner.length/bars<=5,'clear needs an active inner rhythm');
 assert(inner.every(e=>e.duration<=.4),'clear accompaniment must stay short and bouncy');
 for(let bar=3;bar<s.themeBars;bar+=4)assert.equal(score.chordAt(s,bar),0,'resolution phrase must arrive on tonic');
}
// 新規作曲でも、場面の伴奏3型・和音の間隔・内声のずらしを独立に組み合わせる。
// 内声が空の荘厳と鎮魂だけ、代わりに和音を鳴らす位置（padAlt）も2通り持つ。
// 疑惑の autoPattern は型を使わないため、ここは音の種類でなく設定の網羅を検証する。
for(const mood of MOODS){
 const intervals=mood.id==='victory'?[1]:mood.id==='solemn'?[1,2,4]:
  ['ethnic','decision','kagura','wonder','doubt','requiem','dark','ritual','machine','horror'].includes(mood.id)?[2,4]:[1,2];
 const combinations=new Set();
 const padded=['solemn','requiem'].includes(mood.id);
 const d=DEFAULTS[mood.id];
 for(let seed=1;seed<=300;seed++){
  const settings={mood,scale:MODES[mood.mode],bpm:d[0],sound:d[1],length:30,ending:'loop',lead:d[2]===true,phrasing:d[3]||'auto'};
  const s=score.compose(settings,seed);
  assert(intervals.includes(s.harmonyEvery),mood.id+' must retain scene harmony intervals');
  assert([0,1].includes(s.innerShift),mood.id+' must shift the inner voice by 0 or 1');
  assert.equal(padded?[0,1].includes(s.padShift):s.padShift===0,true,mood.id+' must only shift the pad where padAlt exists');
  combinations.add([s.arrangementVariant,s.harmonyEvery,s.innerShift,s.padShift].join(':'));
  for(const key of ['bpm','sound','ending','lead','phrasing'])assert.equal(s[key],settings[key],mood.id+' must retain '+key);
  assert.equal(s.mode,mood.mode);assert.deepEqual(Array.from(s.scale),Array.from(MODES[mood.mode]));
  assert.equal(s.drums,mood.drums);
  assert.equal(s.themeBars,score.themeBarsFor(d[0],30));
  assert.equal(s.length,score.loopLength(d[0],30));
  const remix=score.remix(s,'accompaniment',101);
  assert.equal(remix.harmonyEvery,s.harmonyEvery,'remix must retain harmony timing');
  assert.equal(remix.innerShift,1-s.innerShift,'remix must flip the inner shift');
  assert.equal(remix.padShift,padded?1-s.padShift:0,'remix must flip the pad only where padAlt exists');
 }
 assert.equal(combinations.size,3*intervals.length*2*(padded?2:1),mood.id+' must cover every arrangement/harmony/inner-shift combination');
}
console.log('PASS: 7200 compositions; independent scene arrangement/harmony/inner-shift combinations and unchanged generation settings');
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
   assert(events.some(n=>n.part===1&&n.beat<end-2&&n.beat+n.duration>=end-1e-6),'wonder must sustain its last chord through the loop boundary');
   assert(!events.some(n=>n.part===1&&n.beat>=end-2),'wonder must not stack an extra opening chord in the final half-bar');
   // 同じルールを長尺・旋律ありでも守る。曲末だけ別の和音を重ねない。
   for(const length of [60,120])for(const lead of [false,true]){
    const longer=compose(mood,seed,{length,lead}),stop=longer.length*longer.bpm/60,notes=score.events(longer);
    assert(notes.some(n=>n.part===1&&n.beat<stop-2&&n.beat+n.duration>=stop-1e-6),'long wonder loop must sustain its last chord');
    assert(!notes.some(n=>n.part===1&&n.beat>=stop-2),'long wonder loop must not anticipate an extra chord');
   }
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
// 30秒(短いテーマ)から1分以上へ延ばしたとき、旋律がテーマ全体を覆うこと。
// 以前は旧テーマの旋律が残り、決断60 BPMでは約12秒から64秒まで旋律が鳴らなかった。
{let extended=0;
 for(const m of MOODS)for(const bpm of [46,60,76,96,116,132])for(const seed of [1,2026]){
  const source=compose(m,seed,{bpm,lead:true,phrasing:'auto'});
  for(const length of [60,90,120]){
   const s=score.adjust(source,{accompaniment:'auto',sound:source.sound,bpm,length,ending:'loop',lead:true,level:source.level,drums:true,phrasing:'auto'});
   const last=Math.max(...s.melody.map(n=>n.beat));
   assert(last>=s.themeBars*4-8,`${m.id} ${bpm}BPM ${length}s: melody covers ${last} of ${s.themeBars*4} beats`);
   const head=x=>x.filter(n=>n.beat<8).map(n=>n.pitch+'@'+n.beat).join();
   assert.equal(head(s.melody),head(source.melody),`${m.id} ${bpm}BPM ${length}s: opening of the melody must survive lengthening`);
   extended++;
  }
 }
 console.log(`PASS: ${extended} lengthened takes keep a full-theme melody and the original opening`);
}
assert.match(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),/function selectMood\(mood\)[^\n]*state\.lead=d\[2\]===true/);
console.log(`PASS: ${tested} scene cases; ${MOODS.length} distinct scene rhythms, 3 arrangements each, melody off, determinism, remix, previews, manual patterns and note bounds.`);
