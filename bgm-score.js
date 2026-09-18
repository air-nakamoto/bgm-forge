/* Shared deterministic score for audio and Standard MIDI File export. */
(function(root){
  'use strict';
  const RHYTHMS=[[1,1,1,1],[1.5,.5,1,1],[.5,.5,1,2],[1,.5,.5,2]];
  const ARPS=['up','down','bounce','pulse'];
  // 場面ごとの「手つき」。旋法と和音進行が違っても、伴奏の形と密度が同じだと同じ曲に聞こえる。
  // 2026-09-16の計測では、パッド/ベース/内声の音数が全18場面でほぼ同一だった（cv 0.06〜0.08）。
  // pad/inner に false を入れるとそのパートを鳴らさない。配列は figure の重み（従来の既定を置き換える）。
  const STYLES={
    full :{},
    hymn :{inner:false,pad:[[8,'hold'],[2,'swell']],bass:[[8,'hold'],[2,'two']]},
    walk :{pad:false,innerStep:.5,inner:[[5,'run'],[3,'off'],[2,'half']],
           bass:[[4,'walk'],[3,'two'],[2,'approach'],[1,'hold']]},
    drive:{innerStep:.5,pad:[[3,'half'],[3,'late'],[2,'hold'],[1,'swell']],
           bass:[[4,'pulse'],[3,'walk'],[2,'two'],[1,'approach']],inner:[[6,'run'],[2,'stab'],[2,'off']]},
    drift:{pad:[[4,'swell'],[3,'late'],[2,'hold'],[1,'half']],bass:[[6,'hold'],[2,'fifth'],[2,'two']],
           inner:[[4,'run'],[3,'off'],[3,'half']]},
    hush :{pad:[[7,'hold'],[2,'late'],[1,'swell']],bass:[[7,'hold'],[2,'two'],[1,'fifth']],
           inner:[[3,'half'],[3,'off'],[2,'run']]},
    rock :{innerStep:1,pad:[[6,'half'],[3,'hold'],[1,'late']],bass:[[6,'two'],[3,'hold'],[1,'fifth']],
           inner:[[4,'half'],[3,'off'],[2,'stab']]},
    stab :{pad:[[3,'late'],[3,'swell'],[2,'half'],[1,'hold']],bass:[[4,'pulse'],[3,'hold'],[2,'approach']],
           inner:[[4,'stab'],[3,'off'],[2,'half'],[1,'run']]}
  };
  const ACCOMPANIMENTS=[{id:'auto',name:'場面におまかせ'},{id:'up',name:'上がるアルペジオ'},{id:'wave',name:'行き来するアルペジオ'},{id:'pulse',name:'短い反復'},{id:'sparse',name:'余白のある分散和音'},{id:'chords',name:'和音をゆったり鳴らす'}];
  // Each scene has three coherent accompaniment gestures. Times are in beats;
  // harmony moves independently of the four-bar phrase, including slow pedals.
  const SCENES={
    casino: {inner:[[2/3,1,8/3,3],[1,5/3,2.5,11/3],[0,2/3,2,8/3,3.5]],comp:true,bass:['walk','march','fifth'],pad:[],padBars:1,hold:0,harmony:[1,1,2],high:74,gate:.22,drum:'swing'},
    bright: {inner:[[0,.75,2,2.75],[0,1.5,2.5],[.5,1,2.5,3]],bass:['fifth','walk','two'],pad:[0,2],padBars:2,hold:1.2,harmony:[1,1,2],high:72,gate:.48,drum:'light'},
    town:   {inner:[[2/3,1,5/3,3],[0,2/3,2,8/3],[1,5/3,3,11/3]],bass:['walk','fifth','walk'],pad:[],padBars:1,hold:0,harmony:[1,2,1],high:67,gate:.3,drum:'swing'},
    victory:{inner:[[0,1.5,2],[0,.5,2,3],[0,1,2.5]],bass:['march','fifth','march'],pad:[0,2],padBars:1,hold:1.5,harmony:[2,1,2],high:72,gate:.65,drum:'march'},
    wonder: {inner:[[.5,2.75],[1.25,3.5],[0,1.75,3]],bass:['pedal','hold','pedal'],pad:[0],padBars:2,hold:2.6,harmony:[2,4,2],high:79,gate:1.1,drum:'none'},
    night:  {inner:[[.5,1.75,3.25],[0,1.25,2.75],[.75,2,3.5]],bass:['fifth','two','hold'],bassHold:2.1,pad:[2],padBars:1,hold:1.2,harmony:[2,1,2],high:73,gate:.5,drum:'none'},
    calm:   {inner:[[0,1.5,2,3.5],[.5,1,2.5,3],[0,1,2,2.5,3.5]],bass:['two','walk','fifth'],pad:[0],padBars:2,hold:2.2,harmony:[1,2,1],high:71,gate:.5,drum:'swing'},
    solemn: {inner:[[],[],[]],bass:['hold','pedal','fifth'],pad:[0],padBars:1,hold:3.85,harmony:[2,4,1],high:69,gate:1,drum:'none'},
    mystic: {inner:[[.75,3.25],[1.5,2.75],[.25,2.5]],bass:['pedal','hold','pedal'],pad:[1],padBars:2,hold:6.8,harmony:[4,2,4],high:76,gate:.7,drum:'none'},
    sorrow: {inner:[[0,2.75],[.5,2],[1,3.25]],bass:['hold','fifth','hold'],pad:[0],padBars:1,hold:3.8,harmony:[2,1,2],high:67,gate:1.25,drum:'none'},
    memory: {inner:[[0,1.5,3],[.5,2,3.5],[0,.75,2.5]],bass:['fifth','two','walk'],pad:[2],padBars:2,hold:1.7,harmony:[1,2,2],high:69,gate:.6,drum:'none'},
    doubt:  {inner:[[.75,2.25,3.25],[.5,1.75,2.75],[.25,1.5,2.5,3.75]],bass:['pedal','hold','pedal'],bassBars:1,bassHold:3.6,pad:[0],padBars:2,hold:5.2,harmony:[2,4,2],high:74,gate:.7,drum:'ticks'},
    requiem:{inner:[[],[],[]],bass:['pedal','hold','pedal'],bassBars:1,bassHold:4,pad:[0],padBars:1,hold:4,harmony:[4,2,4],high:64,gate:1,drum:'none'},
    puzzle: {inner:[[0,.5,1.5,2.5],[.5,1,2,3.5],[0,1,1.5,3]],bass:['two','walk','fifth'],pad:[],padBars:1,hold:0,harmony:[2,1,2],high:70,gate:.28,drum:'ticks'},
    dark:   {inner:[[2.75],[.75],[1.25,3.5]],bass:['pedal','hold','pedal'],pad:[.5],padBars:2,hold:6.5,harmony:[4,2,4],high:62,gate:1.2,drum:'distant'},
    ritual: {inner:[[0,1.5,3],[0,1,2.5],[.5,2,3.5]],bass:['pedal','ritual','pedal'],pad:[0],padBars:2,hold:7.8,harmony:[4,2,4],high:65,gate:.65,drum:'ritual'},
    machine:{inner:[[0,.5,1,1.75,2.5,3],[0,.75,1.5,2,3,3.5],[0,.5,1.5,2.5,3.25]],bass:['motor','two','motor'],pad:[],padBars:1,hold:0,harmony:[2,4,2],high:66,gate:.22,drum:'motor'},
    chase:  {inner:[[0,.5,1,1.5,2,2.5,3,3.5],[0,.5,1.5,2,2.5,3.5],[0,.75,1.5,2,2.75,3.5]],bass:['motor','walk','motor'],pad:[0],padBars:2,hold:.9,harmony:[1,1,2],high:73,gate:.32,drum:'running'},
    tense:  {inner:[[0,.75,1.5,2.5,3],[0,.5,1.75,2.5,3.5],[0,1.5,2,2.75]],bass:['ritual','motor','march'],pad:[0,2.5],padBars:1,hold:.7,harmony:[1,2,1],high:67,gate:.35,drum:'battle'},
    horror: {inner:[[1.75],[3.25],[.5,2.75]],bass:['pedal','pedal','hold'],pad:[1.5],padBars:2,hold:5.8,harmony:[4,4,2],high:78,gate:.55,drum:'broken'}
  };
  const accompanimentFor=s=>s.accompaniment&&s.accompaniment!=='auto'?s.accompaniment:SCENES[s.moodId]?'scene':'legacy';
  const arrangementKey=s=>[s.moodId,s.arrangementVariant,s.harmonyEvery,s.accompaniment||'auto'].join(':');
  // Registers: the inner voice stays under the melody, the pad stays inside the sampled string range.
  const INNER_GAP=4,INNER_SPAN=11,PAD_LOW=55,PAD_HIGH=79;
  const STEPS=[-4,-3,-2,-2,-1,-1,1,1,2,2,3,4];
  const rng=seed=>{let a=seed|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
  const pick=(r,a)=>a[Math.floor(r()*a.length)];
  const pitch=(scale,d)=>scale[(d%7+7)%7]+12*Math.floor(d/7);
  const nearest=(values,target)=>values.reduce((a,b)=>Math.abs(b-target)<Math.abs(a-target)?b:a);
  function chordDegrees(d){return [d-7,d-5,d-3,d,d+2,d+4,d+7,d+9,d+11]}
  function identity(s){s.requestedLength=s.requestedLength||s.length;s.length=s.ending==='cadence'?s.requestedLength:loopLength(s.bpm,s.requestedLength,s.previewBars||s.themeBars);s.fingerprint=[s.root,s.mode,s.prog.join('.'),s.progB.join('.'),s.motif.join('.'),s.rhythmIndex,s.arpIndex,s.arrangementSeed,s.scene,s.drums,s.level,s.sound,s.ending,s.themeBars,s.phrasing,s.lead,s.bpm,s.length.toFixed(3),s.accompaniment||'auto',s.arrangementVariant,s.harmonyEvery].join('|');return s}

  // A 16-bar theme cannot be heard inside 25 beats, so the form follows the requested duration.
  function themeBarsFor(bpm,length){const beats=length*bpm/60;return beats>=64?16:beats>=32?8:beats>=16?4:2}

  function loopLength(bpm,length,bars=themeBarsFor(bpm,length)){
    const span=bars*4;
    return Math.max(1,Math.floor((length*bpm/60+1e-8)/span))*span*60/bpm;
  }

  // The walk reflects at both ends; a clamp would absorb at degree 0 and flatten the motif.
  function makeMotif(r){
    let best=null,bestScore=-1;
    for(let attempt=0;attempt<48;attempt++){
      const m=[pick(r,[0,2,4])];
      for(let i=1;i<8;i++){let n=m[i-1]+pick(r,STEPS);if(n<0)n=-n;if(n>9)n=18-n;m.push(n)}
      let run=0,maxRun=0;for(let i=1;i<8;i++){run=m[i]===m[i-1]?run+1:0;if(run>maxRun)maxRun=run}
      const span=Math.max.apply(null,m)-Math.min.apply(null,m),variety=new Set(m).size;
      let leap=false;for(let i=1;i<8;i++)if(Math.abs(m[i]-m[i-1])>=3)leap=true;
      if(span>=3&&variety>=4&&maxRun<=1&&leap)return m;
      const score=Math.min(span,7)+variety+(leap?2:0)-maxRun*3;
      if(score>bestScore){bestScore=score;best=m}
    }
    return best;
  }

  function compose(settings,seed){
    const r=rng(seed),m=settings.mood,idx=Math.floor(r()*m.progs.length);
    const prog=m.progs[idx].slice();
    // The second half of a 16-bar theme takes a different path so it is not a straight repeat.
    const progB=m.progs[m.progs.length>1?(idx+1+Math.floor(r()*(m.progs.length-1)))%m.progs.length:idx].slice();
    const motif=makeMotif(r);
    const s={seed,themeId:seed,arrangementSeed:seed,root:pick(r,m.roots),mode:m.mode,scale:settings.scale.slice(),prog,progB,motif,
      rhythmIndex:Math.floor(r()*4),arpIndex:Math.floor(r()*4),instrument:m.wave,
      drums:m.drums,defaultDrums:m.drums==='none'?'light':m.drums,bpm:settings.bpm,length:settings.length,
      themeBars:themeBarsFor(settings.bpm,settings.length),ending:settings.ending==='cadence'?'cadence':'loop',
      baseDensity:m.density||.55,density:densityFor(m.density,settings.phrasing),phrasing:settings.phrasing||'auto',lead:settings.lead!==false,
      accompaniment:settings.accompaniment||'auto',moodId:m.id,moodName:m.name,style:m.style||'full',sound:settings.sound||'samples',level:1,energy:typeof m.energy==='number'?m.energy:.55,scene:'theme',sceneName:'テーマ'};
    const profile=SCENES[m.id],variant=Math.floor(rng(seed^0x5343454E)()*3);
    s.arrangementVariant=variant;s.harmonyEvery=profile?profile.harmony[variant]:1;
    s.arp=ARPS[s.arpIndex];s.rhythm=RHYTHMS[s.rhythmIndex];s.melody=makeMelody(s);return identity(s);
  }

  // How much of the bar the tune sings. The rest belongs to the accompaniment.
  function densityFor(base,phrasing){const d=typeof base==='number'?base:.65;return phrasing==='sparse'?Math.max(.3,d*.7):phrasing==='dense'?Math.min(.95,d+.25):d}
  // How often each mode reaches past a bare triad.
  const COLOUR={
    ionian:[[5,'plain'],[2,'nine'],[2,'seven'],[1,'sus']],
    lydian:[[4,'plain'],[3,'nine'],[2,'seven'],[1,'sus']],
    mixolydian:[[5,'plain'],[3,'seven'],[1,'nine'],[1,'sus']],
    dorian:[[4,'plain'],[3,'seven'],[2,'nine'],[1,'sus']],
    aeolian:[[4,'plain'],[3,'seven'],[2,'nine'],[1,'sus']],
    phrygian:[[6,'plain'],[2,'sus'],[2,'seven']],
    harmonic:[[6,'plain'],[2,'seven'],[2,'sus']],
    locrian:[[6,'plain'],[3,'sus'],[1,'seven']]
  };
  function period(s){return Math.min(8,s.themeBars||16)}
  function chordAt(s,bar){
    if(s.harmonyEvery){
      // Retain the selected progression, including its opening and final chord.
      // A loop need not resolve to the tonic every four bars.
      const within=((bar%(s.themeBars||16))+(s.themeBars||16))%(s.themeBars||16);
      const useB=(s.themeBars||16)>=16&&within>=8;
      return (useB?s.progB:s.prog)[Math.floor((useB?within-8:within)/s.harmonyEvery)%4];
    }
    const p=period(s),within=((bar%p)+p)%p;
    if(within===p-1)return 0;
    if(within===p-2)return 4;
    const useB=(s.themeBars||16)>=16&&Math.floor(bar/8)%2===1&&s.progB;
    return (useB?s.progB:s.prog)[bar%4];
  }

  function makeMelody(s){
    const bars=s.themeBars,p=period(s),result=[],r=rng(s.seed^0x4D454C),density=s.density||.65;
    // Voice-leading state carried across bars: last note, last direction, whether a leap awaits its answer, run length.
    let previous=4,lastDir=0,owe=false,run=0;
    for(let bar=0;bar<bars;bar++){
      const chord=chordAt(s,bar),phraseBar=bar%4,response=bars>=8&&bar%8>=4,cadence=bar%p===p-1&&chord===0;
      const interlude=bars>=16&&bar>=8&&bar<12,development=bars>=16&&bar>=12;
      // A sparse line does not walk in on the downbeat: it lets the accompaniment set the scene
      // for half a bar first, which is what makes it sit under talking instead of leading it.
      const late=(s.phrasing==='sparse')&&bar===0&&!cadence;
      // Each 4-bar phrase: call / answer with breath / call again / close. The B section steps back.
      let shape;
      if(late)shape='long';
      else if(cadence)shape='cadence';
      else if(interlude)shape=phraseBar<2?'rest':'long';
      else if(phraseBar===0)shape='full';
      else if(phraseBar===1)shape=density>.75?'full':density>.55?'breath':density<.5&&r()<.5?'rest':'long';
      else if(phraseBar===2)shape=r()<density?'full':'breath';
      else shape=density<.45&&r()<.4?'rest':density>.7?'breath':'long';
      if(shape==='rest'){owe=false;run=0;continue}
      const rhythm=RHYTHMS[(s.rhythmIndex+(development&&bar%4===1?1:0))%4],cell=phraseBar%2?4:0;
      const count=shape==='full'?4:shape==='cadence'?2:shape==='breath'?3:density>.6?2:1;
      const barEnd=bar*4+4;let beat=bar*4+(late?2:0);
      for(let i=0;i<count;i++){
        let target=s.motif[cell+i]+(response?-1:0)+(development?2:0);
        target=Math.max(0,Math.min(10,target));
        const strong=i===0||Number.isInteger(beat/2),tones=chordDegrees(chord).filter(x=>x>=0&&x<=11);
        // A step toward `want`; on a strong beat it must be a chord tone, chosen on the side we are turning to.
        const stepTo=want=>{if(!strong)return want;const back=Math.sign(want-previous)||1;
          const near=tones.filter(x=>Math.abs(x-want)<=1);if(near.length)return nearest(near,want);
          const side=tones.filter(x=>back>0?x>previous&&x<=previous+2:x<previous&&x>=previous-2);if(side.length)return nearest(side,want);
          return tones.includes(previous)?previous:nearest(tones,want)};
        let d;
        if(shape==='cadence'){
          // Close on the tonic from a chord tone next door, never from across the octave.
          if(i===0)d=nearest([2,4,7,9].filter(x=>x<=11),previous);
          else d=nearest([0,7],previous);
        }else if(owe){
          // A leap owes a step back the other way (classical resolution).
          d=stepTo(Math.max(0,Math.min(11,previous-lastDir)));
        }else if(run>=3){
          // Three steps one way is enough; turn around.
          d=stepTo(Math.max(0,Math.min(11,previous-lastDir)));
        }else{
          d=strong?nearest(tones,target):target;
          if(Math.abs(d-previous)>4){
            const dir=Math.sign(d-previous)||1;
            if(strong){const side=tones.filter(x=>dir>0?x>previous:x<previous);d=nearest(side.length?side:tones,previous)}
            else d=Math.max(0,Math.min(11,previous+dir));
          }
        }
        const interval=d-previous,dir=Math.sign(interval);
        owe=Math.abs(interval)>=2;
        run=dir&&dir===lastDir?run+1:dir?1:0;
        if(dir)lastDir=dir;
        const last=i===count-1;
        // The last note of a phrase is held a little, then the tune actually stops.
        let duration=rhythm[i]*.84;
        if(last&&shape==='cadence')duration=Math.max(1,Math.min(2.2,barEnd-beat-1));
        else if(last&&shape==='breath')duration=Math.max(duration,Math.min(1.6,barEnd-beat-1.2));
        else if(last&&shape==='long')duration=count===1?2.2:Math.max(duration,Math.min(2,barEnd-beat-1));
        // The late entry still has to clear the next bar's downbeat.
        if(late)duration=Math.max(.6,Math.min(duration,barEnd-beat-.25));
        const contour=[78,70,82,68][phraseBar]+(development?4:0)+(i===0?4:0)+(last&&shape!=='full'?-4:0);
        result.push({part:0,pitch:60+s.root+pitch(s.scale,d),beat,duration,velocity:contour,pan:0});
        previous=d;beat+=rhythm[i];
      }
    }
    // The tune keeps its natural register; the inner voice is placed under it instead.
    s.melodyLow=result.reduce((a,n)=>Math.min(a,n.pitch),999);
    s.melodyShift=0;
    return result;
  }
  function remix(source,kind,seed){
    const s=JSON.parse(JSON.stringify(source));s.seed=seed;s.edit=kind;
    if(kind==='accompaniment'){s.arrangementVariant=((s.arrangementVariant||0)+1+(seed>>>0)%2)%3;s.arrangementSeed=seed;s.arpIndex=(s.arpIndex+1+seed%3)%4;s.arp=ARPS[s.arpIndex]}
    if(kind==='drums')s.drums=s.drums==='none'?s.defaultDrums:'none';
    if(kind==='quiet')s.level=Math.max(.2,s.level*.65);
    if(kind==='ending')s.ending=s.ending==='cadence'?'loop':'cadence';
    if(kind==='lead')s.lead=s.lead===false;
    return identity(s);
  }

  // A two-bar listening sample of the same theme, so a voice or a tempo can be judged in a second
  // instead of waiting for a whole take to render.
  function sample(source,settings){
    const s=JSON.parse(JSON.stringify(source));
    s.accompaniment=settings.accompaniment||source.accompaniment||'auto';
    s.sound=settings.sound;s.bpm=settings.bpm;s.ending='loop';s.edit='sample';
    if(settings.lead!==undefined)s.lead=settings.lead;
    if(settings.level!==undefined)s.level=settings.level;   // 曲の音量も試聴に乗せる（乗らないと音量を変えても同じ音が返る）
    if(settings.drums!==undefined)s.drums=settings.drums?(source.drums==='none'?source.defaultDrums:source.drums):'none';
    if(settings.phrasing&&settings.phrasing!==source.phrasing){
      const base=source.baseDensity||source.density||.55;
      s.baseDensity=base;s.phrasing=settings.phrasing;s.density=densityFor(base,s.phrasing);
      // The melody is rebuilt against the real theme length, then the sample keeps only its first two bars.
      s.melody=makeMelody({...s,seed:s.themeId});
      if(s.scene!=='theme')s.melody=sceneMelody(s.melody,s.scene);
    }
    s.previewBars=2;s.requestedLength=8*60/s.bpm;
    return identity(s);
  }
  // How long a sample runs, known before anything is rendered: two bars at the chosen tempo.
  function sampleSeconds(bpm){return 8*60/bpm}

  function adjust(source,settings){
    const s=JSON.parse(JSON.stringify(source));
    s.accompaniment=settings.accompaniment||source.accompaniment||'auto';
    s.sound=settings.sound;s.bpm=settings.bpm;s.requestedLength=settings.length;
    s.ending=settings.ending;s.lead=settings.lead;s.level=settings.level;
    s.drums=settings.drums?(source.drums==='none'?source.defaultDrums:source.drums):'none';
    if(settings.phrasing!==source.phrasing){
      const base=source.baseDensity||source.density||.55;
      s.baseDensity=base;s.phrasing=settings.phrasing;s.density=densityFor(base,s.phrasing);
      s.melody=makeMelody({...s,seed:s.themeId});
      if(s.scene!=='theme')s.melody=sceneMelody(s.melody,s.scene);
    }
    return identity(s);
  }

  // Scenes keep the theme's pitches and harmony but restate them differently.
  function sceneMelody(melody,id){
    if(id==='explore')return melody.filter(n=>Number.isInteger(n.beat/2)).map(n=>({...n,duration:Math.min(3.4,n.duration*2.2),velocity:Math.max(1,n.velocity-8)}));
    if(id==='ominous')return melody.map(n=>({...n,duration:Math.min(3.4,n.duration*1.25),velocity:Math.max(1,n.velocity-4)}));
    const out=[];
    for(const n of melody){
      if(n.duration>=.9){const half=n.duration/2;
        out.push({...n,duration:half*.86,velocity:Math.min(127,n.velocity+6)});
        out.push({...n,beat:n.beat+half,duration:half*.86,velocity:Math.min(127,n.velocity-2)});
      }else out.push({...n,velocity:Math.min(127,n.velocity+6)});
    }
    return out;
  }
  function scene(source,id,seed){
    const s=JSON.parse(JSON.stringify(source)),config={explore:['探索',60,.4,'none','up'],ominous:['不穏',76,.65,'heart','pulse'],battle:['戦闘',132,1,'drive','bounce']}[id];
    s.seed=seed;s.scene=id;s.sceneName=config[0];s.bpm=config[1];s.energy=config[2];s.drums=config[3];s.defaultDrums=s.drums==='none'?'light':s.drums;s.arp=config[4];s.arpIndex=ARPS.indexOf(s.arp);s.arrangementSeed=source.arrangementSeed;s.level=source.level;s.melody=sceneMelody(source.melody,id);delete s.edit;return identity(s);
  }

  function voiceChord(pitches,previous,next){
    const options=pitches.map(q=>{
      const pc=((q%12)+12)%12,out=[];
      for(let n=PAD_LOW;n<=PAD_HIGH;n++)if(n%12===pc)out.push(n);
      return out;
    });
    // Bidirectional distance works for both three- and four-note chords.
    const motion=(a,b)=>a.reduce((v,q)=>v+Math.min(...b.map(p=>Math.abs(q-p))),0)/a.length
      +b.reduce((v,q)=>v+Math.min(...a.map(p=>Math.abs(q-p))),0)/b.length;
    let best=null,bestCost=Infinity;
    const visit=(i,notes)=>{
      if(i<options.length){for(const q of options[i])visit(i+1,notes.concat(q));return}
      const v=notes.slice().sort((a,b)=>a-b);
      if(new Set(v).size!==v.length)return;
      const span=v[v.length-1]-v[0];
      let cost=previous?motion(v,previous)*2:Math.abs(v.reduce((a,b)=>a+b,0)/v.length-66)*.5;
      if(next)cost+=motion(v,next);
      cost+=Math.max(0,span-16)*.35+Math.max(0,7-span)*.5;
      // Avoid crowded low intervals without prohibiting intentional upper tensions.
      for(let j=1;j<v.length;j++)if(v[j]<65&&v[j]-v[j-1]<=2)cost+=2;
      if(cost<bestCost){bestCost=cost;best=v}
    };
    visit(0,[]);return best;
  }

  // Phrase-level gestures stay recognizable; rests and orchestration change on
  // the answer, rather than independently re-rolling every bar.
  function sceneAccompaniment(s,{bar,b,base,d,raw,inner,energy,chordFor,turn,add}){
    const c=SCENES[s.moodId],v=s.arrangementVariant||0,local=bar%(s.themeBars||16);
    const phrase=Math.floor(local/4),answer=local%4===3;
    const sparse=['wonder','mystic','dark','horror','doubt'].includes(s.moodId);
    const breath=sparse&&local%4===(v===1?1:3);
    const n=raw.length,vel=43+energy*17;
    if(bar%c.padBars===0){
      // Open fifths and wider spacing distinguish drones from tonal accompaniment.
      const pad=['dark','ritual'].includes(s.moodId)?[raw[0],raw[n-1]]:
        s.moodId==='horror'?[raw[0],Math.min(PAD_HIGH,raw[0]+1),raw[n-1]]:raw;
      for(const at of c.pad)pad.forEach((q,j)=>add(1,q,b+at,c.hold,vel-4+j*2,(j/(pad.length-1||1)-.5)*.9));
    }
    const root=base-12+pitch(s.scale,d),fifth=base-12+pitch(s.scale,d+4);
    const bass=c.bass[v],bv=53+energy*18;
    if(bass==='pedal'){
      if(local%(c.bassBars||2)===0)add(2,base-12,b,c.bassHold||7.8,bv-8);
    }else if(bass==='hold')add(2,root,b,c.bassHold||3.85,bv);
    else if(bass==='walk'){
      [root,base-12+pitch(s.scale,d+2),fifth,base-12+pitch(s.scale,chordFor(bar+1))].forEach((q,k)=>add(2,q,b+k,.82,bv-(k?7:0)));
    }else{
      const times=bass==='motor'?[0,.5,1,1.5,2,2.5,3,3.5]:bass==='ritual'?[0,1.5,3]:bass==='march'?[0,1,2,3]:[0,2];
      times.forEach((at,k)=>add(2,bass==='fifth'&&k%2?fifth:root,b+at,bass==='motor'?.34:bass==='ritual'?.7:bass==='march'?.75:1.7,bv-(k%2?7:0)));
    }
    if(!breath){
      const times=c.inner[v],orders=[[0,2,1,2],[2,1,0,1],[0,1,2,1]],order=orders[v];
      times.forEach((at,k)=>{
        // The answer leaves room; it does not append a new tune.
        if(answer&&times.length>2&&k===times.length-1)return;
        const index=(order[k%4]+(phrase%2&&v===2?1:0))%inner.length;
        const q=inner[index];
        add(3,q,b+at,Math.min(c.gate,4-at),32+energy*17+(k===0?5:-2)+(phrase%2?-3:0),k%2?.3:-.3);
        if(c.comp)add(3,inner[(index+1)%inner.length],b+at,Math.min(c.gate,4-at),28+energy*15,k%2?.15:-.15);
      });
    }
    if(s.moodId==='wonder'&&turn){
      // A fading scene still needs a handoff into the next downbeat. Anticipate
      // the opening harmony quietly instead of leaving a near-silent last bar.
      const next=chordFor(bar+1);
      const arrival=voiceChord([next,next+2,next+4].map(x=>base+pitch(s.scale,x)),raw,null);
      arrival.forEach((q,j)=>add(1,q,b+2,2,vel-10,(j-1)*.35));
      add(2,base-12+pitch(s.scale,next),b+2,1.9, bv-12);
    }
    if(s.drums==='none')return;
    // An explicitly enabled drum part on a quiet scene gets a restrained pulse.
    const kind=c.drum==='none'?'light':c.drum;
    const hit=(pitch,at,velocity,duration=.2)=>add(4,pitch,b+at,duration,velocity);
    const kicks={march:[0,2],ritual:[0,1.5,3],motor:[0,1,2,3],running:[0,1.5,2.5],battle:[0,.75,2.5],swing:[0],ticks:[],light:[],distant:[0],broken:[.5,2.75]};
    if((kind==='distant'&&local%2)|| (kind==='broken'&&local%4!==v))return;
    for(const at of kicks[kind]||[])hit(36,at,kind==='distant'||kind==='broken'?42:64,.4);
    if(kind==='running'||kind==='battle'||kind==='march'){
      for(const at of kind==='march'?[1,3]:kind==='battle'?[1.5,3.5]:[1,3])hit(38,at,54);
      const hats=kind==='march'?[.5,2.5]:kind==='battle'?[0,.75,1.5,2.5,3.25]:[0,.5,1,1.5,2,2.5,3,3.5];
      hats.forEach((at,k)=>hit(42,at,k%2?26:36,.12));
      if(answer)hit(38,3.75,42,.12);
    }else if(kind==='motor')for(const at of [.5,1.5,2.5,3.5])hit(42,at,32,.1);
    else if(kind==='swing')for(const at of [2/3,5/3,8/3,11/3])hit(54,at,29,.15);
    else if(kind==='ticks')for(const at of [.5,2,3.5])hit(54,at,26,.12);
    else if(kind==='light')for(const at of [1,3])hit(54,at,29,.18);
  }

  function events(s){
    const total=s.ending==='cadence'?s.length*s.bpm/60:Math.round(s.length*s.bpm/60),base=48+s.root,notes=[],random=rng(s.arrangementSeed);
    const loop=s.ending!=='cadence',bars=s.themeBars||16,p=period(s),lastBar=Math.max(0,Math.floor((total-.5)/4));
    // Drummers are neither flat nor exactly on the grid. Measured on the Groove MIDI Dataset
    // (Magenta, CC BY 4.0): velocity spread 28-40, timing spread about 21ms once each file's own
    // latency is removed, and 16ths about 8ms late. Applied at about a third of that here, because
    // this plays under conversation rather than as a drum track. Seeded, so takes stay reproducible.
    const human=rng((s.arrangementSeed||1)*7+13);
    const gauss=()=>{let x=0;for(let i=0;i<4;i++)x+=human();return (x-2)*1.732};
    const humanize=(beat,velocity)=>{
      if(s.humanize===false)return [beat,velocity];
      const sub=Math.abs(beat*2-Math.round(beat*2))>1e-6;   // a 16th between the 8ths
      const ms=gauss()*9+(sub?5:0);
      const v=velocity+gauss()*14-(sub?8:0);
      return [Math.max(0,Math.min(total-1e-3,beat+ms*s.bpm/60000)),Math.max(1,v)];
    };
    const add=(part,pitch,beat,duration,velocity,pan=0)=>{if(part===4){const h=humanize(beat,velocity);beat=h[0];velocity=h[1]}duration=Math.min(duration,total-beat);if(beat>=total||duration<=0)return;notes.push({part,pitch,beat,duration,velocity:Math.max(1,Math.round(velocity*s.level)),pan})};
    const chordFor=bar=>(!loop&&bar>=lastBar)?0:chordAt(s,bar);
    // Weighted choice so each bar picks a figure instead of repeating one forever.
    const pickW=table=>{let t=0;for(const row of table)t+=row[0];let x=random()*t;for(const row of table){x-=row[0];if(x<=0)return row[1]}return table[table.length-1][1]};
    const barCount=Math.max(1,Math.ceil(total/4));
    const style=STYLES[s.style]||STYLES.full,pattern=accompanimentFor(s);
    const phraseVariant=bar=>Math.floor(bar/4)%2;
    // A loop has no ending. Its last bar is a turnaround: it keeps playing and leans on the downbeat
    // that follows, instead of thinning out like a cadence and leaving a hole at the seam.
    const turnBar=loop&&!s.previewBars&&barCount>1?barCount-1:-1;
    let previousPad=null,firstPad=null;
    for(let bar=0;bar<barCount;bar++){
      const b=bar*4,d=chordFor(bar),pos=bar%4,turn=bar===turnBar,cadence=bar%p===p-1&&!turn;
      const section=Math.floor(bar/Math.min(8,bars))%2,cycle=Math.floor(bar/bars),variant=cycle%4;
      const energy=s.energy*(section?1:.82)*[1,.86,1.08,.94][variant];
      // Plain triads everywhere is the flattest sound there is; each bar can take a colour tone.
      let colour=pickW(cadence?[[7,'plain'],[2,'sus'],[1,'seven']]:COLOUR[s.mode]||[[6,'plain'],[2,'seven'],[1,'nine'],[1,'sus']]);
      // A suspension replaces the third. Preserve the locked melody by avoiding
      // an unprepared third/suspension overlap, including notes held across a bar.
      if(colour==='sus'&&s.lead!==false){
        const third=((base+pitch(s.scale,d+2))%12+12)%12;
        const start=(bar%bars)*4;
        if(s.melody.some(n=>n.pitch%12===third&&n.beat<start+4&&n.beat+n.duration>start))colour='plain';
      }
      const degrees=colour==='seven'?[d,d+2,d+4,d+6]:colour==='nine'?[d,d+2,d+4,d+8]:colour==='sus'?[d,d+3,d+4]:[d,d+2,d+4];
      // Search actual voicings rather than choosing an inversion from the seed.
      // Every chord member stays inside the declared pad register.
      const inversion=(s.arrangementSeed+Math.floor(bar/4))%3;
      const raw=voiceChord(degrees.map(x=>base+pitch(s.scale,x)),previousPad,
        turn?firstPad:null);
      if((style.pad!==false||pattern==='chords')&&(variant!==3||turn)&&(pattern==='legacy'||pattern==='chords'||pos!==1)){previousPad=raw;if(!firstPad)firstPad=raw}
      const lift=0;
      // The inner voice sits in one closed octave, always a clear gap below the tune.
      const innerHigh=s.lead===false&&SCENES[s.moodId]?SCENES[s.moodId].high:(s.melodyLow||72)-INNER_GAP,innerLow=innerHigh-INNER_SPAN;
      const inner=degrees.map(x=>{let q=base+pitch(s.scale,x);while(q<innerLow)q+=12;while(q>innerHigh)q-=12;return q}).sort((a,b)=>a-b);

      if(pattern==='scene'){
        sceneAccompaniment(s,{bar,b,base,d,raw,inner,energy,chordFor,turn,add});
        previousPad=raw;if(!firstPad)firstPad=raw;
        continue;
      }

      // Pad: the chord does not restrike identically every bar.
      if((style.pad!==false||pattern==='chords')&&(variant!==3||turn)){
        const vel=(45+energy*16)*(pattern!=='legacy'&&pattern!=='chords'?.6:1),n=raw.length,pan=j=>(n>1?j/(n-1)*2-1:0)*.6;
        const shape=turn?'hold':pickW(pos===0?[[7,'hold'],[2,'half'],[1,'late']]
          :cadence?[[3,'hold'],[3,'half'],[2,'swell'],[2,'rest']]
          :pos===3?[[4,'hold'],[3,'half'],[2,'swell'],[1,'rest']]
          :style.pad||[[6,'hold'],[2,'half'],[2,'late'],[1,'swell']]);
        if(pattern!=='legacy'&&pattern!=='chords'){
          // Let the arpeggio speak; the pad answers rather than covering every attack.
          if(pos===0)raw.forEach((q,j)=>add(1,q,b,1.5,vel,pan(j)));
          else if(pos===2||pos===3)raw.forEach((q,j)=>add(1,q,b+3,1,vel-3,pan(j)));
        }
        else if(turn)raw.forEach((q,j)=>{add(1,q+lift,b,2,vel-3,pan(j));add(1,q+lift,b+2,2,vel,pan(j))});
        else if(shape==='hold')raw.forEach((q,j)=>add(1,q+lift,b,3.85,vel,pan(j)));
        else if(shape==='half')raw.forEach((q,j)=>add(1,q+lift,b,1.9,vel,pan(j)));
        else if(shape==='late')raw.forEach((q,j)=>add(1,q+lift,b+1,2.85,vel-3,pan(j)));
        else if(shape==='swell'){raw.forEach((q,j)=>add(1,q+lift,b,1.4,vel-3,pan(j)));raw.forEach((q,j)=>add(1,q+lift,b+2,1.8,vel,pan(j)))}
      }

      // Bass: never silent, but the figure moves and the phrase end aims at the next chord.
      const root=base-12+pitch(s.scale,d),fifth=base-12+pitch(s.scale,d+4),bassVel=58+energy*16;
      const figure=turn?'approach':pickW(energy>.8?[[4,'pulse'],[3,'two'],[2,'fifth'],[2,'approach']]
        :pos===3?[[2,'hold'],[2,'two'],[4,'approach']]
        :style.bass||[[5,'hold'],[3,'two'],[2,'fifth']]);
      if(figure==='walk'){
        // 4分で歩くベース。根音→三度→五度→次の和音への接近音。街・思索・回想の推進力はこれが担う。
        const third=base-12+pitch(s.scale,d+2),next=chordFor(bar+1);
        const lead=base-12+pitch(s.scale,next+(random()<.5?-1:1));
        [root,third,fifth,lead].forEach((q,k)=>add(2,q,b+k,.9,bassVel-(k?7:0)));
      }
      else if(figure==='two'){add(2,root,b,1.7,bassVel);add(2,root,b+2,1.7,bassVel-6)}
      else if(figure==='fifth'){add(2,root,b,1.7,bassVel);add(2,fifth,b+2,1.7,bassVel-6)}
      else if(figure==='pulse'){add(2,root,b,1.7,bassVel);add(2,root,b+2,1.7,bassVel-4)}
      else if(figure==='approach'){
        add(2,root,b,2.7,bassVel);
        const next=chordFor(bar+1);
        add(2,base-12+pitch(s.scale,next+(random()<.5?-1:1)),b+3.5,turn?.5:.45,bassVel-12);
      }else add(2,root,b,3.7,bassVel);

      // Keep one gesture across a four-bar phrase; only its ending varies.
      if(pattern!=='legacy'&&pattern!=='chords'){
        const slow=pattern==='sparse',step=slow?1:pattern==='pulse'?.5:1;
        const order=pattern==='up'?[0,1,2,3]:pattern==='pulse'?[0,2,0,1]:[0,1,2,1];
        const rising=[...new Set(inner)];
        const times=pattern==='up'?(rising.length===3?[0,1,2.5]:[0,1,2,3]):slow?(phraseVariant(bar)?[.5,2.5]:[0,2.5]):Array.from({length:4/step},(_,i)=>i*step);
        times.forEach((at,k)=>{
          if(pos===3&&!turn&&k===times.length-1)return;
          if(variant===1&&!turn&&k%2===1)return;
          const q=pattern==='up'?rising[Math.min(k,rising.length-1)]:inner[order[k%4]%inner.length];
          add(3,q,b+at,slow?.8:step*.82,32+energy*16+(k===0?5:0),k%2?.35:-.35);
        });
      }
      // Inner voice: a small vocabulary of bar figures rather than one loop.
      if(pattern==='legacy'&&style.inner!==false&&(variant!==1||turn)){
        const order=s.arp==='down'?[2,1,0,1]:s.arp==='bounce'?[0,1,2,1]:s.arp==='pulse'?[0,2,0,1]:[0,1,2,0];
        let step=style.innerStep||(energy<.5?1:energy>.85?.5:1);if(variant===2&&step>.5)step=.5;
        // Plucked voices cannot sustain, so the turnaround subdivides: a fresh attack keeps arriving up to the seam.
        if(turn&&step>.5)step=.5;
        const vel=()=>35+energy*19+random()*5;
        const fig=turn?'run':pickW(cadence?[[3,'run'],[3,'half'],[3,'rest'],[1,'stab']]
          :pos===3?[[4,'run'],[2,'half'],[2,'off'],[2,'stab']]
          :style.inner||[[7,'run'],[2,'half'],[1,'off']]);
        if(fig==='run'||fig==='half'){
          const limit=fig==='half'?2:4;
          for(let k=0;k*step<limit;k++){
            if(cadence&&k*step>=2)continue;
            add(3,inner[(order[k%4]+inversion)%inner.length],b+k*step,turn?step*.98:step*.8,vel(),k%2?.5:-.5);
          }
        }else if(fig==='off'){
          for(let k=0;k<3;k++)add(3,inner[(order[k%4]+inversion)%inner.length],b+1+k,.7,vel()-4,k%2?.5:-.5);
        }else if(fig==='stab')inner.forEach((q,j)=>add(3,q,b,1.6,vel()-2,(j-1)*.3));
      }

      // Drums: dropouts and a fill at the end of the phrase.
      if(s.drums!=='none'){
        const fill=turn||(pos===3&&random()<.55);
        if(s.drums==='drive'){
          for(let k=0;k<8;k++){if(fill&&k>=6)continue;if(random()<.08)continue;add(4,42,b+k*.5,.16,k%2?30:44,.2)}
          add(4,36,b,.4,75);add(4,36,b+2,.4,64);add(4,38,b+1,.3,60);add(4,38,b+3,.3,66);
          if(bar%8===0)add(4,49,b,1.8,42,-.25);
          if(fill){add(4,38,b+3.25,.2,52);add(4,38,b+3.5,.2,60);add(4,38,b+3.75,.2,68)}
        }else if(s.drums==='heart'){add(4,36,b,.4,62);add(4,36,b+.5,.3,38);add(4,36,b+2,.4,55);if(fill)add(4,36,b+2.5,.3,36)}
        else if(s.drums==='pulse'){add(4,36,b,.5,54);if(fill)add(4,36,b+3,.4,40)}
        else{add(4,54,b+1,.2,38,.2);add(4,54,b+3,.2,34,.2);if(fill)add(4,54,b+3.5,.2,30,.2)}
      }
    }
    const span=bars*4;
    if(s.lead!==false){
      const closing=s.melody[s.melody.length-1];
      for(let cycle=0;cycle*span<total;cycle++){
        const lift=[0,-4,6,2][cycle%4],closes=loop&&(cycle+1)*span>=total;
        for(const n of s.melody){
          const beat=n.beat+cycle*span;if(!loop&&beat>=lastBar*4)continue;
          add(n.part,n.pitch,beat,closes&&n===closing?Math.max(n.duration,total-beat):n.duration,Math.max(1,n.velocity+lift),n.pan);
        }
      }
    }
    // A cadence ends the piece; a loop keeps playing so the seam has no gap in level.
    if(!loop&&s.lead!==false)add(0,60+s.root+(s.melodyShift||0),lastBar*4,Math.max(.15,total-lastBar*4-.35),72);
    notes.sort((a,b)=>a.beat-b.beat||a.part-b.part||a.pitch-b.pitch);
    const last=new Map();for(const n of notes){const key=n.part+':'+n.pitch,q=last.get(key);if(q&&q.beat+q.duration>n.beat)q.duration=n.beat-q.beat;last.set(key,n)}
    return notes.filter(n=>n.duration>0);
  }
  const api={ACCOMPANIMENTS,accompanimentFor,arrangementKey,compose,remix,adjust,sample,sampleSeconds,scene,events,chordAt,identity,themeBarsFor,loopLength,registers:{INNER_GAP,INNER_SPAN,PAD_LOW,PAD_HIGH}};
  if(typeof module!=='undefined')module.exports=api;else root.BGMScore=api;
})(typeof window!=='undefined'?window:this);
