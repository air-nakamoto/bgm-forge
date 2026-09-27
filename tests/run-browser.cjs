// All selected tests run, and any failure makes the command fail.
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const group=process.argv[2];
if(group!==undefined&&group!=='audio'){
 console.error('Usage: node tests/run-browser.cjs [audio]');process.exit(1);
}
const tests=group==='audio'?['balance-audio','wonder-pad-audio']:['playback-clock','balance-audio','wonder-pad-audio'];
let failed=0;
for(const test of tests){
 console.log(`\n--- ${test} ---`);
 const result=spawnSync(process.execPath,[path.join(__dirname,test+'.cjs')],{stdio:'inherit'});
 if(result.error)console.error(result.error.message);
 if(result.status!==0)failed++;
}
console.log(`Browser tests: ${tests.length-failed}/${tests.length} PASS; ${failed} failed`);
process.exitCode=failed?1:0;
