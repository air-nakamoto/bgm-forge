// Build a local listening page and verify exported PCM WAVs after a completed audit.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {inspect}=require('./check_audit_result.cjs');
const dir=path.resolve(process.argv[2]||'');
const report=inspect(dir);assert.equal(report.exit,0,JSON.stringify(report));
const completion=JSON.parse(fs.readFileSync(path.join(dir,'completion.json')));
assert.equal(completion.exitCode,0);
const rows=JSON.parse(fs.readFileSync(path.join(dir,'audio.json')));
const names={wonder:'幻想',doubt:'疑惑',ethnic:'民族',chase:'追跡',puzzle:'思索',horror:'恐怖'};
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let wavCount=0;
for(const r of rows){
 assert(Number.isFinite(r.seconds)&&r.seconds>=r.requestedLength-1/44100,'short audio');
 if(!r.wav)continue;
 const b=fs.readFileSync(path.join(dir,r.wav));
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
 assert.equal(b.readUInt32LE(4)+8,b.length);assert.equal(b.readUInt16LE(20),1);
 assert.equal(b.readUInt16LE(22),2);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);
 assert.equal(b.readUInt32LE(40)+44,b.length);assert(Math.abs((b.length-44)/176400-r.seconds)<1/44100);wavCount++;
 const side=4*176400,seam=Buffer.concat([b.subarray(0,44),b.subarray(b.length-side),b.subarray(44,44+side)]);
 seam.writeUInt32LE(seam.length-8,4);seam.writeUInt32LE(seam.length-44,40);
 fs.writeFileSync(path.join(dir,r.wav.replace('.wav','-seam.wav')),seam);
}
const summary={...report,wavsVerified:wavCount,peakMax:Math.max(...rows.map(r=>r.peak)),rmsMin:Math.min(...rows.map(r=>r.rms)),rmsMax:Math.max(...rows.map(r=>r.rms)),maxSilentSeconds:Math.max(...rows.map(r=>r.maxSilentSeconds)),scope:'fresh composition, defaults (selected cases use recorded lead settings), loop; not edited, MP3, browser playback or subjective quality'};
fs.writeFileSync(path.join(dir,'summary.json'),JSON.stringify(summary,null,2));
const cards=rows.filter(r=>r.wav).map(r=>`<section><h2>${names[r.id]} · 指定${r.length}秒 / 実尺${r.seconds.toFixed(2)}秒</h2><p>seed ${r.seed} · ${escape(r.sound)} · 旋律なし</p><audio controls loop preload="none" src="${escape(r.wav)}"></audio><p>全曲はループ再生。下は末尾4秒＋先頭4秒の抜粋で、4秒位置が継ぎ目です。追加フェード・音量調整なし。</p><audio controls preload="none" src="${escape(r.wav.replace('.wav','-seam.wav'))}"></audio><p>チェック：場面らしさ ／ 音量・耳障りさ ／ 展開 ／ 継ぎ目</p><p>判定・違和感の秒位置は listening.csv に記録してください。</p></section>`).join('\n');
fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BGM Forge 品質試聴</title><style>body{max-width:900px;margin:40px auto;padding:0 20px;background:#f7f6f2;color:#222;font:16px/1.7 system-ui}section{padding:20px;margin:20px 0;background:white;border:1px solid #ddd;border-radius:12px}audio{width:100%}h2{font-size:20px}a{color:#245b86}</style><h1>BGM Forge 品質試聴</h1><p>自動測定 ${rows.length}件、WAV構造確認 ${wavCount}件。人間の品質判定は未実施です。</p><p>最初は各場面60秒を1曲ずつ聴き、次に90秒・120秒の展開と継ぎ目へ進んでください。同じ機器・再生音量で比較し、15〜30分を目安に休憩してください。</p><p>表示される音源は保存済みの${wavCount}曲です。対象の場面・尺・seedは各欄と全件測定値を確認してください。各曲の全体音量を揃える追加処理はしていません。</p><p><a href="listening.csv" download>試聴記録CSV</a> · <a href="summary.json">測定要約</a> · <a href="audio.json">全件測定値</a></p>${cards}</html>`);
if(fs.existsSync(path.join(dir,'sections.html'))){
 const index=path.join(dir,'index.html');
 fs.writeFileSync(index,fs.readFileSync(index,'utf8').replace('<h1>','<p><a href="sections.html">休止・復帰・展開の区間試聴を開く</a></p><h1>'));
}
// Keep any listening decisions the user has already recorded.
if(!fs.existsSync(path.join(dir,'listening.csv')))fs.writeFileSync(path.join(dir,'listening.csv'),'scene,requested_seconds,actual_seconds,seed,sound,status,issue_seconds,notes\n'+rows.filter(r=>r.wav).map(r=>[names[r.id],r.length,r.seconds,r.seed,r.sound,'NOT_LISTENED','',''].join(',')).join('\n')+'\n');
console.log(JSON.stringify(summary,null,2));
