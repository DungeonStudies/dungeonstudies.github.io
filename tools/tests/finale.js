const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:760}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep=()=>Promise.resolve(); });
const bad=[];
const r = await p.evaluate(()=>{
  const out={};
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'x'}]; setRealmSilently('s1');
  App.character.classId='warrior';
  App.run = Object.assign(defaultRun(), {active:true, floor:100});
  partyInit(['warrior','mage','cleric']);
  App.run.floor = 100;
  out.pages = FINALE.length;
  startFinale();
  out.first = document.querySelector('.fin-text').textContent.trim();
  // walk the whole thing
  const seen = [];
  for(let i=0;i<FINALE.length;i++){
    const t = document.querySelector('.fin-text');
    if(!t){ out.brokeAt = i; break; }
    seen.push(t.textContent.trim());
    advanceFinale();
  }
  out.seen = seen;
  out.endsAt = App.dungeonView;
  out.runOver = App.run.active === false;
  return out;
});
console.log('  pages:', r.pages, '| ends at view:', r.endsAt, '| run closed:', r.runOver);
console.log('  first:', r.first);
console.log('  last three:', r.seen.slice(-3).join('  /  '));
if(r.brokeAt != null) bad.push('the finale broke at page '+r.brokeAt);
if(r.endsAt !== 'victory') bad.push('the finale did not end on the victory screen: '+r.endsAt);
if(!r.runOver) bad.push('the run was left active');
if(r.seen.length !== r.pages) bad.push('walked '+r.seen.length+' of '+r.pages+' pages');
if(!/Sarah/.test(r.seen.join(' '))) bad.push('the names never appear');
if(r.seen[r.seen.length-1] !== 'END') bad.push('it does not end on END');
// every page must carry a picture, and every picture must exist
const art = await p.evaluate(()=>FINALE.map(f=>f.art));
art.forEach((a,i)=>{ if(!a) bad.push('page '+i+' has no panel'); });
const missing = await p.evaluate(()=>FINALE.filter(f=>!FIN_ART[f.art]).map(f=>f.art));
if(missing.length) bad.push('panels that do not exist: '+[...new Set(missing)].join(', '));
console.log('  panels used:', [...new Set(art)].join(', '));
// screenshots of the beats that matter
for(const [i,name] of [[0,'fin_open'],[3,'fin_throne'],[7,'fin_rage'],[12,'fin_trap'],[15,'fin_becoming'],[20,'fin_whisper']]){
  await p.evaluate((k)=>{ App.finalePage=k; App.dungeonView='finale'; render(); }, i);
  await p.waitForTimeout(400);
  await p.screenshot({path:`/tmp/pw/${name}.png`});
}
console.log('problems:', bad.length?'\n  '+bad.join('\n  '):'none');
console.log('page errors:', errs.length?errs.join('\n'):'none');
await b.close();
process.exit(bad.length||errs.length?1:0);
})();
