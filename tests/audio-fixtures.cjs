// 試聴採用済みの原本を使う。現在の出力で期待値を自動生成しない。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fixtures={
 balance:['Claude outputs/balance-20260923/night-musicbox-B.wav','60671ef219202f7df34cb5d1bb6f82843b2364af5e0bf3ea53a24ee7c2ec7f54'],
 wonder:['Claude outputs/wonder-pad-correct-20260924/minus15/B.wav','919d9a2e79a5bce545b2fe8a40f8b4baf33e7d671683c2f4d37e288fff12b4ef']
};
module.exports=key=>{
 const [relative,expected]=fixtures[key],file=path.resolve(__dirname,'..',relative);
 if(!fs.existsSync(file))throw new Error(`採用WAVがありません: ${relative}。tests/README.md の手順で原本を配置してください（未検証をPASS扱いしません）。`);
 const data=fs.readFileSync(file),actual=crypto.createHash('sha256').update(data).digest('hex');
 if(actual!==expected)throw new Error(`採用WAVのSHA-256が不一致: ${relative} (${actual})。tests/README.md を確認してください。`);
 return data;
};
