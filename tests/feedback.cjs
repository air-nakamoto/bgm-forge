const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let payload,posts=0,cached=false;
const ctx={URL,Request,Response,Date,caches:{default:{match:async()=>cached,put:async()=>{}}},fetch:async(url,init)=>{assert.equal(url.searchParams.get('wait'),'true');payload=JSON.parse(init.body);posts++;return new Response('{}',{status:200})}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../worker/feedback.js'),'utf8').replace('export default','globalThis.worker ='),ctx);
const env={ALLOWED_ORIGINS:'https://example.test',DISCORD_WEBHOOK:'https://discord.invalid/test'};
const send=(body,origin='https://example.test')=>ctx.worker.fetch(new Request('https://worker.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
(async()=>{
 const colors=[];
 for(const type of ['bug','request','impression']){assert.equal((await send({type,text:'テスト @everyone <@123>',version:'2026.09.20.1',userAgent:'Browser',reply:true,contact:'test@example.test'})).status,200);const e=payload.embeds[0];colors.push(e.color);assert(e.title);assert(!e.description.includes('@everyone'));assert.equal(e.fields[0].value,'Browser');assert.equal(e.fields[1].value,'test@example.test');assert(e.footer.text.includes('2026.09.20.1'));assert.deepEqual(payload.allowed_mentions.parse,[])}
 assert.equal(new Set(colors).size,3);
 await send({text:'旧フォーム'});assert.equal(payload.embeds[0].fields.length,1);
 await send({type:'request',text:'本文',reply:false,contact:'送らない'});assert(!JSON.stringify(payload).includes('送らない'));
 for(const [body,status] of [[{text:'x',type:'__proto__'},400],[{text:'x',reply:true},400],[{text:'x',reply:true,contact:'x'.repeat(201)},400],[{text:'x'.repeat(2001)},413],[{text:''},400]]){const n=posts;assert.equal((await send(body)).status,status);assert.equal(posts,n)}
 let n=posts;assert.equal((await send({hp:'bot',text:'x'})).status,200);assert.equal(posts,n);
 assert.equal((await send({text:'x'},'https://other.test')).status,403);assert.equal(posts,n);
 cached=true;assert.equal((await send({text:'x'})).status,429);assert.equal(posts,n);
 console.log('PASS: feedback categories, embed, contact, legacy, validation, honeypot, origin and cooldown');
})().catch(e=>{console.error(e);process.exit(1)});
