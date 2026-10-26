const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1100,height:950}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,220)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep = ()=>Promise.resolve(); });
const out = await p.evaluate(async ()=>{
  const bad=[], notes=[];
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'Cells divide by mitosis. DNA carries genes. Enzymes are catalysts. ATP stores energy.'}];
  setRealmSilently('s1');
  const ch = App.character;
  ['warrior','mage','cleric'].forEach(c=>{ let g=0; while(ch.classProgress[c].level < 12 && g++<300){ const was=ch.classId; ch.classId=c; grantXp(600); ch.classId=was; } });

  // 1. a run takes three, each with their own health
  startRun(['warrior','mage','cleric']);
  if(partyList().join() !== 'warrior,mage,cleric') bad.push('party is '+partyList().join());
  if(partyActiveId() !== 'warrior') bad.push('the first pick is not leading: '+partyActiveId());
  const hpOf = c => heroState(c).hp;
  const maxOf = c => heroState(c).maxHp;
  if(maxOf('warrior') === maxOf('mage')) bad.push('warrior and mage share a max HP');
  notes.push('party     warrior '+maxOf('warrior')+'hp · mage '+maxOf('mage')+'hp · cleric '+maxOf('cleric')+'hp');

  // 2. the bench takes no damage
  App.run.hp = Math.round(App.run.maxHp*0.5);
  const mageBefore = hpOf('mage');
  App.run.monster.hp = 99999; App.run.monster.maxHp = 99999;
  await resolveMonsterHit();
  if(hpOf('mage') !== mageBefore) bad.push('the bench took damage');
  if(App.run.hp >= App.run.maxHp*0.5) bad.push('the front line took none');

  // 3. switching costs the turn and hands over the health
  const warriorHp = App.run.hp, monHp = App.run.monster.hp;
  const ok = await switchHero('mage');
  if(!ok) bad.push('could not switch to the mage');
  if(partyActiveId() !== 'mage') bad.push('after switching we are '+partyActiveId());
  if(App.character.classId !== 'mage') bad.push('classId did not follow the switch');
  if(heroState('warrior').hp !== warriorHp) bad.push('the warrior’s health was not stowed: '+heroState('warrior').hp+' vs '+warriorHp);
  if(App.run.maxHp !== maxOf('mage')) bad.push('maxHp did not become the mage’s');
  if(App.run.monster.hp !== monHp) bad.push('switching damaged the monster');
  if(App.run.hp >= maxOf('mage')) bad.push('the monster did not get its free swing at the mage');
  notes.push('switch    warrior stowed at '+warriorHp+', mage stepped up and was hit down to '+App.run.hp+'/'+App.run.maxHp);
  if(canSwitchTo('mage')) bad.push('can switch to whoever is already out front');

  // 4. a knockout falls back instead of ending the run
  App.run.hp = 1;
  App.run.monster.atk = 9999;
  await resolveMonsterHit();
  if(App.dungeonView === 'death') bad.push('one knockout ended the whole run');
  if(!heroState('mage').down) bad.push('the mage is not marked down');
  if(partyActiveId() === 'mage') bad.push('a downed hero is still out front');
  if(canSwitchTo('mage')) bad.push('you can bring a downed hero back mid-floor');
  notes.push('knockout  mage down, '+CLASSES[partyActiveId()].name+' took over, run still going');

  // 5. the last one standing ends it
  let guard=0;
  while(heroesAlive().length > 1 && guard++ < 10){ App.run.hp = 1; await resolveMonsterHit(); }
  App.run.hp = 1;
  App.run.featherUsed = true;
  await resolveMonsterHit();
  if(App.dungeonView !== 'death') bad.push('the party wiped and the run continued: view='+App.dungeonView);
  notes.push('wipe      all three down -> death screen');

  // 6. the fallen get up on the next floor, at a fraction
  startRun(['warrior','mage','cleric']);
  heroState('mage').hp = 0; heroState('mage').down = true;
  heroState('cleric').hp = 5;
  startFloor(2);
  if(heroState('mage').down) bad.push('the mage did not get up on the next floor');
  const want = Math.round(maxOf('mage')*PARTY_REVIVE_PCT);
  if(Math.abs(heroState('mage').hp - want) > 1) bad.push('revived at '+heroState('mage').hp+', wanted '+want);
  if(heroState('cleric').hp !== 5) bad.push('a hurt hero was healed for free between floors');
  notes.push('next floor mage back up at '+heroState('mage').hp+'/'+maxOf('mage')+', cleric still on 5');

  // 7. resting reaches the bench
  const c0 = heroState('cleric').hp;
  doFloorRest();
  if(!(heroState('cleric').hp > c0)) bad.push('resting did not reach the bench: '+c0+' -> '+heroState('cleric').hp);
  notes.push('rest      benched cleric '+c0+' -> '+heroState('cleric').hp);

  // 8. the weaknesses are real code
  App.character.classId='rogue';
  App.run = Object.assign(defaultRun(), {active:true, floor:50, difficulty:'medium'});
  App.run.monster = generateMonster(50,0); App.run.monster.weak=[]; App.run.monster.resist=[];
  const st=combatStats(); App.run.hp=st.maxHp; App.run.maxHp=st.maxHp;
  App.run.dots = [];
  const sk = currentSkillSet().filter(Boolean)[0];
  const cold = damageBreakdown(sk, combatStats(), App.run.monster);
  App.run.dots = [{type:'bleed', turnsLeft:3, perTurn:5}];
  const warm = damageBreakdown(sk, combatStats(), App.run.monster);
  if(!(warm.est > cold.est)) bad.push('the rogue is not cold without a wound: '+cold.est+' vs '+warm.est);
  if(!cold.parts.some(x=>x.label==='No wound open')) bad.push('the rogue penalty is not on the button');
  notes.push('rogue     '+cold.est+' with nothing open -> '+warm.est+' with one wound');
  if(Object.keys(CLASS_WEAKNESS).length !== 5) bad.push('not every class has a weakness');
  return {bad, notes};
});
out.notes.forEach(n=>console.log('  '+n));
// the picker and the bench have to actually render
const ui = await p.evaluate(()=>{
  App.topTab='play';
  openPartyPicker();
  const picker = document.body.innerText.indexOf('WHO GOES DOWN') >= 0;
  const cards = document.querySelectorAll('.party-card').length;
  startRun(['warrior','mage','cleric']);
  App.dungeonView='battle'; App.currentPhase='skillmenu'; render();
  const bench = document.querySelectorAll('.benchbtn').length;
  return {picker, cards, bench};
});
console.log('  ui        picker='+ui.picker+'  cards='+ui.cards+'  bench buttons='+ui.bench);
const uiBad = [];
if(!ui.picker) uiBad.push('the party picker did not render');
if(ui.cards !== 5) uiBad.push('the picker shows '+ui.cards+' classes');
if(ui.bench !== 2) uiBad.push('the bench shows '+ui.bench+' heroes');
console.log('problems:', (out.bad.length+uiBad.length) ? '\n  '+out.bad.concat(uiBad).slice(0,20).join('\n  ') : 'none');
console.log('page errors:', errs.length?[...new Set(errs)].join('\n'):'none');
await b.close();
process.exit(out.bad.length||uiBad.length||errs.length?1:0);
})();
