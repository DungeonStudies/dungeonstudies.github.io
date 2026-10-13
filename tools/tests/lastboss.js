const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:800}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,200)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
const bad=[];
// --- the entrance, watched in real time ---
await p.evaluate(()=>{
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'Cells divide by mitosis.'}]; setRealmSilently('s1');
  App.character.classId='warrior'; App.character.strength=200; App.character.maxHpBonus=200;
  App.run = Object.assign(defaultRun(), {active:true, floor:100, difficulty:'medium'});
  partyInit(['warrior','mage','cleric']);
  App.run.floor=100; App.run.monster=generateMonster(100,0);
  App.dungeonView='battle'; App.currentPhase='entrance'; App.__life=null; App.__entranceError=null;
  render();
  window.__ent = playBossEntrance(100);
});
const lines=[];
for(let i=0;i<46;i++){
  await p.waitForTimeout(500);
  const t = await p.evaluate(()=>{
    const n=document.querySelector('.be-line'); return n?n.textContent.trim():null;
  });
  if(t && lines[lines.length-1]!==t) lines.push(t);
  if(i===6) await p.screenshot({path:'/tmp/pw/lb_line.png'});
}
await p.evaluate(()=>window.__ent);
await p.waitForTimeout(400);
await p.screenshot({path:'/tmp/pw/lb_after.png'});
console.log('  lines heard:'); lines.forEach(l=>console.log('    "'+l+'"'));
const st = await p.evaluate(()=>({
  err: App.__entranceError ? String(App.__entranceError) : null,
  name: App.run.monster.name, fam: App.run.monster.family, sprite: App.run.monster.arche,
  hidden: !!document.querySelector('.be-hidden'), host: !!document.querySelector('.bossent'),
}));
console.log('  boss:', st.name, '|', st.fam, '| sprite:', st.sprite, '| err:', st.err);
const want = ['I have been waiting for you, conqueror.',
              'A thousand years of boredom in this dungeon.',
              'Will you entertain me before I end your life?',
              'Shall we begin.'];
want.forEach(w=>{ if(!lines.includes(w)) bad.push('never said: '+w); });
if(lines.indexOf('Shall we begin.') !== lines.length-1) bad.push('"Shall we begin." was not last');
if(st.sprite !== 'primordial') bad.push('the last boss is still a '+st.sprite);
if(st.fam !== 'Demon') bad.push('family is '+st.fam);
if(st.err) bad.push('entrance error: '+st.err);
if(st.hidden) bad.push('he never became visible');
if(st.host) bad.push('the cutscene host was left behind');

// --- the attack effects ---
const fx = await p.evaluate(async ()=>{
  window.sleep=()=>Promise.resolve();
  App.currentPhase='postattack';
  const before = document.querySelectorAll('.tw-seal').length;
  towerLurch(getBattleEls(), true);
  await new Promise(r=>setTimeout(r,80));
  const sc = document.querySelector('.battle-scene');
  return {seals: document.querySelectorAll('.tw-seal').length - before,
          heave: sc.classList.contains('tw-heave'),
          only: isPrimordial(App.run.monster) && !isPrimordial({isFinal:false})};
});
console.log('  attack fx: seals', fx.seals, '| scene heaves:', fx.heave, '| final-boss only:', fx.only);
if(fx.seals < 5) bad.push('the seals did not tear up: '+fx.seals);
if(!fx.heave) bad.push('the tower did not move');
if(!fx.only) bad.push('the effect is not limited to the last boss');
await p.screenshot({path:'/tmp/pw/lb_fx.png'});
console.log('problems:', bad.length?'\n  '+bad.join('\n  '):'none');
console.log('page errors:', errs.length?[...new Set(errs)].join('\n'):'none');
await b.close();
process.exit(bad.length||errs.length?1:0);
})();
