const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:850}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,200)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep = ()=>Promise.resolve(); });
const out = await p.evaluate(async ()=>{
  const bad=[], notes=[];
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'Cells divide by mitosis. DNA carries genes. Enzymes are catalysts.'}];
  setRealmSilently('s1'); App.character.classId='warrior';
  App.character.strength=200; App.character.maxHpBonus=120;

  // 1. never before floor 31, and the deep-only ones never before 61
  for(let f=1; f<31; f++){
    App.run = Object.assign(defaultRun(), {active:true, floor:f});
    for(let i=0;i<300;i++) if(rollOmen(f)) { bad.push('omen fired on floor '+f); break; }
  }
  for(let f=31; f<61; f++){
    App.run = Object.assign(defaultRun(), {active:true, floor:f});
    for(let i=0;i<200;i++){ const o = rollOmen(f);
      if(o && OMENS[o].min > f) bad.push('floor '+f+' rolled '+o+' (min '+OMENS[o].min+')'); }
  }
  // 2. the rate is roughly what it says it is
  const rate = (f, n)=>{ App.run = Object.assign(defaultRun(), {active:true, floor:f});
    let hit=0; for(let i=0;i<n;i++) if(rollOmen(f)) hit++; return hit/n*100; };
  const r40 = rate(40, 20000), r80 = rate(80, 20000);
  notes.push('omen rate  f40 '+r40.toFixed(1)+'%   f80 '+r80.toFixed(1)+'%');
  if(Math.abs(r40-9) > 1.2) bad.push('mid-floor omen rate is '+r40.toFixed(1)+'%');
  if(Math.abs(r80-13) > 1.4) bad.push('deep omen rate is '+r80.toFixed(1)+'%');

  // 3. every omen actually does what its card says
  const setFloor=(f,id)=>{
    App.run = Object.assign(defaultRun(), {active:true, floor:f, difficulty:'medium'});
    App.run.monster = generateMonster(f, 0);
    const st=combatStats(); App.run.hp=st.maxHp; App.run.maxHp=st.maxHp;
    App.run.omen = id; return st;
  };
  // bloodmoon
  setFloor(70, null); const atk0 = monsterAtk();
  App.run.omen='bloodmoon'; const atk1 = monsterAtk();
  if(!(atk1 > atk0*1.3)) bad.push('blood moon did not raise its attack: '+atk0+' -> '+atk1);
  // witchlight
  setFloor(70, null); const c0 = combatStats().critChance;
  App.run.omen='witchlight'; const c1 = combatStats().critChance;
  if(c1 - c0 !== Math.min(25, 90-c0)) bad.push('witchlight crit: '+c0+' -> '+c1);
  // thinveil, and the button must agree with it
  const st2 = setFloor(70, null);
  const sk = currentSkillSet().filter(Boolean)[0];
  const v0 = damageBreakdown(sk, combatStats(), App.run.monster).est;
  App.run.omen='thinveil';
  const bd = damageBreakdown(sk, combatStats(), App.run.monster);
  if(!(bd.est > v0)) bad.push('thin veil did not raise the estimate');
  if(!bd.parts.some(x=>x.label==='Thin Veil')) bad.push('thin veil is not named in the chain');
  // quickening
  setFloor(70, 'quickening'); App.run.energy=0; startNewTurn();
  if(App.run.energy !== 2) bad.push('quickening gave '+App.run.energy+' energy, not 2');
  setFloor(70, null); App.run.energy=0; startNewTurn();
  if(App.run.energy !== 1) bad.push('a plain turn gave '+App.run.energy+' energy, not 1');

  // 4. gravecache and thewatcher land during startFloor, not after
  let gotCache=false, gotWatch=false;
  const realRoll = rollOmen;
  for(const id of ['gravecache','thewatcher']){
    window.rollOmen = ()=>id;
    App.run = Object.assign(defaultRun(), {active:true, floor:70});
    App.dungeonView='battle'; startFloor(70);
    if(id==='gravecache'){
      gotCache = App.run.energy === combatStats().energyMax && App.run.shieldPct === 0.35;
      if(!gotCache) bad.push('grave cache gave energy '+App.run.energy+' shield '+App.run.shieldPct);
    } else {
      const m = App.run.monster;
      gotWatch = m.braced === 1 && m.kit.length > 0;
      if(!gotWatch) bad.push('the watcher left it braced='+m.braced+' kit='+m.kit.length);
    }
  }
  window.rollOmen = realRoll;

  // 5. the nemesis: never below 56, never a boss, and worth the trouble
  for(let f=41; f<56; f++){
    for(let i=0;i<120;i++) if(generateMonster(f,0).nemesis) { bad.push('nemesis on floor '+f); break; }
  }
  let nem=null, tries=0;
  while(!nem && tries++ < 4000){ const g = generateMonster(78, 0); if(g.nemesis) nem = g; }
  if(!nem) bad.push('never rolled a nemesis in 4000 tries at floor 78');
  else {
    const plain = generateMonster(78, 0);
    if(!(nem.maxHp > plain.maxHp*1.8)) bad.push('nemesis health '+nem.maxHp+' vs plain '+plain.maxHp);
    if((nem.gear||[]).length !== 4) bad.push('nemesis is not fully armoured');
    if(!/,\s/.test(nem.name)) bad.push('nemesis has no title: '+nem.name);
    if(nem.wits !== 1) bad.push('nemesis wits '+nem.wits);
    notes.push('nemesis    '+nem.name+'  hp '+nem.maxHp+' (plain '+plain.maxHp+')  kit '+nem.kit.join('/'));
  }
  for(const f of [60,70,80,90,100]){
    for(let i=0;i<400;i++) if(generateMonster(f,0).nemesis && isBossFloor(f)) { bad.push('boss floor '+f+' rolled a nemesis'); break; }
  }
  return {bad, notes};
});
out.notes.forEach(n=>console.log('  '+n));
// the card itself has to appear on screen
const card = await p.evaluate(async ()=>{
  App.run = Object.assign(defaultRun(), {active:true, floor:70});
  App.run.monster = generateMonster(70,0);
  App.dungeonView='battle'; App.currentPhase='difficulty'; render();
  App.run.omen='bloodmoon'; showOmenCard();
  const c = document.querySelector('.omen-card');
  return c ? c.textContent.replace(/\s+/g,' ').trim() : 'NO CARD';
});
console.log('  card       '+card);
console.log('problems:', out.bad.length ? '\n  '+out.bad.slice(0,20).join('\n  ') : 'none');
console.log('page errors:', errs.length?errs.join('\n'):'none');
await b.close();
process.exit(out.bad.length||errs.length||card==='NO CARD'?1:0);
})();
