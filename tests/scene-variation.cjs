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
// 単体版は分割ソースの生成物であって別系統ではない。埋め込まれた4本が原本と1文字でも違えば、
// python3 scripts/build_standalone.py を忘れたということ。2026-09-16 の乖離はここを見ていなかった。
// 読み込む順と本数は bgm_forge_v2.html が正。ここに書き写すと音源を足すたびに古くなる。
const v2html=fs.readFileSync(path.join(root,'bgm_forge_v2.html'),'utf8');
const EMBEDDED=Array.from(v2html.matchAll(/<script src="([^"?]+)\?v=[^"]*"><\/script>/g),m=>m[1]);
assert(EMBEDDED.length>=5,'bgm_forge_v2.html の <script src> が読めていない');
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
  rel+' の ?v= が中身と合っていない。bgm_forge_v2.html を ?v='
  +tag[1].replace(/-[0-9a-f]{8}$/,'')+'-'+digest+' に直すこと');
}
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
const transport={takePlay:{dataset:{takePlay:'0'}}};
context.document={querySelectorAll:sel=>[transport.takePlay]};
syncTakeTransport();assert.equal(transport.takePlay.disabled,true);
state.take={};state.takes=[state.take];syncTakeTransport();assert.equal(transport.takePlay.disabled,false);
state.playSource={};state.playTake=state.take;syncTakeTransport();assert.equal(transport.takePlay.textContent,'⏸');
state.playTake={};syncTakeTransport();assert.equal(transport.takePlay.textContent,'▶');
state.playTake=state.take;state.busy=true;syncTakeTransport();assert.equal(transport.takePlay.disabled,true);
state.busy=false;state.playSource=null;state.playTake=null;syncTakeTransport();assert.equal(transport.takePlay.textContent,'▶');
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
 let peak=0;for(let i=0;i<n;i++)if(Math.abs(x[i])>Math.abs(x[peak]))peak=i;
 const N=32768,re=new Float64Array(N),im=new Float64Array(N);
 for(let i=0;i<N&&peak+i<n;i++)re[i]=x[peak+i]*(0.5-0.5*Math.cos(2*Math.PI*i/(N-1)));
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
assert.match(fs.readFileSync(path.join(root,'bgm-forge.js'),'utf8'),/function selectMood\(mood\)[^\n]*state\.lead=d\[2\]===true/);
console.log(`PASS: ${tested} scene cases; ${MOODS.length} distinct scene rhythms, 3 arrangements each, melody off, determinism, remix, previews, manual patterns and note bounds.`);
