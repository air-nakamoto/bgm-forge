(() => {
  'use strict';
  const SR = 44100;
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const MODES = {
    ionian:[0,2,4,5,7,9,11], dorian:[0,2,3,5,7,9,10],
    aeolian:[0,2,3,5,7,8,10], phrygian:[0,1,3,5,7,8,10],
    locrian:[0,1,3,5,6,8,10], harmonic:[0,2,3,5,7,8,11],
    lydian:[0,2,4,6,7,9,11], mixolydian:[0,2,4,5,7,9,10]
  };
  const MOODS = [
    {id:'bright',style:'full',desc:'朝の街道、報酬の受け取り、無事に切り抜けたあとの一息。日常に戻ってきた場面に。',name:'☀️ 明るい',mode:'ionian',roots:[0,5,7],wave:'triangle',progs:[[0,4,5,3],[0,3,4,0],[0,5,3,4],[0,2,3,4],[3,4,0,5],[5,3,0,4]],drums:'light',energy:.75,density:.8},
    {id:'town',style:'walk',desc:'人の行き交う広場、酒場での情報収集、市場での値切り。賑やかな雑談の下に流しても邪魔になりません。',name:'🍺 街・酒場',mode:'mixolydian',roots:[7,2,5],wave:'triangle',progs:[[0,6,3,0],[0,3,6,0],[0,6,0,3],[3,0,6,0],[0,6,3,4],[6,0,3,0]],drums:'light',energy:.8,density:.85},
    {id:'casino',style:'walk',desc:'ルーレット、カード勝負、華やかな遊技場。跳ねるピアノと軽快な低音で、陽気な駆け引きやコミカルな騒動に。',name:'🎲 カジノ',mode:'ionian',roots:[0,5,7],wave:'triangle',progs:[[0,5,1,4],[0,2,5,4],[3,0,1,4],[0,5,3,4],[0,3,1,4],[5,1,4,0]],drums:'light',energy:.72,density:.65},
    {id:'victory',style:'drive',desc:'依頼の達成、街への凱旋、名乗りを上げる瞬間。セッションの締めやエンディングにも。',name:'🏆 凱旋',mode:'ionian',roots:[0,5,7],wave:'sawtooth',progs:[[0,3,4,0],[0,4,5,3],[0,5,3,4],[3,4,0,0],[0,2,3,4],[4,5,3,0]],drums:'drive',energy:1,density:.85},
    {id:'wonder',style:'drift',desc:'夢や異世界、精霊との邂逅、神秘的な遺跡の探索。澄んだ鐘と浮遊する響きで、日常を離れる場面に。',name:'✨ 幻想',mode:'lydian',roots:[0,5,2],wave:'triangle',progs:[[0,1,4,0],[0,4,1,0],[0,1,0,4],[1,0,4,0],[0,1,5,4],[4,0,1,0]],drums:'none',energy:.5,density:.55},
    {id:'night',style:'drift',desc:'涼しい夜風、星空の下の散歩、月明かりの街道。静かでも暗くならない、すっきりした夜のひとときに。',name:'🌌 夜空',mode:'lydian',roots:[5,0,7],wave:'sine',progs:[[0,4,1,0],[0,2,1,4],[3,0,4,1],[0,1,4,2],[2,4,0,1],[0,4,2,3]],drums:'none',energy:.38,density:.35},
    {id:'calm',style:'hush',desc:'宿での休息、荷物の整理、キャラクター同士の何気ない会話。長く流しっぱなしにしても疲れません。',name:'🛏️ 穏やか',mode:'aeolian',roots:[2,9,4],wave:'sine',progs:[[0,5,2,4],[0,3,5,4],[5,2,0,6],[0,2,5,3],[3,5,0,4],[5,3,0,4]],drums:'none',energy:.5,density:.5},
    {id:'solemn',style:'hymn',desc:'神殿、宣誓、王の間での謁見、葬送。重い決断を下す前の静けさに。',name:'⛪ 荘厳',mode:'ionian',roots:[9,4,2],wave:'sine',progs:[[0,3,0,4],[0,5,3,0],[3,0,4,0],[0,4,3,0],[0,2,3,4],[5,0,3,4]],drums:'none',energy:.45,density:.4},
    {id:'sorrow',style:'hush',desc:'別れ、喪失、回想、看取り。取り返しのつかないことが起きたあとの場面に。',name:'💧 悲哀',mode:'aeolian',roots:[9,4,7],wave:'sine',progs:[[0,5,3,4],[0,2,5,4],[0,3,0,5],[5,3,0,4],[0,4,5,3],[2,5,0,4]],drums:'none',energy:.4,density:.45},
    {id:'memory',style:'walk',desc:'古い記録、子供の頃の記憶、もう戻れない日々。悲哀が取り返しのつかない喪失なら、こちらは温かい懐かしさ。',name:'📻 回想',mode:'mixolydian',roots:[5,10,0],wave:'sine',progs:[[0,5,3,6],[0,6,5,0],[5,0,6,3],[0,3,5,6],[6,5,0,3],[3,6,0,5]],drums:'none',energy:.45,density:.5},
    {id:'lullaby',style:'rock',desc:'眠りの入口、子供部屋、人形の並ぶ棚、夢のはじまり。穏やかより高く小さく、揺りかごのように同じ形を繰り返します。',name:'🎠 まどろみ',mode:'ionian',roots:[7,0,5],wave:'sine',progs:[[0,3,0,5],[0,4,0,3],[5,0,3,0],[0,3,5,0],[4,0,5,3],[0,0,3,4]],drums:'none',energy:.3,density:.4},
    {id:'requiem',style:'hymn',desc:'葬送、慰霊、鎮魂、終幕。悲哀が個人の悲しみなら、こちらは儀式としての弔い。持続音で場を埋めます。',name:'🕊️ 鎮魂',mode:'aeolian',roots:[7,0,5],wave:'sine',progs:[[0,5,2,6],[0,2,5,6],[5,6,0,2],[0,6,5,2],[2,6,0,5],[0,5,6,0]],drums:'none',energy:.35,density:.35},
    {id:'puzzle',style:'walk',desc:'推理、議論、盤面を睨む時間、調査パート。神秘が謎めいた探索なら、こちらは頭を使う時間。同じ形を回しながら考えます。',name:'🧩 思索',mode:'dorian',roots:[7,0,2],wave:'triangle',progs:[[0,3,0,6],[3,6,3,0],[3,0,6,3],[0,3,6,0],[6,0,3,6],[0,6,0,3]],drums:'light',energy:.6,density:.6},
    {id:'dark',style:'stab',desc:'地下道、夜の路地、尾行されている気配。まだ何も起きていないのに安心できない場面に。',name:'🌙 暗い',mode:'phrygian',roots:[0,2,6],wave:'sine',progs:[[0,1,0,4],[0,6,1,0],[1,0,3,6],[0,1,6,0],[0,3,1,0],[6,0,1,0]],drums:'pulse',energy:.55,density:.55},
    {id:'ritual',style:'stab',desc:'召喚、カルトの集会、封印の儀、生贄の祭壇。人ならざるものを呼び出す場面に。',name:'🕯️ 儀式',mode:'harmonic',roots:[9,2,4],wave:'sine',progs:[[0,3,0,4],[0,6,3,0],[3,0,6,0],[0,4,3,0],[0,3,4,6],[6,3,0,4]],drums:'heart',energy:.6,density:.4},
    {id:'machine',style:'drive',desc:'工場、艦内、無人の管制室、電子の迷宮。人の気配がない人工物の中で。',name:'⚙️ 機械',mode:'phrygian',roots:[2,7,0],wave:'sawtooth',progs:[[0,6,0,1],[0,1,6,0],[6,0,1,0],[0,6,1,6],[1,0,6,0],[0,3,6,1]],drums:'pulse',energy:.8,density:.6},
    {id:'chase',style:'drive',desc:'逃走、追いかけっこ、時間制限のある移動。プレイヤーに息を切らせたい場面に。',name:'🏃 追跡',mode:'dorian',roots:[4,9,11],wave:'sawtooth',progs:[[0,6,3,0],[0,3,6,4],[0,4,3,6],[3,6,0,4],[0,6,4,3],[6,0,3,4]],drums:'drive',energy:1,density:.85},
    {id:'tense',style:'drive',desc:'対峙、交渉決裂、戦闘。相手と刃を合わせる直前から、決着がつくまで。',name:'🔥 緊迫',mode:'harmonic',roots:[2,7,9],wave:'sawtooth',progs:[[0,3,4,0],[0,5,4,0],[3,4,0,6],[0,4,3,4],[5,3,4,0],[0,3,0,4]],drums:'drive',energy:1,density:.9},
    {id:'horror',style:'stab',desc:'怪異の接近、正気度判定、開けてはいけない扉の前。逃げ場がないと分かる場面に。',name:'🩸 恐怖',mode:'locrian',roots:[0,2,6],wave:'sine',progs:[[0,1,4,1],[0,4,1,0],[1,0,3,4],[0,3,1,4],[4,1,0,3],[1,4,0,1]],drums:'heart',energy:.5,density:.45}
  ];
  const SOUNDS=[
    {id:'samples',name:'生楽器',note:'ピアノ・弦・打楽器'},
    {id:'softpiano',name:'柔らかいピアノ',note:'弱く弾いた音・控えめな余韻'},
    {id:'synth',name:'やわらかい',note:'丸い電子音'},
    {id:'glass',name:'ガラス・鐘',note:'澄んだ余韻'},
    {id:'pluck',name:'爪弾き',note:'減衰する弦'},
    {id:'wood',name:'木のマレット',note:'丸い木の響き'},
    {id:'musicbox',name:'オルゴール',note:'高く小さい減衰音'},
    {id:'organ',name:'オルガン',note:'まっすぐな持続音'},
    {id:'tape',name:'ローファイ・テープ',note:'高域を落とした揺れる音'},
    {id:'drone',name:'アンビエント',note:'輪郭のない持続音'},
    {id:'chip',name:'チップチューン',note:'8bit風の矩形波'}
  ];
  const PHRASINGS=[{id:'sparse',name:'少なめ',note:'休みが多い'},{id:'auto',name:'ふつう',note:'雰囲気の既定'},{id:'dense',name:'多め',note:'よく歌う'}];
  const TEMPOS=[{bpm:46,name:'とても遅い'},{bpm:60,name:'ゆっくり'},{bpm:76,name:'ふつう'},{bpm:96,name:'速め'},{bpm:116,name:'疾走'},{bpm:132,name:'めまぐるしい'}];
  const LENGTHS=[20,30,45,60,90,120];
  const lengthLabel=s=>!Number.isInteger(s)?s.toFixed(1)+'秒':s<60?s+'秒':s%60?Math.floor(s/60)+'分'+(s%60)+'秒':(s/60)+'分';
  // Each sound preset gives every part its own partials, envelope and filter shape.
  const VOICES={
    synth:{wet:[.32,.42],drums:1,gains:[.24,.058,.09,.07],
      key :{wave:'sine',parts:[[1,0,.62],[2,.7,.2],[3,-.8,.09],[4,1.2,.035]],a:.012,r:.16,decay:.12,filt:[12,5],floor:1200},
      pad :{wave:'triangle',parts:[[1,-6,.34],[1,6,.34],[2,-3,.13],[3,3,.045]],a:.38,r:.7,hold:.8,fixed:[2600,1400]},
      bass:{wave:'sine',parts:[[1,0,.8],[2,0,.15],[3,0,.035]],a:.012,r:.16,hold:.8,fixed:[900,420]}},
    glass:{wet:[.5,.58],drums:.8,gains:[.26,.05,.07,.06],
      key :{wave:'sine',parts:[[1,0,.62],[2.76,5,.2],[5.4,-7,.07],[8.9,9,.022]],a:.004,r:.55,decay:.05,filt:[16,8],floor:2400},
      pad :{wave:'sine',parts:[[1,-4,.4],[2,4,.2],[3,-2,.07]],a:.5,r:.9,hold:.7,fixed:[3200,1800]},
      bass:{wave:'sine',parts:[[1,0,.85],[2,0,.1]],a:.02,r:.32,decay:.1,filt:[8,4],floor:700}},
    pluck:{wet:[.36,.46],drums:1,gains:[.26,.07,.1,.08],
      key :{wave:'sawtooth',parts:[[1,0,.5],[2,3,.24],[3,-4,.12],[4,6,.05]],a:.003,r:.14,decay:.04,filt:[14,3],floor:900},
      pad :{wave:'triangle',parts:[[1,-5,.34],[1,5,.34],[2,0,.1]],a:.006,r:.34,decay:.06,filt:[10,3],floor:800},
      bass:{wave:'triangle',parts:[[1,0,.85],[2,0,.12]],a:.005,r:.22,decay:.06,filt:[8,3],floor:500}},
    // マリンバに近い木の響き。4倍音（2オクターブ上）を強めに混ぜ、減衰を速くする。
    wood:{wet:[.3,.38],drums:1,gains:[.27,.06,.1,.075],
      key :{wave:'sine',parts:[[1,0,.58],[4,0,.22],[10,0,.05],[2,4,.05]],a:.002,r:.2,decay:.03,filt:[14,4],floor:800},
      pad :{wave:'triangle',parts:[[1,-4,.3],[1,4,.3],[2,0,.08]],a:.01,r:.4,decay:.05,filt:[9,3],floor:700},
      bass:{wave:'sine',parts:[[1,0,.88],[2,0,.1]],a:.004,r:.24,decay:.05,filt:[7,3],floor:420}},
    // オルゴール。基音を弱くして4倍音を主役にすると、2オクターブ上で鳴っているように聞こえる。
    musicbox:{wet:[.52,.6],drums:.55,gains:[.3,.05,.075,.055],
      key :{wave:'sine',parts:[[4,0,.5],[8,4,.16],[12,-6,.05],[2,0,.07]],a:.002,r:.5,decay:.02,filt:[20,9],floor:2600},
      pad :{wave:'sine',parts:[[1,-3,.34],[2,3,.16],[3,0,.05]],a:.4,r:.8,hold:.72,fixed:[2400,1400]},
      bass:{wave:'sine',parts:[[1,0,.9],[2,0,.08]],a:.03,r:.4,decay:.08,filt:[6,3],floor:400}},
    // オルガン。整数倍音だけを積み、デチューンを入れない。アンビエントと違って輪郭が出る。
    organ:{wet:[.42,.5],drums:.7,gains:[.2,.06,.085,.055],
      key :{wave:'sine',parts:[[1,0,.5],[2,0,.24],[3,0,.12],[4,0,.06],[6,0,.03]],a:.05,r:.3,hold:.95,fixed:[5200,3200]},
      pad :{wave:'sine',parts:[[1,0,.4],[2,0,.2],[3,0,.1],[1.5,0,.07]],a:.25,r:.5,hold:.94,fixed:[3000,2000]},
      bass:{wave:'sine',parts:[[1,0,.75],[2,0,.2],[3,0,.06]],a:.06,r:.35,hold:.92,fixed:[700,380]}},
    // ローファイ・テープ。高域を落とし、wow（ゆっくりしたピッチの揺れ）を掛ける。
    tape:{wet:[.4,.48],drums:.85,gains:[.26,.07,.1,.07],
      key :{wave:'triangle',parts:[[1,0,.6],[2,6,.16],[3,-7,.05]],a:.02,r:.3,decay:.1,filt:[7,3],floor:520,wow:7,wowHz:5.4},
      pad :{wave:'triangle',parts:[[1,-7,.36],[1,7,.36],[2,-4,.1]],a:.5,r:.9,hold:.8,fixed:[1500,900],wow:5,wowHz:4.1},
      bass:{wave:'sine',parts:[[1,0,.9],[2,0,.08]],a:.03,r:.3,hold:.8,fixed:[520,260],wow:4,wowHz:3.6}},
    drone:{wet:[.7,.76],drums:.4,gains:[.19,.1,.095,.045],
      key :{wave:'triangle',parts:[[1,-11,.46],[1,11,.46],[2,-5,.07]],a:.85,r:1.3,hold:.88,fixed:[1050,520]},
      pad :{wave:'triangle',parts:[[1,-14,.42],[1,14,.42],[2,-6,.08],[3,7,.02]],a:1.3,r:1.6,hold:.92,fixed:[780,400]},
      bass:{wave:'sine',parts:[[1,0,.95],[2,0,.05]],a:.6,r:1,hold:.92,fixed:[480,240]}}
  };
  // The mood's waveform still tilts how bright the preset sounds.
  const BRIGHT={sine:.82,triangle:1,sawtooth:1.28};
  const $ = id => document.getElementById(id);
  const DEFAULTS={bright:[96,'wood'],town:[76,'pluck'],casino:[116,'samples'],victory:[116,'samples'],wonder:[60,'glass'],night:[76,'softpiano'],calm:[60,'synth'],solemn:[60,'samples'],sorrow:[60,'synth'],dark:[60,'drone'],ritual:[60,'drone'],machine:[96,'chip'],chase:[132,'pluck'],tense:[132,'samples'],horror:[46,'drone'],memory:[60,'tape'],lullaby:[46,'musicbox'],requiem:[46,'organ'],puzzle:[76,'wood']};
  function selectMood(mood){state.mood=mood;[state.bpm,state.sound]=DEFAULTS[mood.id];state.length=30;state.ending='loop';state.lead=false;state.phrasing='auto'}
  const state={sound:'synth',mood:MOODS[1],bpm:76,length:30,ending:'loop',phrasing:'auto',lead:false,take:null,comparison:null,takes:[],busy:false,cancel:false,volume:.5,playTake:null,playGain:null,playCtx:null,playSource:null,playRevision:0,playStartedAt:0,meterRaf:0,sampleKind:null,sampleTimer:0,audio:null,tourReady:false,tourRemake:false,tourPlayed:false,tourSaved:false,tourTimer:0,tourPending:false,logOpen:false,remixSeed:0};

  function rng(seed){let a=seed|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function midiFreq(m){return 440*Math.pow(2,(m-69)/12)}
  function rootMidi(pc,oct=4){return 12*(oct+1)+pc}

  function compose(settings,seed){return BGMScore.compose({...settings,scale:MODES[settings.mood.mode]},seed)}
  function differences(a,b){
    if(!a||!b)return 99;
    const harmony=s=>Array.from({length:s.themeBars},(_,bar)=>BGMScore.chordAt(s,bar)).join(',');
    let n=0;n+=a.root!==b.root;n+=harmony(a)!==harmony(b);
    n+=a.sound!==b.sound;n+=a.bpm!==b.bpm;
    n+=BGMScore.arrangementKey(a)!==BGMScore.arrangementKey(b);
    if(a.lead!==false||b.lead!==false){n+=a.motif.join()!=b.motif.join();n+=a.rhythmIndex!==b.rhythmIndex}
    return n;
  }
  function randomSeed(){if(typeof crypto!=='undefined'&&crypto&&crypto.getRandomValues){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]>>>0}return Math.floor(Math.random()*0xffffffff)}
  function nextScore(){
    const previous=state.take&&state.take.score;
    let seed=randomSeed();
    for(let tries=0;;tries++){
      const score=compose(state,seed);
      const freshArrangement=!previous||score.moodId!==previous.moodId||score.arrangementVariant!==previous.arrangementVariant;
      if((!previous||score.seed!==previous.seed)&&freshArrangement&&differences(score,previous)>=2)return score;
      seed=tries<99?randomSeed():(seed+1)>>>0;
    }
  }

  function synthNote(ctx,bus,freq,at,dur,gain,kind,pan,V,bright){
    const spec=V[kind==='pad'?'pad':kind==='bass'?'bass':'key'];
    // The release belongs after the note, not inside it: a held pad that fades within its own
    // duration leaves the last half second of a loop empty, which is heard as a gap at the seam.
    const end=Math.min(at+dur+spec.r,ctx.length/SR-.002);
    if(end-at<.012)return;
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.Q.value=.45;filter.connect(bus);
    const f0=(spec.fixed?spec.fixed[0]:Math.min(13000,freq*spec.filt[0]))*bright;
    const f1=(spec.fixed?spec.fixed[1]:Math.max(spec.floor,freq*spec.filt[1]))*bright;
    filter.frequency.setValueAtTime(Math.max(60,Math.min(20000,f0)),at);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60,Math.min(20000,f1)),end);
    // wow: テープのようなゆっくりしたピッチの揺れ。1音につきLFOを1つ作り、全部分音の detune へ配る。
    let wow=null;
    if(spec.wow){
      const lfo=ctx.createOscillator(),depth=ctx.createGain();
      lfo.type='sine';lfo.frequency.value=spec.wowHz||5;depth.gain.value=spec.wow;
      lfo.connect(depth);lfo.start(at);lfo.stop(end);wow=depth;
    }
    spec.parts.forEach(([ratio,cents,level],i)=>{
      if(freq*ratio>SR*.45)return;
      const o=ctx.createOscillator(),g=ctx.createGain(),pn=ctx.createStereoPanner();
      o.type=spec.wave;o.frequency.value=freq*ratio;o.detune.value=cents;
      pn.pan.value=Math.max(-1,Math.min(1,pan+(kind==='pad'?(i%2?.28:-.28):0)));
      const a=Math.min(spec.a,(end-at)*.35),r=Math.min(spec.r,(end-at)*.4);
      g.gain.setValueAtTime(.00001,at);g.gain.linearRampToValueAtTime(gain*level,at+a);
      if(spec.hold)g.gain.setValueAtTime(gain*level*spec.hold,Math.max(at+a,end-r));
      else g.gain.exponentialRampToValueAtTime(Math.max(.00002,gain*level*spec.decay/ratio),Math.max(at+a,end-r));
      g.gain.exponentialRampToValueAtTime(.00001,end);
      if(wow)wow.connect(o.detune);
      o.connect(g);g.connect(pn);pn.connect(filter);o.start(at);o.stop(end);
    });
  }
  // Bass, drums stay full range; tune and inner voice lose the low-mid build-up that masks speech.
  function spaceBus(ctx,seed,wet){
    const input=ctx.createGain(),dry=ctx.createGain(),send=ctx.createGain(),verb=ctx.createConvolver();
    const r=rng(seed^0x524556),n=Math.floor(SR*2.8),ir=ctx.createBuffer(2,n,SR);
    for(let ch=0;ch<2;ch++){
      const d=ir.getChannelData(ch);let smooth=0;
      for(let i=0;i<n;i++){smooth=.65*smooth+.35*(r()*2-1);d[i]=smooth*Math.exp(-i/(SR*.55))*Math.min(1,i/(SR*.025));}
      for(const [time,level] of [[.029,.5],[.047,.32],[.079,.2]])d[Math.floor((time+ch*.007)*SR)]+=level;
    }
    verb.buffer=ir;dry.gain.value=.8;send.gain.value=wet;
    // A gentle low-mid shelf keeps the mix from crowding the band a speaking voice sits in.
    const shelf=ctx.createBiquadFilter();shelf.type='lowshelf';shelf.frequency.value=260;shelf.gain.value=-2.6;
    shelf.connect(dry);dry.connect(ctx.destination);shelf.connect(verb);verb.connect(send);send.connect(ctx.destination);
    input.connect(shelf);
    const highpass=f=>{const q=ctx.createBiquadFilter();q.type='highpass';q.frequency.value=f;q.Q.value=.7;q.connect(input);return q};
    return {master:input,body:input,mid:input,pad:highpass(150)};
  }
  function noiseSource(ctx,buffer,bus,at,dur,gain,highpass=1000,pan=0){
    if(at>=ctx.length/SR||dur<=0)return;
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),p=ctx.createStereoPanner();
    s.buffer=buffer;s.loop=true;s.loopEnd=buffer.duration;f.type='highpass';f.frequency.value=highpass;p.pan.value=pan;
    const end=Math.min(at+dur,ctx.length/SR-.001);
    g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime(.0001,end);
    s.connect(f);f.connect(g);g.connect(p);p.connect(bus);s.start(at,(at*7.3)%Math.max(.01,buffer.duration-dur-.01));s.stop(end);
  }
  // A kick needs a pitch drop; a fixed sine reads as a soft blip.
  function scheduleKick(ctx,bus,at,dur,gain){
    const end=Math.min(at+dur+.14,ctx.length/SR-.001);if(end-at<.02)return;
    const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';
    o.frequency.setValueAtTime(115,at);o.frequency.exponentialRampToValueAtTime(46,at+.07);
    g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(gain,at+.006);
    g.gain.exponentialRampToValueAtTime(.0001,end);
    o.connect(g);g.connect(bus);o.start(at);o.stop(end);
  }
  // 8-bit voice: square lead and inner voice, triangle bass, hard short envelopes, no filter sweep.
  function chipTone(ctx,bus,freq,at,dur,gain,kind,pan=0){
    const rel=Math.min(.05,dur*.3),end=Math.min(at+dur+rel,ctx.length/SR-.002);if(end-at<.012)return;
    const bass=kind==='bass',pad=kind==='pad';
    const voices=bass?[[1,0,1]]:pad?[[1,-7,.5],[1,7,.5]]:[[1,0,.75],[1,9,.35]];
    voices.forEach(([harmonic,cents,level])=>{
      if(freq*harmonic>SR*.45)return;
      const o=ctx.createOscillator(),g=ctx.createGain(),p=ctx.createStereoPanner();
      o.type=bass?'triangle':'square';o.frequency.value=freq*harmonic;o.detune.value=cents;
      p.pan.value=Math.max(-1,Math.min(1,pan));
      const attack=.004,hold=Math.max(at+attack,end-rel);
      g.gain.setValueAtTime(.00001,at);g.gain.linearRampToValueAtTime(gain*level,at+attack);
      g.gain.setValueAtTime(gain*level*(pad?.95:.62),hold);
      g.gain.exponentialRampToValueAtTime(.00001,end);
      o.connect(g);g.connect(p);p.connect(bus);o.start(at);o.stop(end);
    });
  }
  let sampleCache=null;
  function sampleBuffers(ctx){
    if(sampleCache)return sampleCache;
    if(!window.BGM_SAMPLE_BANK)throw Error('同梱音源が見つかりません。samplesフォルダをHTMLと一緒に置いてください。');
    sampleCache=window.BGM_SAMPLE_BANK.map(meta=>{
      const bytes=atob(meta.pcm),buffer=ctx.createBuffer(1,bytes.length/2,meta.rate),d=buffer.getChannelData(0);
      for(let i=0;i<d.length;i++){let v=bytes.charCodeAt(i*2)|(bytes.charCodeAt(i*2+1)<<8);d[i]=(v>=32768?v-65536:v)/32768}
      delete meta.pcm; // the decoded buffer is the copy that is used from here on
      return {meta,buffer};
    });return sampleCache;
  }
  function sampleNote(ctx,bus,n,beat,bank,soft=false){
    const kind=n.part===4?'drums':n.part===1&&!soft?'strings':'piano';
    let choices=bank.filter(x=>x.meta.kind===kind&&(kind!=='piano'||x.meta.velocity===(soft||n.velocity<65?'pp':'mf')));
    if(!choices.length)choices=bank.filter(x=>x.meta.kind===kind);
    if(!choices.length)choices=bank;
    if(!choices.length)return;
    const sample=choices.reduce((a,b)=>Math.abs(b.meta.root-n.pitch)<Math.abs(a.meta.root-n.pitch)?b:a);
    const at=n.beat*beat,duration=n.duration*beat,release=kind==='strings'?.3:kind==='drums'?.15:soft?.35:.2;
    const end=Math.min(at+duration+release,ctx.length/SR-.001);if(end-at<.01)return;
    const source=ctx.createBufferSource(),g=ctx.createGain(),p=ctx.createStereoPanner(),f=ctx.createBiquadFilter();
    source.buffer=sample.buffer;source.playbackRate.value=kind==='drums'?1:Math.pow(2,(n.pitch-sample.meta.root)/12);
    if(kind==='strings'&&sample.meta.loopEnd>sample.meta.loopStart){source.loop=true;source.loopStart=sample.meta.loopStart;source.loopEnd=sample.meta.loopEnd}
    const gain=[.24,.095,.18,.10,.22][n.part]*Math.pow(n.velocity/80,1.3);
    const attack=kind==='strings'?Math.min(.16,duration*.2):soft?Math.min(.018,duration*.2):.003;
    g.gain.setValueAtTime(.00001,at);g.gain.linearRampToValueAtTime(gain,at+attack);
    g.gain.setValueAtTime(gain,Math.max(at+attack,end-release));g.gain.exponentialRampToValueAtTime(.00001,end);
    p.pan.value=n.pan||0;f.type='lowpass';f.frequency.value=kind==='strings'?4500:kind==='drums'?9000:soft?1800+n.velocity*10:2500+n.velocity*60;f.Q.value=.4;
    source.connect(f);f.connect(g);g.connect(p);p.connect(bus);source.start(at);source.stop(end);
  }
  async function render(score,onProgress,isCancelled){
    const tail=3,total=score.length+tail,ctx=new OfflineAudioContext(2,Math.ceil(total*SR),SR);
    const chip=score.sound==='chip',soft=score.sound==='softpiano',bank0=score.sound==='samples'||soft;
    const V=VOICES[score.sound]||VOICES.synth,bright=BRIGHT[score.instrument]||1;
    const dim=['mystic','dark','horror','wonder','solemn','ritual'].includes(score.moodId);
    const wet=chip?.14:soft?.24:bank0?(dim?.42:.32):V.wet[dim?1:0];
    const buses=spaceBus(ctx,score.seed,wet);
    buses.master.gain.value=.72;
    const beat=60/score.bpm,events=BGMScore.events(score),bank=bank0?sampleBuffers(ctx):null;
    const drumGain=chip?1:bank0?1:V.drums;
    // One seeded noise bed keeps hats and snares reproducible from the seed.
    const noiseRandom=rng(score.seed^0x4E4F4953),noiseBuffer=ctx.createBuffer(1,Math.floor(SR*1.5),SR),nd=noiseBuffer.getChannelData(0);
    for(let i=0;i<nd.length;i++)nd[i]=noiseRandom()*2-1;
    for(const n of events){
      let bus=n.part===1?buses.pad:(n.part===2||n.part===4)?buses.body:buses.mid;
      // Sustained wonder/requiem harmony breathes out instead of sitting at a fixed
      // level. Apply before the reverb send, for sampled and synthesized voices.
      if(['wonder','requiem'].includes(score.moodId)&&(n.part===1||n.part===2)){
        const fade=ctx.createGain(),at=n.beat*beat,duration=n.duration*beat;
        fade.gain.setValueAtTime(1,at);
        fade.gain.setValueAtTime(1,at+Math.min(.2,duration*.1));
        const requiem=score.moodId==='requiem',floor=requiem?.14:.12;
        // Requiem settles into a quiet bed until the next chord, rather than
        // finishing the note early and leaving a silent part of each bar.
        fade.gain.exponentialRampToValueAtTime(floor,at+(requiem?Math.min(duration*.9,2.4*beat):duration*.9));
        if(requiem)fade.gain.setValueAtTime(floor,at+duration);
        fade.connect(bus);bus=fade;
      }
      if(n.part===4){
        if(n.pitch===36){bank?sampleNote(ctx,bus,n,beat,bank):scheduleKick(ctx,bus,n.beat*beat,n.duration*beat,(chip?.26:.32)*drumGain*n.velocity/80)}
        else if(n.pitch===42)noiseSource(ctx,noiseBuffer,bus,n.beat*beat,Math.min(n.duration*beat,.09),.05*drumGain*n.velocity/80,6500,n.pan||.2);
        else if(bank)sampleNote(ctx,bus,n,beat,bank);
        else noiseSource(ctx,noiseBuffer,bus,n.beat*beat,n.duration*beat,.045*drumGain*n.velocity/80,n.pitch===38?900:2800,n.pan||0);
        continue;
      }
      if(bank){sampleNote(ctx,bus,n,beat,bank,soft);continue}
      if(chip){chipTone(ctx,bus,midiFreq(n.pitch),n.beat*beat,n.duration*beat,[.11,.05,.095,.045][n.part]*n.velocity/80,['key','pad','bass','key'][n.part],n.pan);continue}
      synthNote(ctx,bus,midiFreq(n.pitch),n.beat*beat,n.duration*beat,V.gains[n.part]*n.velocity/80,['key','pad','bass','key'][n.part],n.pan||0,V,bright);
    }
    let abortReject=null;const abort=new Promise((_,reject)=>{abortReject=reject});
    if(onProgress||isCancelled){
      for(let part=1;part<10;part++){
        const when=total*part/10;
        try{ctx.suspend(when).then(()=>{
          if(isCancelled&&isCancelled()){abortReject(Object.assign(Error('中止しました'),{cancelled:true}));return}
          if(onProgress)onProgress(part*10);
          ctx.resume();
        }).catch(()=>{})}catch(e){}
      }
    }
    const rendered=await Promise.race([ctx.startRendering(),abort]);
    const srcL=rendered.getChannelData(0),srcR=rendered.getChannelData(1),n=Math.floor(score.length*SR),x=Math.min(Math.floor(tail*SR),n);
    const L=new Float32Array(n),R=new Float32Array(n);L.set(srcL.subarray(0,n));R.set(srcR.subarray(0,n));
    if(score.ending!=='cadence')for(let i=0;i<x;i++){L[i]+=srcL[n+i];R[i]+=srcR[n+i]}
    // A loop wraps its tail to the head; a cadence has nowhere to put one, so it is closed
    // with a short fade instead of being cut mid-ring.
    else{const f=Math.min(Math.floor(SR*.3),n);for(let i=0;i<f;i++){const w=.5+.5*Math.cos(Math.PI*i/f),k=n-f+i;L[k]*=w;R[k]*=w}}
    let sum=0,peak=0;for(let i=0;i<n;i++){sum+=L[i]*L[i]+R[i]*R[i]}let rms=Math.sqrt(sum/(2*n)),gain=rms>1e-9?(score.moodId==='requiem'?.045:.075)*(score.level||1)/rms:1;
    for(let i=0;i<n;i++){L[i]=Math.tanh(L[i]*gain);R[i]=Math.tanh(R[i]*gain);peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]))}
    if(peak>.95){gain=.95/peak;for(let i=0;i<n;i++){L[i]*=gain;R[i]*=gain}peak=.95}
    const step=Math.max(Math.abs(L[0]-L[n-1]),Math.abs(R[0]-R[n-1]));return{L,R,length:n,peak,step,score};
  }

  // One audio context for the whole page, built on the first real gesture. A context created later,
  // in the middle of an await, starts suspended under the autoplay policy and its resume() can hang
  // forever — which is why the first sound a page tried to make used to be swallowed silently.
  function audioContext(){if(!state.audio)state.audio=new AudioContext();return state.audio}
  function unlockAudio(){const c=audioContext();if(c.state==='suspended'&&c.resume)void c.resume()}
  async function stopPlayback(){
    const revision=++state.playRevision;stopMeter();
    if(state.playSource){try{state.playSource.stop()}catch{}try{state.playSource.disconnect()}catch{}state.playSource=null}
    state.playGain=null;state.playTake=null;state.playCtx=null;comparisonUI();
    if(revision===state.playRevision){$('play').textContent='再生';$('stop').disabled=true;renderMeter(-1);clearPreviews()}
  }
  async function play(target=state.take,once=false,offset=0){
    if(!state.take||state.busy)return;
    const selected=state.take,t=target,stopped=stopPlayback(),revision=state.playRevision;
    await stopped;
    if(revision!==state.playRevision||state.busy||state.take!==selected)return;
    const c=audioContext(),b=c.createBuffer(2,t.length,SR);b.copyToChannel(t.L,0);b.copyToChannel(t.R,1);
    const s=c.createBufferSource(),gain=c.createGain();s.buffer=b;s.loop=!once&&t.score?.ending!=='cadence';
    gain.gain.value=state.volume;s.connect(gain);gain.connect(c.destination);state.playGain=gain;
    s.onended=()=>{if(state.playSource===s&&!s.loop)void stopPlayback()};
    state.playCtx=c;state.playSource=s;state.playTake=t;comparisonUI();
    const from=Math.max(0,Math.min(offset,t.length/SR-.01));
    try{s.start(0,from)}catch{s.start()}
    // Creating the context after an await can leave it suspended on strict autoplay policies.
    // A context created after an await starts suspended under strict autoplay policy, and resume()
    // can stay pending forever until the page gets a real click — so never block setup on it.
    if(c.state==='suspended'){try{await Promise.race([c.resume(),new Promise(r=>setTimeout(r,400))])}catch{}}
    // Something newer took over while we waited: drop this source instead of layering it on top.
    if(revision!==state.playRevision||state.playSource!==s){try{s.stop()}catch{}try{s.disconnect()}catch{}return}
    state.playStartedAt=(typeof c.currentTime==='number'?c.currentTime:0)-from;
    if(!t.sample)clearPreviews();
    if(t===state.take)state.tourPlayed=true;
    $('play').textContent=t===state.take?'再生中':'現在の曲を再生';$('stop').disabled=false;startMeter();guide();
    if(c.state==='suspended'){
      status('ブラウザが音を止めています。画面のどこかをクリックすると再生が始まります','error');
      c.onstatechange=()=>{if(c.state==='running'&&state.playCtx===c){state.playStartedAt=(c.currentTime||0)-from;status('再生しています','')}};
    }
  }

  function setVolume(value){
    const level=Number(value);if(!Number.isFinite(level))return;
    state.volume=Math.max(0,Math.min(1,level));
    if(state.playGain&&state.playCtx)state.playGain.gain.setTargetAtTime(state.volume,state.playCtx.currentTime,.025);
    const label=$('volumeValue');if(label)label.textContent=Math.round(state.volume*100)+'%';
  }

  async function buildScores(scores,message,before=null){
    if(state.busy)return;
    state.busy=true;state.cancel=false;setBusy(true);
    overlayProgress(message,0,scores.length?describe(scores[0]):'','1 / '+scores.length);showOverlay(true);
    try{
      await stopPlayback();const rendered=[];
      for(let i=0;i<scores.length;i++){
        const head=scores.length>1?`${message} ${i+1}/${scores.length}`:message;
        const report=p=>{
          const overall=(i*100+p)/scores.length;
          status(head+' '+Math.round(overall)+'%','busy');
          overlayProgress(message,overall,describe(scores[i]),(i+1)+' / '+scores.length);
        };
        report(0);
        await new Promise(resolve=>setTimeout(resolve,20));
        if(state.cancel)throw Object.assign(Error('中止しました'),{cancelled:true});
        rendered.push(await render(scores[i],report,()=>state.cancel));
      }
      overlayProgress(message,100,'仕上げています','');
      state.takes=[...rendered,...(before?[before]:[]),...state.takes.filter(t=>t!==before)].slice(0,6);
      let samples=0;state.takes=state.takes.filter((t,i)=>{samples+=t.length;return i===0||samples<=24e6});
      state.comparison=before&&state.takes.includes(before)?{before,after:rendered[0]}:null;
      state.take=rendered[0];state.tourRemake=false;if(!state.tourSaved)state.tourPlayed=false;draw();
      status(scores.length>1?'探索・不穏・戦闘の3曲を作りました。下の「再生」で聴けます':'曲を作りました。下の「再生」で聴けます','');
      const sheet=$('adjustments');if(sheet)sheet.open=false;
      setTimeout(()=>{
        const panel=typeof document.querySelector==='function'?document.querySelector('.panel.listen'):null;
        // A smooth scroll never runs while the tab is hidden, so a song finished in the background
        // would leave the page where it was. Jump instead of animating in that case.
        const seen=typeof document.visibilityState!=='string'||document.visibilityState==='visible';
        if(panel&&panel.scrollIntoView)panel.scrollIntoView({behavior:smooth()&&seen?'smooth':'auto',block:'start'});
        const b=$('play');if(b&&!b.disabled&&b.focus){try{b.focus({preventScroll:true})}catch{b.focus()}}
      },0);
    }catch(e){if(e&&e.cancelled)status('中止しました','');else{console.error(e);status(e.message||'生成に失敗しました','error')}}
    finally{showOverlay(false);state.busy=false;state.cancel=false;setBusy(false)}
  }
  function generate(){if(state.busy)return;return buildScores([nextScore()],'曲を作っています')}
  function readEdits(){return {accompaniment:$('editPattern').value,sound:$('editSound').value,bpm:Number($('editTempo').value),length:Number($('editLength').value),phrasing:$('editPhrasing').value,lead:$('editLead').checked,drums:$('editDrums').checked,ending:$('editLoop').checked?'loop':'cadence',level:Number($('editLevel').value)}}
  function previewEdits(){
    if(!state.take)return;
    const settings=readEdits(),score=BGMScore.adjust(state.take.score,settings);
    const changed=$('editAccompaniment').checked||JSON.stringify(score)!==JSON.stringify(state.take.score);
    state.tourPending=changed;
    $('applyEdits').disabled=state.busy||!changed;$('resetEdits').disabled=state.busy||!changed;
    $('editPending').textContent=changed?'設定を変更しました。下のボタンで曲に反映してください。':'';
    $('editPending').parentElement.classList.toggle('has-changes',changed);
    $('editPhrasing').disabled=!settings.lead||state.busy;
    previewLengths();guide();
    $('editSummary').textContent='適用後：'+score.bpm+' BPM · '+lengthLabel(score.length)+' · '+(score.ending==='loop'?'ループ用':'終止あり')+($('editAccompaniment').checked?' · 伴奏を作り直す':'')+'。';
  }
  function syncEdits(){
    if(!state.take)return;const s=state.take.score;
    const set=(id,value,label)=>{const el=$(id),v=String(value);if(!Array.from(el.options).some(o=>o.value===v)){const o=document.createElement('option');o.value=v;o.textContent=label||v;el.appendChild(o)}el.value=v};
    set('editPattern',s.accompaniment||'auto');set('editSound',s.sound);set('editTempo',s.bpm,s.bpm+' BPM');set('editLength',s.requestedLength||s.length,lengthLabel(s.requestedLength||s.length));set('editPhrasing',s.phrasing);set('editLevel',s.level,Math.round(s.level*100)+'%');
    $('editAccompaniment').checked=false;state.remixSeed=0;
    $('editLead').checked=s.lead!==false;$('editDrums').checked=s.drums!=='none';$('editLoop').checked=s.ending!=='cadence';previewEdits();
  }
  // Picking a voice or a tempo from a list tells you nothing about how it sounds, and a list of
  // seconds says nothing about how long a sample runs. Each previewable option gets a listen row:
  // two bars of the current theme, a bar that shows how far it has run, and the length in seconds.
  const PREVIEWS=['current'];   // 試聴は1か所。どのボタンからでも鳴るのは「今の設定の2小節」なので、4つ並べる意味がなかった
  const sampleTakes=new Map();
  let sampling=0;
  const q1=sel=>typeof document.querySelector==='function'?document.querySelector(sel):null;
  const qAll=sel=>typeof document.querySelectorAll==='function'?document.querySelectorAll(sel):[];
  const previewEl=kind=>q1('[data-preview="'+kind+'"]');
  const seconds=n=>n.toFixed(1)+'秒';

  function setSeek(el,position,duration){
    if(!el||!el.querySelector)return;
    const fill=el.querySelector('.seek>i'),label=el.querySelector('.seek-time');
    if(fill)fill.style.width=(duration>0?Math.max(0,Math.min(1,position/duration))*100:0).toFixed(2)+'%';
    if(label)label.textContent=position>0?seconds(position)+' / '+seconds(duration):seconds(duration);
  }
  // The idle label answers "how long will this take?" before anything is rendered.
  function previewLengths(){
    const length=BGMScore.sampleSeconds(Number($('editTempo').value)||state.bpm||76);
    for(const kind of PREVIEWS){
      const el=previewEl(kind);if(!el)continue;
      if(state.sampleKind===kind&&state.playCtx)continue;
      el.classList.remove('is-playing');setSeek(el,0,length);
    }
  }
  function previewTick(){
    const el=state.sampleKind?previewEl(state.sampleKind):null;if(!el)return;
    const c=state.playCtx,t=state.playTake;
    if(!c||!t||!t.sample){clearPreviews();return}
    const duration=t.length/SR,now=typeof c.currentTime==='number'?c.currentTime:NaN;
    setSeek(el,Number.isFinite(now)?Math.max(0,Math.min(duration,now-state.playStartedAt)):0,duration);
  }
  // The seek bar runs on a timer, not requestAnimationFrame: rAF is paused in background tabs and
  // under reduced-motion, and a progress bar that silently stops is worse than a coarse one.
  function startPreviewTimer(){if(!state.sampleTimer&&typeof setInterval==='function')state.sampleTimer=setInterval(previewTick,100)}
  function stopPreviewTimer(){if(state.sampleTimer&&typeof clearInterval==='function')clearInterval(state.sampleTimer);state.sampleTimer=0}
  function clearPreviews(){stopPreviewTimer();state.sampleKind=null;previewBusy(null);previewLengths()}
  // The button that started a sample is the one that stops it: a separate stop per row would be
  // four more controls for something only one row can be doing at a time.
  function previewBusy(loading){
    qAll('[data-preview]').forEach(el=>{
      const kind=el.dataset&&el.dataset.preview;
      const busy=!!loading&&kind===loading,playing=state.sampleKind===kind&&!!state.playCtx;
      el.classList.toggle('is-loading',busy);el.classList.toggle('is-playing',playing);
      const b=el.querySelector&&el.querySelector('.try');
      if(!b)return;
      b.disabled=state.busy||!state.take||(!!loading&&!busy);
      b.textContent=busy?'準備中':playing?'■ 停止':'▶ 試聴';
      if(b.classList)b.classList.toggle('is-stop',playing);
    });
  }
  // Every listen row plays what the settings as they stand would produce. Forcing the tune or the
  // drums on would answer a question nobody asked: the switch is right there, and flipping it costs
  // nothing until 作り直す is pressed.
  function sampleFor(){
    const e=readEdits();
    // 伴奏の作り直しは試聴の段階で種を決めておき、適用時も同じ種を使う。
    // そうしないと「聴いた伴奏」と「作り直した伴奏」が別物になる。
    const source=state.remixSeed?BGMScore.remix(state.take.score,'accompaniment',state.remixSeed):state.take.score;
    return BGMScore.sample(source,{accompaniment:e.accompaniment,sound:e.sound,bpm:e.bpm,lead:e.lead,drums:e.drums,phrasing:e.phrasing,level:e.level});
  }
  function previewLabel(){
    const e=readEdits();
    return [e.sound&&SOUNDS.find(x=>x.id===e.sound)?SOUNDS.find(x=>x.id===e.sound).name:'',e.bpm+' BPM',
      e.lead?'メロディあり':'メロディなし',e.drums?'打楽器あり':'打楽器なし',
      e.level<1?'音量'+Math.round(e.level*100)+'%':'',state.remixSeed?'伴奏を作り直す':''].filter(Boolean).join(' · ');
  }
  async function trySample(kind='current',offset=0){
    if(!state.take||state.busy)return;
    const score=sampleFor(),key=score.fingerprint,turn=++sampling;
    let take=sampleTakes.get(key);
    if(!take){
      previewBusy(kind);
      try{take=await render(score)}
      catch(e){if(turn===sampling){previewBusy(null);status(e.message||'試聴の準備に失敗しました','error')}return}
      if(turn!==sampling)return;
      take.sample=true;sampleTakes.set(key,take);
      while(sampleTakes.size>16)sampleTakes.delete(sampleTakes.keys().next().value);
    }
    if(turn!==sampling)return;
    previewBusy(null);take.sample=true;
    status(previewLabel(kind)+'で2小節だけ試聴します（'+seconds(take.length/SR)+'）','');
    // play() stops whatever was running first, which clears the bars — so claim this one afterwards.
    await play(take,true,offset);
    if(state.playTake!==take)return;
    state.sampleKind=kind;previewBusy(null);
    previewTick();startPreviewTimer();
  }

  function bindPreviews(){
    qAll('[data-preview]').forEach(el=>{
      const kind=el.dataset&&el.dataset.preview;if(!kind)return;
      const button=el.querySelector('.try'),bar=el.querySelector('.seek');
      // Playing this row already? Then this button is its stop.
      if(button)button.onclick=()=>{
        if(state.sampleKind===kind&&state.playCtx)return void stopPlayback();
        void trySample(kind);
      };
      if(!bar)return;
      // Clicking the bar restarts the sample from that point, so a long one can be skimmed.
      const seek=event=>{
        const box=bar.getBoundingClientRect();if(!box.width)return;
        const at=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width));
        const take=state.sampleKind===kind?state.playTake:null;
        void trySample(kind,at*(take&&take.sample?take.length/SR:BGMScore.sampleSeconds(Number($('editTempo').value)||76)));
      };
      bar.onclick=seek;
      bar.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();void trySample(kind)}};
    });
  }

  function applyEdits(){if(!state.take||state.busy)return;let score=BGMScore.adjust(state.take.score,readEdits());if($('editAccompaniment').checked)score=BGMScore.remix(score,'accompaniment',state.remixSeed||randomSeed());if(JSON.stringify(score)===JSON.stringify(state.take.score)){status('設定は変更されていません','');return}return buildScores([score],'この設定で曲を作り直しています',state.take)}
  async function compareEdit(undo=false){
    const pair=state.comparison;if(!pair||state.busy)return;
    if(!undo){await play(state.playTake===pair.before?state.take:pair.before);return}
    await stopPlayback();
    if(state.busy||state.comparison!==pair)return;
    state.take=pair.before;state.comparison=null;
    draw();setBusy(false);
    status('直前の変更を取り消しました。変更後の曲はテイク一覧に残っています。','');
  }
  function comparisonUI(){
    const preview=!!state.comparison&&state.playTake===state.comparison.before;
    const button=$('compare'),info=$('comparisonStatus');
    if(button)button.textContent=preview?'現在の曲を試聴':'変更前を試聴';
    if(info)info.textContent=preview?'変更前を試聴中です。保存・調整の対象は現在の曲（変更後）のままです。':state.comparison?'変更前と先頭から聴き比べられます。試聴しても保存する曲は変わりません。':'直前の変更があると試聴・取り消しができます。';
  }

  const editIds=['editPattern','editAccompaniment','editSound','editTempo','editLength','editPhrasing','editLevel','editLead','editDrums','editLoop','applyEdits','resetEdits'];
  function setBusy(v){
    guide();
    $('editFields').disabled=v||!state.take;
    document.querySelectorAll('button,select,input').forEach(b=>{if(!b.dataset||b.dataset.cancel===undefined)b.disabled=v});
    document.querySelectorAll('[data-cancel]').forEach(b=>b.disabled=!v);
    if(!v){
      guide();
      $('play').disabled=!state.take;
      editIds.forEach(id=>$(id).disabled=!state.take);
      document.querySelectorAll('[data-save]').forEach(b=>b.disabled=!state.take||(b.dataset.save==='mp3'&&typeof lamejs==='undefined'));
      $('stop').disabled=!state.playCtx;
      if(state.take)previewEdits();
      $('compare').disabled=!state.comparison;$('undoEdit').disabled=!state.comparison;
      previewBusy(null);previewLengths();
    }
  }
  function lockScroll(on){if(document.body&&document.body.style)document.body.style.overflow=on?'hidden':''}
  function showOverlay(on){const o=$('overlay');if(!o)return;o.hidden=!on;lockScroll(on)}
  // One controller for the help sheet and the per-section detail sheets.
  function closeSheets(){['help','detail'].forEach(id=>{const o=$(id);if(o)o.hidden=true});lockScroll(false)}
  function openDetail(key){
    const src=$(key),body=$('detailBody'),title=$('detailTitle'),sheet=$('detail');
    if(!src||!body||!sheet||body.innerHTML===undefined)return;
    title.textContent=src.dataset?src.dataset.title||'詳細':'詳細';
    body.innerHTML=src.innerHTML;body.scrollTop=0;
    sheet.hidden=false;lockScroll(true);
    const b=sheet.querySelector('[data-close]');if(b&&b.focus)b.focus();
  }
  // The sound list comes from the same table the app runs on.
  function fillDetailLists(){
    const sounds=$('soundList');
    if(sounds&&sounds.innerHTML!==undefined)sounds.innerHTML=SOUNDS.map(x=>
      '<dt>'+x.name+'</dt><dd>'+x.note+'</dd>').join('');
  }
  function showHelp(on){
    const o=$('help');if(!o)return;o.hidden=!on;lockScroll(on);
    const b=$(on?'helpClose':'helpOpen');if(b&&b.focus)b.focus();
  }
  function overlayProgress(title,pct,meta,step){
    const set=(id,v)=>{const el=$(id);if(el&&v!==undefined&&v!==null)el.textContent=v};
    set('overlayTitle',title);set('overlayMeta',meta);set('overlayStep',step);
    const bar=$('overlayBar');if(bar&&bar.style)bar.style.width=Math.max(0,Math.min(100,pct||0))+'%';
    set('overlayPct',Math.round(Math.max(0,Math.min(100,pct||0)))+'%');
  }
  function describe(score){
    const mood=MOODS.find(m=>m.id===score.moodId),sound=SOUNDS.find(x=>x.id===score.sound);
    const tempo=TEMPOS.find(t=>t.bpm===score.bpm);
    return [mood?mood.name:score.moodId,(tempo?tempo.name+' ':'')+score.bpm+' BPM',lengthLabel(score.length),sound?sound.name:score.sound].join(' · ');
  }
  const MODE_JA={ionian:'イオニア（長調）',dorian:'ドリア',aeolian:'エオリア（自然短調）',phrygian:'フリギア',
    locrian:'ロクリア',harmonic:'和声的短音階',lydian:'リディア',mixolydian:'ミクソリディア'};
  const densityWord=d=>d<.5?'少なめ':d>.75?'多め':'ふつう';
  const DRUM_JA={none:'なし',light:'軽い（2・4拍）',pulse:'鼓動（1拍）',heart:'心音（二連）',drive:'ドライブ（8分＋太鼓）'};
  // The mood card sells the scene; the build panel confirms the spec just before generating.
  function renderBrief(){
    const m=state.mood,tempo=TEMPOS.find(t=>t.bpm===state.bpm),sound=SOUNDS.find(x=>x.id===state.sound);
    const bars=BGMScore.themeBarsFor(state.bpm,state.length);
    const phrasing=({sparse:'少なめ',dense:'多め'})[state.phrasing]||'ふつう';
    const card=$('brief');
    if(card&&card.innerHTML!==undefined)card.innerHTML='<h4>'+m.name+'</h4><p>'+(m.desc||'')+'</p>';
    const sum=$('summary');
    if(!sum||sum.innerHTML===undefined)return;
    const rows=[
      ['雰囲気',[m.name,MODE_JA[m.mode]||m.mode,'打楽器'+(DRUM_JA[m.drums]||m.drums)].join(' · ')],
      ['設定',[(tempo?tempo.name+' ':'')+state.bpm+' BPM',(state.ending==='cadence'?lengthLabel(state.length):lengthLabel(BGMScore.loopLength(state.bpm,state.length,bars))+'（'+lengthLabel(state.length)+'以内・テーマ単位）'),bars+'小節',
        state.ending==='cadence'?'終止あり':'ループ用',sound?sound.name:state.sound,
        state.lead?(state.phrasing==='auto'?'メロディあり':'メロディ'+phrasing):'伴奏だけ'].join(' · ')]
    ];
    sum.innerHTML=rows.map(([k,v])=>'<dt>'+k+'</dt><dd>'+v+'</dd>').join('');
  }
  function status(s,c){$('status').textContent=s;$('status').className='status '+c}
  function fingerprint(s,t){
    const phrasing=({sparse:'間 多め',dense:'間 少なめ'})[s.phrasing]||'おまかせ';
    const rows=[
      ['SEED',s.seed],['TEMPO',s.bpm+' BPM'],
      ['KEY',NOTES[s.root]+' '+s.mode],['SCENE',s.sceneName||'テーマ'],
      ['PROG',s.prog.map(x=>x+1).join('–')],['MOTIF',s.motif.join('–')],
      ['RHYTHM','R'+(s.rhythmIndex+1)+' · '+s.arp],['FORM',s.themeBars+'小節 · '+(s.ending==='cadence'?'終止あり':'ループ用')],
      ['VOICE',phrasing+' · 密度 '+Math.round((s.density||.65)*100)+'%'],['SOURCE',(SOUNDS.find(x=>x.id===s.sound)||SOUNDS[0]).name],['LEAD',s.lead===false?'なし（伴奏だけ）':'あり'],
      ['LEVEL',Math.round((s.level||1)*100)+'% · ドラム '+(s.drums==='none'?'なし':'あり')],['THEME',s.themeId]
    ];
    if(t)rows.push(['PEAK',t.peak.toFixed(2)],['SEAM',t.step.toFixed(5)]);
    const body=rows.map(([k,v],i)=>'<dt>'+k+'</dt><dd>'+(i===rows.length-1?'<em>'+v+'</em><span class="log-cursor"></span>':v)+'</dd>').join('');
    const tag=(s.scene==='theme'?'theme':s.scene).toUpperCase();
    return '<div class="log-head"><span class="led"></span>signal log<span class="rule"></span>'+tag+'</div><dl class="log-body">'+body+'</dl>';
  }
  const smooth=()=>typeof matchMedia!=='function'||!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function peaksFor(t,width){
    if(t.peaks&&t.peaks.length===width)return t.peaks;
    const p=new Float32Array(width);
    for(let x=0;x<width;x++){const a=Math.floor(x*t.length/width),b=Math.floor((x+1)*t.length/width);let m=0;
      for(let i=a;i<b;i+=32)m=Math.max(m,Math.abs(t.L[i]),Math.abs(t.R[i]));p[x]=m}
    t.peaks=p;return p;
  }
  // progress < 0 idles; 0..1 lights the played portion and draws the playhead.
  function renderMeter(progress){
    const c=$('meter');if(!c||typeof c.getContext!=='function')return;
    const dpr=Math.min(2,(typeof devicePixelRatio==='number'?devicePixelRatio:1)||1);
    const w=Math.max(1,Math.round(c.clientWidth||900)),h=Math.max(1,Math.round(c.clientHeight||96));
    if(c.width!==w*dpr||c.height!==h*dpr){c.width=w*dpr;c.height=h*dpr}
    const g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,w,h);g.fillStyle='#000205';g.fillRect(0,0,w,h);
    g.lineWidth=1;g.strokeStyle='rgba(113,196,213,.09)';g.beginPath();
    for(let i=1;i<16;i++){const x=Math.round(w*i/16)+.5;g.moveTo(x,0);g.lineTo(x,h)}g.stroke();
    g.strokeStyle='rgba(113,196,213,.18)';g.beginPath();g.moveTo(0,Math.round(h/2)+.5);g.lineTo(w,Math.round(h/2)+.5);g.stroke();
    const t=state.playTake||state.take;if(!t)return;
    const peaks=peaksFor(t,w),mid=h/2,amp=h*.44;
    const trace=()=>{g.beginPath();g.moveTo(0,mid);
      for(let x=0;x<w;x++)g.lineTo(x,mid-peaks[x]*amp);
      for(let x=w-1;x>=0;x--)g.lineTo(x,mid+peaks[x]*amp);
      g.closePath()};
    g.save();trace();g.fillStyle='rgba(113,196,213,.17)';g.fill();
    g.shadowColor='rgba(113,196,213,.55)';g.shadowBlur=7;g.strokeStyle='rgba(150,220,236,.4)';g.lineWidth=.8;g.stroke();g.restore();
    if(!(progress>=0))return;
    const x=Math.max(0,Math.min(w,w*progress));
    g.save();g.beginPath();g.rect(0,0,x,h);g.clip();
    trace();g.shadowColor='rgba(140,226,244,.9)';g.shadowBlur=14;g.fillStyle='rgba(150,224,240,.36)';g.fill();g.restore();
    // A hot leading edge that fades back into the trace, so the head reads as a sweep.
    const trail=Math.min(x,w*.14);
    if(trail>2){
      g.save();g.beginPath();g.rect(x-trail,0,trail,h);g.clip();
      const glow=g.createLinearGradient(x-trail,0,x,0);
      glow.addColorStop(0,'rgba(206,246,255,0)');glow.addColorStop(.65,'rgba(206,246,255,.3)');glow.addColorStop(1,'rgba(228,251,255,.78)');
      trace();g.shadowColor='rgba(180,240,255,.95)';g.shadowBlur=22;g.fillStyle=glow;g.fill();g.restore();
    }
    g.save();g.shadowColor='rgba(255,206,140,.95)';g.shadowBlur=14;
    g.strokeStyle='rgba(255,222,168,.95)';g.lineWidth=1.4;
    g.beginPath();g.moveTo(x,1);g.lineTo(x,h-1);g.stroke();g.restore();
  }
  function meterTick(){
    state.meterRaf=0;previewTick();
    const c=state.playCtx,t=state.playTake||state.take;
    if(!c||!t){renderMeter(-1);return}
    const duration=t.length/SR,now=typeof c.currentTime==='number'?c.currentTime:NaN;
    const elapsed=now-state.playStartedAt;
    // The waveform on screen is the take; a short sample would drag a playhead that means nothing.
    renderMeter(t.sample?-1:Number.isFinite(elapsed)&&duration>0?((elapsed%duration)+duration)%duration/duration:-1);
    if(typeof requestAnimationFrame==='function')state.meterRaf=requestAnimationFrame(meterTick);
  }
  function startMeter(){if(typeof requestAnimationFrame!=='function'||!smooth()){renderMeter(0);return}if(!state.meterRaf)state.meterRaf=requestAnimationFrame(meterTick)}
  function stopMeter(){if(state.meterRaf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(state.meterRaf);state.meterRaf=0}
  function draw(){
    const t=state.take;
    guide();syncEdits();
    comparisonUI();
    // The log describes one take, so it is moved out of the list before the list is rebuilt and
    // put back directly under whichever row is selected.
    const readout=$('fingerprint');
    if(readout&&readout.parentNode&&readout.parentNode.removeChild)readout.parentNode.removeChild(readout);
    readout.className='fingerprint';readout.innerHTML=fingerprint(t.score,t);readout.hidden=!state.logOpen;
    renderMeter(state.playCtx?0:-1);
    $('takes').innerHTML='';
    const pick=async x=>{
      if(state.busy)return;
      // Clicking a take is what asks for its details — and for hearing it.
      state.logOpen=true;
      if(x===state.take){
        const r=$('fingerprint');if(r)r.hidden=false;
        if(state.playTake!==state.take)void play();
        return;
      }
      await stopPlayback();state.take=x;state.comparison=null;draw();setBusy(false);
      const row=$('takes').children[state.takes.indexOf(x)];if(row&&row.focus)row.focus();
      void play();
    };
    state.takes.forEach((x,i)=>{
      // The row itself is the radio: clicking anywhere on it selects that take.
      const d=document.createElement('div');d.className='take '+(x===t?'active':'');
      d.setAttribute('role','radio');d.setAttribute('aria-checked',x===t?'true':'false');
      d.tabIndex=x===t?0:-1;
      d.innerHTML='<span class="dot"></span><div><strong>'+(x.score.sceneName||'テーマ')+' · '+x.score.moodName+' / SEED '+x.score.seed+'</strong>'+
        '<p>'+x.score.bpm+' BPM · '+NOTES[x.score.root]+' '+x.score.mode+' · '+x.score.arp+' · '+x.score.motif.join('-')+'</p></div>'+
        '<span class="take-state">'+(x===t?'選択中':'選ぶ')+'</span>';
      d.onclick=()=>void pick(x);
      d.onkeydown=e=>{
        if(e.key==='Enter'||e.key===' '||e.key==='Spacebar'){e.preventDefault();return void pick(x)}
        const step=e.key==='ArrowDown'||e.key==='ArrowRight'?1:e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:0;
        if(!step)return;
        e.preventDefault();
        void pick(state.takes[(i+step+state.takes.length)%state.takes.length]);
      };
      $('takes').appendChild(d);
      if(x===t&&readout)$('takes').appendChild(readout);
    });
  }
  function wav(t){const n=t.length,ab=new ArrayBuffer(44+n*4),v=new DataView(ab);let o=0;const str=s=>{for(const c of s)v.setUint8(o++,c.charCodeAt(0))},u16=x=>{v.setUint16(o,x,true);o+=2},u32=x=>{v.setUint32(o,x,true);o+=4};str('RIFF');u32(36+n*4);str('WAVEfmt ');u32(16);u16(1);u16(2);u32(SR);u32(SR*4);u16(4);u16(16);str('data');u32(n*4);for(let i=0;i<n;i++){v.setInt16(o,Math.max(-1,Math.min(1,t.L[i]))*32767,true);o+=2;v.setInt16(o,Math.max(-1,Math.min(1,t.R[i]))*32767,true);o+=2}return new Blob([ab],{type:'audio/wav'})}
  function download(blob,name,keep=5000){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),keep)}
  function fileName(s,ext){return `bgm_${s.moodId}_${s.bpm}bpm_s${s.seed}_${s.scene}_${s.ending}.${ext}`}
  function save(){if(!state.take)return;const t=state.take;download(wav(t),fileName(t.score,'wav'));status('WAVの保存を開始しました（44.1kHz / 16bit / ステレオ）','')}
  async function encodeMp3(t,onProgress=()=>{}){
    if(typeof lamejs==='undefined')throw Error('MP3変換ライブラリを読み込めません。vendorフォルダを確認してください。');
    const encoder=new lamejs.Mp3Encoder(2,SR,192),parts=[],block=1152;
    for(let at=0;at<t.length;at+=block){
      const size=Math.min(block,t.length-at),left=new Int16Array(size),right=new Int16Array(size);
      for(let i=0;i<size;i++){
        const l=Math.max(-1,Math.min(1,t.L[at+i])),r=Math.max(-1,Math.min(1,t.R[at+i]));
        left[i]=Math.round(l*(l<0?32768:32767));right[i]=Math.round(r*(r<0?32768:32767));
      }
      const chunk=encoder.encodeBuffer(left,right);if(chunk.length)parts.push(new Int8Array(chunk));
      if((at/block)%32===0){onProgress(Math.floor(at/t.length*100));await new Promise(resolve=>setTimeout(resolve,0));}
    }
    const last=encoder.flush();if(last.length)parts.push(new Int8Array(last));
    return new Blob(parts,{type:'audio/mpeg'});
  }
  async function saveMp3(){
    if(!state.take||state.busy)return;
    const t=state.take;state.busy=true;setBusy(true);
    try{
      await stopPlayback();status('MP3に変換しています… 0%','busy');
      const blob=await encodeMp3(t,p=>status(`MP3に変換しています… ${p}%`,'busy'));
      download(blob,fileName(t.score,'mp3'),60000);
      status('MP3の保存を開始しました（192 kbps・ステレオ）','');
    }catch(e){console.error(e);status(e.message||'MP3保存に失敗しました','error')}
    finally{state.busy=false;setBusy(false)}
  }
  function midiFile(s){
    const ppq=480,end=Math.round(s.length*s.bpm/60*ppq),base=rootMidi(s.root,3);
    const vlq=n=>{const a=[n&127];while(n>>>=7)a.unshift((n&127)|128);return a};
    const text=s=>Array.from(s,c=>c.charCodeAt(0));
    const chunk=(name,data)=>[...text(name),(data.length>>>24)&255,(data.length>>>16)&255,(data.length>>>8)&255,data.length&255,...data];
    const tracks=[],tempo=Math.round(60000000/s.bpm);
    const pack=events=>{events.sort((a,b)=>a.tick-b.tick||a.priority-b.priority);let previous=0;const bytes=[];for(const e of events){bytes.push(...vlq(e.tick-previous),...e.data);previous=e.tick}bytes.push(...vlq(end-previous),255,47,0);return chunk('MTrk',bytes)};
    tracks.push(pack([{tick:0,priority:0,data:[255,81,3,tempo>>>16,(tempo>>>8)&255,tempo&255]},{tick:0,priority:0,data:[255,88,4,4,2,24,8]}]));
    const parts=[['Melody',0,0],['Strings',1,48],['Bass',2,0],['Arpeggio',3,0],['Drums',9,0]].map(([name,ch,program])=>({ch,notes:[],events:[{tick:0,priority:-2,data:[255,3,name.length,...text(name)]},...(ch===9?[]:[{tick:0,priority:-1,data:[192|ch,program]}])]}));
    function note(part,pitch,beat,duration,velocity){
      const start=Math.round(beat*ppq),stop=Math.min(end,Math.round((beat+duration)*ppq));
      if(start>=end||stop<=start)return;
      parts[part].notes.push({pitch,start,stop,velocity});
    }
    for(const n of BGMScore.events(s))note(n.part,n.pitch,n.beat,n.duration,n.velocity);
    for(const p of parts){
      // Same-pitch retriggers must end the preceding MIDI note first.
      p.notes.sort((a,b)=>a.start-b.start);const last=new Map();
      for(const n of p.notes){const prior=last.get(n.pitch);if(prior&&prior.stop>n.start)prior.stop=n.start;last.set(n.pitch,n)}
      for(const n of p.notes){if(n.stop<=n.start)continue;p.events.push({tick:n.start,priority:1,data:[144|p.ch,n.pitch,n.velocity]},{tick:n.stop,priority:0,data:[128|p.ch,n.pitch,0]})}
      tracks.push(pack(p.events));
    }
    return new Blob([new Uint8Array([...chunk('MThd',[0,1,0,tracks.length,ppq>>>8,ppq&255]),...tracks.flat()])],{type:'audio/midi'});
  }
  function saveMidi(){
    if(!state.take||state.busy)return;
    try{const s=state.take.score;download(midiFile(s),fileName(s,'mid'),60000);
      status('MIDIの保存を開始しました（パート別トラック）','');
    }catch(e){console.error(e);status('MIDI保存に失敗しました','error')}
  }
  function choiceGroup(id,items,getLabel,getValue,onPick){const el=$(id);items.forEach(item=>{const b=document.createElement('button');b.className='choice';b.innerHTML=getLabel(item);b.onclick=()=>{onPick(item);refresh()};b.dataset.value=String(getValue(item));el.appendChild(b)})}
  // The guide lights what you can do now — which is often more than one thing. Picking a scene and
  // making the song are both live while you browse; after a listen, saving and adjusting both are.
  // Once you have saved once it stops for good, because by then you know the way round.
  const STEPS=['stepScene','stepBuild','stepPlay','stepSave','stepAdjust','stepApply','stepTakes'];
  function armChoice(delay){
    if(state.tourTimer&&typeof clearTimeout==='function')clearTimeout(state.tourTimer);
    state.tourTimer=0;
    if(typeof setTimeout==='function')state.tourTimer=setTimeout(()=>{state.tourTimer=0;state.tourReady=true;guide()},delay);
    guide();
  }
  const panelOpen=()=>{const d=$('adjustments');return !!(d&&d.open)};
  function guide(){
    const lit=[];
    if(!state.busy&&!state.tourSaved){
      if(!state.take||state.tourRemake){lit.push('stepScene');if(state.tourReady||state.take)lit.push('stepBuild')}
      else if(!state.tourPlayed)lit.push('stepPlay');
      // While the adjust panel is open the guide stays inside it: saving is not what you came for,
      // and 作り直す only earns a marker once there is actually a change to apply.
      else if(panelOpen())lit.push(...(state.tourPending?['stepApply']:[]));
      // Once it has been heard there are three honest moves: keep it, change it, or go back to an
      // earlier one — so all three are lit rather than ranked.
      else{lit.push('stepSave','stepAdjust');if(state.takes.length>1)lit.push('stepTakes')}
    }
    for(const id of STEPS){const el=$(id);if(el&&el.classList)el.classList.toggle('is-now',lit.indexOf(id)>=0)}
  }

  function refresh(){document.querySelectorAll('#moods .choice').forEach(b=>b.setAttribute('aria-pressed',b.dataset.value===state.mood.id));renderBrief();guide()}
  function selfTest(){
    const settings={mood:MOODS[0],bpm:50,length:20,ending:'loop'},a=compose(settings,12345),b=compose(settings,12345);
    if(a.fingerprint!==b.fingerprint)throw Error('Seed determinism failed');
    let c=compose(settings,12346),tries=0;while(differences(a,c)<2&&tries++<100)c=compose(settings,12347+tries);
    if(differences(a,c)<2)throw Error('Variation failed');
    if(!(60/50>60/130))throw Error('Tempo failed');
    if(Math.max.apply(null,a.motif)-Math.min.apply(null,a.motif)<3)throw Error('Motif range failed');
    const events=BGMScore.events(a),melody=events.filter(n=>n.part===0).map(n=>n.pitch),inner=events.filter(n=>n.part===3).map(n=>n.pitch);
    if(inner.length&&Math.min.apply(null,melody)<=Math.max.apply(null,inner))throw Error('Register overlap failed');
  }
  if(window.BGM_TEST){Object.assign(window.BGM_TEST,{compose,render,midiFile,wav,encodeMp3,state,play,compareEdit,trySample,stopPlayback,setVolume,selfTest,DEFAULTS,MOODS,SOUNDS,LENGTHS,TEMPOS,MODES});return}
  choiceGroup('moods',MOODS,x=>x.name,x=>x.id,m=>{
    // Browsing scenes is not a step you finish — 作る simply becomes available beside it.
    state.tourReady=true;if(state.take)state.tourRemake=true;
    selectMood(m);
  });
  const options=(id,items,value,label)=>items.forEach(item=>{const o=document.createElement('option');o.value=value(item);o.textContent=label(item);$(id).appendChild(o)});
  options('editPattern',BGMScore.ACCOMPANIMENTS,x=>x.id,x=>x.name);
  options('editSound',SOUNDS,x=>x.id,x=>x.name);options('editTempo',TEMPOS,x=>x.bpm,x=>x.name+' · '+x.bpm+' BPM');options('editLength',LENGTHS,x=>x,lengthLabel);options('editPhrasing',PHRASINGS,x=>x.id,x=>x.name);
  selectMood(state.mood);refresh();armChoice(6000);
  $('editFields').onchange=e=>{
    // Turning the tune on starts it at 少なめ: under a conversation that is the amount that works,
    // and it is easier to ask for more than to discover the line was too busy all along.
    const id=e&&e.target?e.target.id:'';
    if(id==='editLead'&&e.target.checked)$('editPhrasing').value='sparse';
    // オンにするたびに別の伴奏を用意する。押し直せば別案を聴き比べられる。
    if(id==='editAccompaniment')state.remixSeed=e.target.checked?randomSeed():0;
    previewEdits();
    // Changing the voice or the tempo is exactly the moment the question "what does that sound like?"
    // comes up — but never interrupt the full take if it is already playing.
    // Changing a setting is a question about the sound, so it always gets an answer — including
    // while the take itself is playing, which is exactly when you are most likely to be comparing.
    if(['editPattern','editSound','editTempo','editPhrasing','editLead','editDrums','editLevel','editAccompaniment'].includes(id))void trySample();
  };
  bindPreviews();previewLengths();
  const adjustments=$('adjustments');
  if(adjustments)adjustments.ontoggle=()=>{
    guide();
    if(!adjustments.open||!adjustments.scrollIntoView)return;
    const seen=typeof document.visibilityState!=='string'||document.visibilityState==='visible';
    adjustments.scrollIntoView({behavior:smooth()&&seen?'smooth':'auto',block:'start'});
  };
  $('applyEdits').onclick=applyEdits;$('resetEdits').onclick=syncEdits;
  $('generate').onclick=generate;
  document.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{state.cancel=true;status('中止しています…','busy');overlayProgress('中止しています…',100,'','')});
  renderBrief();
  fillDetailLists();
  $('helpOpen').onclick=()=>showHelp(true);
  $('helpClose').onclick=()=>showHelp(false);
  document.querySelectorAll('[data-more]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openDetail(b.dataset.more)});
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeSheets);
  ['help','detail'].forEach(id=>{const o=$(id);if(o)o.onclick=e=>{if(e.target===o)closeSheets()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(!$('help').hidden||!$('detail').hidden))closeSheets()});
  // Build the context on the user's first touch of the page, while the gesture is still live.
  ['pointerdown','keydown'].forEach(type=>document.addEventListener(type,unlockAudio,{capture:true}));
  $('volume').oninput=e=>setVolume(Number(e.target.value)/100);
  $('play').onclick=()=>play();$('stop').onclick=()=>stopPlayback();
  const savers={wav:save,mp3:saveMp3,midi:saveMidi};
  document.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>{state.tourSaved=true;guide();return savers[b.dataset.save]()});
  $('compare').onclick=()=>compareEdit();$('undoEdit').onclick=()=>compareEdit(true);
  try{selfTest()}catch(e){console.error(e);status('内部テストに失敗しました','error')}
})();
