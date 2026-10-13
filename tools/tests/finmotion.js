const {chromium}=require('playwright');
const crypto=require('crypto');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:800}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'x'}]; setRealmSilently('s1');
  App.character.classId='warrior';
  App.run = Object.assign(defaultRun(), {active:true, floor:100});
  partyInit(['warrior','mage','cleric']);
});
const bad=[], rows=[];
const pages = await p.evaluate(()=>FINALE.map((f,i)=>[i, f.art]));
const seenArt = new Set();
for(const [i, art] of pages){
  if(seenArt.has(art)) continue;
  seenArt.add(art);
  await p.evaluate((k)=>{ App.finalePage=k; App.dungeonView='finale'; render(); }, i);
  await p.waitForTimeout(700);
  const el = await p.$('.fin-panel');
  const a = await el.screenshot();
  await p.waitForTimeout(1500);
  const c = await p.$('.fin-panel');
  const b2 = await c.screenshot();
  const h1 = crypto.createHash('md5').update(a).digest('hex').slice(0,8);
  const h2 = crypto.createHash('md5').update(b2).digest('hex').slice(0,8);
  // how many pixels actually changed between the two moments
  let diff = 0;
  const n = Math.min(a.length, b2.length);
  for(let k=0;k<n;k++) if(a[k] !== b2[k]) diff++;
  const info = await p.evaluate(()=>({
    layers: document.querySelectorAll('.fin-panel .fl-layer').length,
    moving: [...document.querySelectorAll('.fin-panel .fl-layer')]
              .filter(n=>getComputedStyle(n).animationName !== 'none').length,
    bits: document.querySelectorAll('.fin-panel .scene-life .lf').length,
  }));
  rows.push([art, info.layers, info.moving, info.bits, h1!==h2 ? 'MOVES' : 'still', diff]);
  if(art !== 'dark'){
    if(h1 === h2) bad.push(art+' does not move at all');
    if(info.layers < 2) bad.push(art+' is a single flat layer');
    if(info.moving < 1) bad.push(art+' has no animated layer');
  }
}
console.log('  panel      layers  animated  particles  1.5s apart');
rows.forEach(r=>console.log('  '+String(r[0]).padEnd(11)+String(r[1]).padEnd(8)+String(r[2]).padEnd(10)+String(r[3]).padEnd(11)+r[4]+' ('+r[5]+' bytes differ)'));
console.log('problems:', bad.length?'\n  '+bad.join('\n  '):'none');
console.log('page errors:', errs.length?errs.join('\n'):'none');
await b.close();
process.exit(bad.length||errs.length?1:0);
})();
