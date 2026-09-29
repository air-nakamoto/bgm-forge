// Real keyboard events on the initialized split and standalone pages; never submit feedback.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const out=process.argv[2];if(out)fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const file of ['bgm_forge.html','bgm_forge_standalone.html'])for(const width of [390,820]){
  const p=await browser.newPage({viewport:{width,height:850}}),errors=[];
  p.on('pageerror',e=>errors.push(String(e)));await p.route(/^https?:/,route=>route.abort());
  await p.goto(pathToFileURL(path.resolve(__dirname,'..',file)).href);
  const targets=[['help','#helpOpen'],['detail','[data-more="about-scenes"]'],['license','#licenseOpen']];
  // The first two visible detail triggers must each receive focus back, not one hard-coded opener.
  const detailTriggers=await p.locator('[data-more]').evaluateAll(xs=>xs.filter(x=>!x.matches(':disabled')&&x.checkVisibility()).slice(0,2).map(x=>`[data-more="${x.dataset.more}"]`));
  targets.splice(1,1,...detailTriggers.map(s=>['detail',s]));
  assert(detailTriggers.length>=2,'exercise distinct detail openers');
  if(file==='bgm_forge.html'&&await p.locator('[data-feedback-open]').first().isVisible())targets.push(['feedback','[data-feedback-open]']);
  for(const [id,selector] of targets){
   const trigger=p.locator(selector).first();await trigger.focus();await p.keyboard.press('Enter');
   assert(await p.locator('#'+id).isVisible(),id+' '+selector+' opened');
   const check={file,width,id,selector,initial:await p.evaluate(id=>document.getElementById(id).contains(document.activeElement),id)};
   const focusEdge=async last=>p.evaluate(({id,last})=>{const box=document.getElementById(id),xs=[...box.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(x=>!x.matches(':disabled')&&x.tabIndex>=0&&x.checkVisibility());const x=xs[last?xs.length-1:0];x.focus();return xs.length},{id,last});
   const isEdge=async last=>p.evaluate(({id,last})=>{const xs=[...document.getElementById(id).querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')].filter(x=>!x.matches(':disabled')&&x.tabIndex>=0&&x.checkVisibility());return document.activeElement===xs[last?xs.length-1:0]},{id,last});
   await focusEdge(false);await p.keyboard.press('Shift+Tab');check.reverseWrap=await isEdge(true);
   await focusEdge(true);await p.keyboard.press('Tab');check.forwardWrap=await isEdge(false);
   if(id==='feedback'){
    await p.locator('#feedbackReply').check();await p.locator('#feedbackSend').evaluate(x=>x.disabled=true);
    await focusEdge(true);await p.keyboard.press('Tab');check.dynamic=await isEdge(false);
    await p.locator('#feedbackSend').evaluate(x=>x.disabled=false);
   }
   if(out&&selector===targets.find(x=>x[0]===id)?.[1])await p.screenshot({path:path.join(out,`${file}-${id}-${width}.png`)});
   await p.keyboard.press('Escape');check.escape=await p.locator('#'+id).isHidden();check.returnFocus=await trigger.evaluate(x=>document.activeElement===x);
   await trigger.focus();await p.keyboard.press('Enter');
   await p.locator('#'+id+' '+(id==='help'?'#helpClose':id==='feedback'?'[data-feedback-close]':'[data-close]')).first().click();
   check.closeButton=await p.locator('#'+id).isHidden()&&await trigger.evaluate(x=>document.activeElement===x);
   await trigger.focus();await p.keyboard.press('Enter');await p.locator('#'+id).click({position:{x:2,y:2}});
   check.backdrop=await p.locator('#'+id).isHidden()&&await trigger.evaluate(x=>document.activeElement===x);
   check.scroll=await p.evaluate(()=>document.body.style.overflow!=='hidden');results.push(check);
  }
  assert.deepEqual(errors,[],'no page errors');await p.close();
 }
 if(out)fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 const failures=results.flatMap(r=>Object.entries(r).filter(([,v])=>v===false).map(([k])=>`${r.file} ${r.width} ${r.id} ${r.selector}: ${k}`));
 console.log(JSON.stringify({cases:results.length,failures},null,2));assert.equal(failures.length,0,'dialog keyboard and focus checks');
 console.log('PASS: dialog keyboard, Escape, close/backdrop, focus restoration and dynamic fields');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
