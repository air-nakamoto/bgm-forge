// Read-only completeness check for scripts/audit_audio.cjs outputs.
// Exit 0: recorded checks pass; 1: failed/stale; 2: missing/incomplete.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
function inspect(dir){
 const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
 const score=read('score.json'),meta=read('meta.json');
 if(!Number.isInteger(score.cases)||score.cases<=0||!Array.isArray(score.errors))throw Error('invalid score report');
 if(!Number.isInteger(meta.cases)||meta.cases<=0)return {status:'INCOMPLETE',reason:'empty or invalid selection',exit:2};
 if(!fs.existsSync(path.join(dir,'audio.json')))return {status:'INCOMPLETE',expected:meta.cases,received:0,exit:2};
 const rows=read('audio.json');if(!Array.isArray(rows))throw Error('invalid audio report');
 const problems=[];
 if(score.errors.length)problems.push('score errors');
 for(const file of ['bgm-score.js','bgm-forge.js']){
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
  if(meta.sourceHashes?.[file]!==hash)problems.push('source mismatch: '+file);
 }
 const keys=new Set();
 for(const r of rows){
  const key=JSON.stringify([r.group,r.id,r.seed,r.length||30,r.ending,r.lead,r.sound]);
  if(keys.has(key))problems.push('duplicate case: '+key);keys.add(key);
  if(r.error||!['seconds','peak','rms','nonfinite','notes'].every(k=>Number.isFinite(r[k]))||r.nonfinite!==0||r.peak>1||r.peak<0||r.rms<=1e-7||r.seconds<=0||r.notes<=0)problems.push('invalid audio: '+key);
 }
 if(rows.length>meta.cases)problems.push('unexpected extra results');
 const completion=fs.existsSync(path.join(dir,'completion.json'))?read('completion.json'):null;
 if(completion&&(completion.exitCode!==0||completion.expected!==meta.cases||completion.rendered!==rows.length||completion.failures!==0))problems.push('completion failure or count mismatch');
 return {status:problems.length?'FAIL':rows.length===meta.cases?'RECORDED_CHECKS_PASS':'INCOMPLETE',expected:meta.cases,received:rows.length,problems,processExit:completion?completion.exitCode:'not recorded by legacy audit; verify separately',listening:'not assessed',exit:problems.length?1:rows.length===meta.cases?0:2};
}
if(require.main===module){
 try{if(!process.argv[2])throw Error('usage: node scripts/check_audit_result.cjs OUTPUT_DIR');const report=inspect(path.resolve(process.argv[2]));console.log(JSON.stringify(report,null,2));process.exitCode=report.exit;}
 catch(e){console.error('INCOMPLETE: '+e.message);process.exitCode=2;}
}
module.exports={inspect};
