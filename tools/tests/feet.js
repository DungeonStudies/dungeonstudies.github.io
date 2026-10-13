const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:820}});
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep=()=>Promise.resolve(); });
const bad = [];
for(const f of [100, 95, 50]){
  const r = await p.evaluate((floor)=>{
    App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'x'}]; setRealmSilently('s1');
    App.character.classId='warrior';
    App.run = Object.assign(defaultRun(), {active:true, floor, difficulty:'medium'});
    partyInit(['warrior','mage','cleric']);
    App.run.floor=floor; App.run.monster=generateMonster(floor,0);
    App.dungeonView='battle'; App.currentPhase='difficulty'; App.__life=null; render();
    const hb = document.querySelector('.combatant.player .sprite-box').getBoundingClientRect();
    const mb = document.querySelector('.combatant.monster .sprite-box').getBoundingClientRect();
    return {floor, name:App.run.monster.name,
            heroBottom:Math.round(hb.bottom), monBottom:Math.round(mb.bottom),
            heroH:Math.round(hb.height), monH:Math.round(mb.height),
            gap: Math.round(hb.bottom - mb.bottom)};
  }, f);
  console.log(`  f${r.floor} ${r.name.slice(0,26).padEnd(27)} hero foot y=${r.heroBottom} (h${r.heroH})  monster foot y=${r.monBottom} (h${r.monH})  off by ${r.gap}px`);
  /* The big bosses keep a deliberate nudge so an enormous sprite does not look
     like it is sinking into the floor. Anything the hero's size stands level. */
  const allowed = r.monH > 200 ? 6 : 0;
  if(Math.abs(r.gap) > allowed) bad.push(`f${r.floor} ${r.name} is ${r.gap}px off the floor (allowed ${allowed})`);
}
console.log('problems:', bad.length ? '\n  '+bad.join('\n  ') : 'none');
await b.close();
process.exit(bad.length ? 1 : 0);})();
