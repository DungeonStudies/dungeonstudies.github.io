const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const ctx=await b.newContext({viewport:{width:1100,height:900}});
const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,200)));
const bad=[];

// ---- 1. play the REAL build and leave a save behind ----
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(async ()=>{
  window.sleep=()=>Promise.resolve();
  App.subjects=[{id:'real',name:'RealRealm',icon:'📕',notes:'Real notes here.'}];
  setRealmSilently('real');
  App.character.classId='cleric';
  App.character.gems = 7;
  App.character.highestFloor = 33;
  await saveCharacter();
  await Storage.set('subjects', App.subjects);
  await Storage.set('profileId', 'real');
});
const realKeys = await p.evaluate(()=>Object.keys(localStorage).filter(k=>k.indexOf('sd_')===0).sort());
const realSnap = await p.evaluate(()=>localStorage.getItem('sd_profiles'));
console.log('  real build wrote:', realKeys.join(', ') || '(nothing)');
if(!realKeys.length) bad.push('the real build wrote no localStorage at all');

// ---- 2. now the TEST build, same browser profile, same origin ----
await p.goto('file:///home/user/Study-dungeon/index-test.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.waitForTimeout(250);
const panel = await p.evaluate(()=>!!document.getElementById('devpanel'));
if(!panel) bad.push('the test panel did not appear');
const banner = await p.title();
if(!/TEST BUILD/.test(banner)) bad.push('the tab does not say it is a test build: '+banner);
console.log('  test build title:', banner, '| panel:', panel);

const r = await p.evaluate(async ()=>{
  const out = {};
  window.sleep=()=>Promise.resolve();
  App.subjects=[{id:'t',name:'TestRealm',icon:'🧪',notes:'Cells divide by mitosis. DNA carries genes.'}];
  setRealmSilently('t');
  App.character.classId='warrior';
  await Storage.set('subjects', App.subjects);

  // instant kill takes the real victory path
  devFloor(45);
  out.floor = App.run.floor;
  out.monster = App.run.monster.name;
  const gold0 = App.run.gold||0;
  await devKill();
  out.afterKill = App.dungeonView;         // should be the loot screen
  out.gotLoot = (App.run.lastLoot||[]).length;
  out.gold = (App.run.gold||0) > gold0;

  // god mode
  continueAfterLoot();
  devFloor(60);
  DEV.god = true;
  App.run.monster.atk = 99999;
  for(let i=0;i<4;i++) await resolveMonsterHit();     // four lethal swings
  out.godHeld = App.run.active && App.dungeonView !== 'death'
                && heroesAlive().length === partyList().length;
  out.godTopped = App.run.hp === combatStats().maxHp;
  DEV.god = false;
  App.run.featherUsed = true;
  for(let i=0;i<6 && App.dungeonView!=='death';i++) await resolveMonsterHit();
  out.godOffHurts = App.dungeonView === 'death';
  // back to a live floor for the rest of the kit
  App.run.active = true; devFloor(62);

  // the rest of the kit
  devHeal(); out.healed = App.run.hp === combatStats().maxHp;
  const lv0 = classProg().level; devLevels(10); out.levelled = classProg().level > lv0;
  devGear(); out.geared = !!getEquippedItem('weapon') && getEquippedItem('weapon').rarity==='legendary';
  devRich(); out.rich = App.character.gems >= 500;
  // --- always-correct: a wrong answer must be taken as right ---
  devFloor(47);
  // a faster monster opens the floor, and that async strike clears
  // lastAnswerCorrect underneath us - slow it down so the test is testing
  // always-correct and not a race
  App.run.monster.spd = 1;
  await new Promise(r=>setTimeout(r, 60));
  DEV.autoCorrect = true;
  App.currentPhase='difficulty'; chooseDifficulty('hard');
  const q = App.currentQuestion;
  const wrong = q.options ? q.options.find(o=>o!==q.correct) : 'nonsense answer';
  const combo0 = App.run.combo||0;
  await submitAnswer(wrong);
  out.autoRight = App.lastAnswerCorrect === true;
  out.autoPhase = App.currentPhase;                 // correct opens the skill menu
  out.autoCombo = (App.run.combo||0) > combo0;      // and it counted for real
  DEV.autoCorrect = false;
  App.currentPhase='difficulty'; chooseDifficulty('hard');
  const q2 = App.currentQuestion;
  const wrong2 = q2.options ? q2.options.find(o=>o!==q2.correct) : 'nonsense answer';
  await submitAnswer(wrong2);
  out.autoOff = App.lastAnswerCorrect === false;

  // --- skip to the next boss floor ---
  devFloor(43); devBoss(); out.boss1 = App.run.floor;
  devBoss(); out.boss2 = App.run.floor;
  devFloor(97); devBoss(); out.bossCap = App.run.floor;
  out.bossIsBoss = isBossFloor(out.boss1) && App.run.monster.isBoss;

  devFloor(62);
  devOmen('bloodmoon'); out.omen = App.run.omen;
  devNemesis(); out.nemesis = !!App.run.monster.nemesis; out.nemName = App.run.monster.name;
  await saveCharacter(); await saveRun();
  return out;
});
console.log('  kill      floor', r.floor, '·', r.monster, '-> view:', r.afterKill, '· loot lines:', r.gotLoot, '· gold up:', r.gold);
console.log('  god       survived 4 lethal swings:', r.godHeld, '· topped up:', r.godTopped, '· off again = death:', r.godOffHurts);
console.log('  kit       heal:', r.healed, 'levels:', r.levelled, 'gear:', r.geared, 'rich:', r.rich, 'omen:', r.omen);
console.log('  auto      wrong answer taken as right:', r.autoRight, '· phase:', r.autoPhase, '· combo counted:', r.autoCombo, '· off again:', r.autoOff);
console.log('  boss      43 ->', r.boss1, '->', r.boss2, '| 97 ->', r.bossCap, '| really a boss:', r.bossIsBoss);
console.log('  nemesis  ', r.nemName);
if(r.afterKill !== 'loot') bad.push('instant kill did not reach the loot screen: '+r.afterKill);
if(!r.gotLoot) bad.push('instant kill dropped nothing');
if(!r.godHeld) bad.push('god mode did not hold');
if(!r.godTopped) bad.push('god mode did not restore health');
if(!r.godOffHurts) bad.push('god mode could not be turned off');
['healed','levelled','geared','rich','nemesis'].forEach(k=>{ if(!r[k]) bad.push(k+' did not work'); });
if(r.omen !== 'bloodmoon') bad.push('forcing an omen failed');
if(!r.autoRight) bad.push('always-correct did not make a wrong answer right');
if(r.autoPhase !== 'skillmenu') bad.push('always-correct did not open the skill menu: '+r.autoPhase);
if(!r.autoCombo) bad.push('always-correct did not count as a real correct answer');
if(!r.autoOff) bad.push('always-correct could not be turned off');
if(r.boss1 !== 50) bad.push('from floor 43 the next boss was '+r.boss1);
if(r.boss2 !== 60) bad.push('from floor 50 the next boss was '+r.boss2);
if(r.bossCap !== 100) bad.push('from floor 97 the next boss was '+r.bossCap);
if(!r.bossIsBoss) bad.push('the boss floor did not field a boss');

// ---- 3. the whole point: the real save must be untouched ----
const keys = await p.evaluate(()=>({
  real: Object.keys(localStorage).filter(k=>k.indexOf('sd_')===0).sort(),
  test: Object.keys(localStorage).filter(k=>k.indexOf('sdtest_')===0).sort(),
}));
console.log('  keys      real:', keys.real.join(', '), '| test:', keys.test.join(', '));
if(!keys.test.length) bad.push('the test build wrote nothing to its own keys');
const realNow = await p.evaluate(()=>localStorage.getItem('sd_profiles'));
if(realNow !== realSnap) bad.push('THE TEST BUILD CHANGED THE REAL SAVE');

// ---- 4. and the real build still sees its own world ----
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.waitForTimeout(400);
const back = await p.evaluate(async ()=>({
  subjects: (await Storage.get('subjects', [])).map(s=>s.name),
  hasPanel: !!document.getElementById('devpanel'),
  hasDev: typeof DEV !== 'undefined',
}));
console.log('  real again: realms =', back.subjects.join(','), '| panel present:', back.hasPanel);
if(back.subjects.indexOf('TestRealm') >= 0) bad.push('the test realm leaked into the real build');
if(back.subjects.indexOf('RealRealm') < 0) bad.push('the real build lost its own realm');
if(back.hasPanel || back.hasDev) bad.push('the cheat panel is in the real build');

console.log('problems:', bad.length ? '\n  '+bad.join('\n  ') : 'none');
console.log('page errors:', errs.length?[...new Set(errs)].join('\n'):'none');
await b.close();
process.exit(bad.length||errs.length?1:0);
})();
