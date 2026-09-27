const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
const root=path.join(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'bgm-forge-hosting-')),out=path.join(temp,'public');
try{
cp.execFileSync('python3',[path.join(root,'scripts/build_hosting.py'),'--output',out]);
const html=fs.readFileSync(path.join(root,'bgm_forge.html'),'utf8');
assert.equal(fs.readFileSync(path.join(out,'index.html'),'utf8'),html);
// Explicit outputs must not erase an existing directory.
const refused=cp.spawnSync('python3',[path.join(root,'scripts/build_hosting.py'),'--output',out],{encoding:'utf8'});
assert.equal(refused.status,2,'existing explicit output must be rejected');
assert.equal(fs.readFileSync(path.join(out,'index.html'),'utf8'),html,'rejected build preserves output');
for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
 const rel=m[1].split('?')[0];if(rel.includes(':'))continue;
 assert(fs.existsSync(path.join(out,rel)),`配信ファイル不足: ${rel}`);
}
for(const p of ['.git','worker','hosting','AGENTS.md','.dev.vars','favicon.png','scripts','tests'])assert(!fs.existsSync(path.join(out,p)),`公開対象外: ${p}`);
assert.equal(fs.readFileSync(path.join(out,'_redirects'),'utf8'),'/bgm_forge.html / 302\n/bgm_forge_v2.html / 302\n');
assert(fs.readFileSync(path.join(root,'worker/wrangler.toml'),'utf8').includes('https://bgm-forge.suihei.workers.dev'));
assert(!fs.readFileSync(path.join(out,'bgm_forge_standalone.html'),'utf8').includes("location.hostname==='air-nakamoto.github.io'"));
assert(fs.readFileSync(path.join(root,'hosting/wrangler.toml'),'utf8').includes('html_handling = "auto-trailing-slash"'));
console.log('PASS: hosting entry point, local assets, excluded files, old URLs, CORS and offline isolation');

}finally{fs.rmSync(temp,{recursive:true,force:true});}
