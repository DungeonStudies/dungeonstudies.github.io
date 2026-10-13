const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:820}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,220)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep=()=>Promise.resolve(); });
const bad=[];
const r = await p.evaluate(async ()=>{
  const out={};
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'Cells divide by mitosis.'}]; setRealmSilently('s1');
  App.character.classId='warrior'; App.character.strength=400; App.character.maxHpBonus=300;
  App.run = Object.assign(defaultRun(), {active:true, floor:100, difficulty:'medium'});
  partyInit(['warrior','mage','cleric']);
  App.run.floor=100; App.run.monster=generateMonster(100,0);
  App.dungeonView='battle'; App.currentPhase='difficulty'; render();
  const m = App.run.monster;

  // 1. he is drawn on the hero rig, not the creature one
  out.sheet1 = monsterSheetId(m);
  out.usesHero = monsterSprite(m).indexOf('spr-idle') >= 0 || monsterSprite(m).indexOf('class="spr') >= 0;
  out.notCreature = !!HERO_SHEET.malakor && !!HERO_SHEET.malakor2;

  // 2. half health breaks the seals, once
  out.phaseBefore = m.phase;
  const atk0 = m.atk, spd0 = m.spd;
  m.hp = Math.round(m.maxHp*0.45);
  await checkBossPhase();
  out.phaseAfter = m.phase;
  out.sheet2 = monsterSheetId(m);
  out.harder = m.atk > atk0 && m.spd >= spd0;
  const atk1 = m.atk;
  await checkBossPhase();                       // must not fire twice
  out.noDouble = m.atk === atk1 && m.phase === 2;
  render();
  out.roomChanged = document.querySelector('.battle-scene').classList.contains('ph2');

  // 3. a fresh boss is back in phase one
  const fresh = generateMonster(100, 0);
  out.freshPhase = fresh.phase;
  out.freshSheet = monsterSheetId(fresh);

  // 4. beating him plays the death scene rather than cutting to loot
  m.hp = 0;
  await handleVictory();
  out.afterKill = App.dungeonView;
  out.gotLoot = (App.run.lastLoot||[]).length > 0;
  out.finalePage = App.finalePage;
  return out;
});
console.log('  sheet phase1:', r.sheet1, '-> phase2:', r.sheet2, '| both sheets present:', r.notCreature);
console.log('  phase', r.phaseBefore, '->', r.phaseAfter, '| hits harder:', r.harder, '| only once:', r.noDouble, '| room changed:', r.roomChanged);
console.log('  a fresh boss:', r.freshPhase, r.freshSheet);
console.log('  after the kill: view =', r.afterKill, '| loot rolled:', r.gotLoot);
if(r.sheet1 !== 'malakor') bad.push('phase 1 sheet is '+r.sheet1);
if(r.sheet2 !== 'malakor2') bad.push('phase 2 sheet is '+r.sheet2);
if(!r.notCreature) bad.push('the hero sheets are missing');
if(r.phaseAfter !== 2) bad.push('the seals never broke');
if(!r.harder) bad.push('phase 2 is not actually harder');
if(!r.noDouble) bad.push('the phase fired twice');
if(!r.roomChanged) bad.push('the room did not change with him');
if(r.freshPhase !== 1) bad.push('a fresh boss starts in phase '+r.freshPhase);
if(r.afterKill !== 'finale') bad.push('the kill did not reach the ending: '+r.afterKill);
if(!r.gotLoot) bad.push('the final floor dropped nothing');
// the freed line, and that it carries his sprite
const fin = await p.evaluate(()=>{
  const i = FINALE.findIndex(f=>/free/i.test(f.t));
  App.finalePage = i; App.dungeonView='finale'; render();
  return {i, text: document.querySelector('.fin-text').textContent.trim(),
          hero: !!document.querySelector('.fin-hero'),
          beforeLight: FINALE[i+1] && FINALE[i+1].art === 'light'};
});
console.log('  free line at page', fin.i+':', '"'+fin.text+'" | his sprite on it:', fin.hero, '| right before the light:', fin.beforeLight);
if(!/free/i.test(fin.text)) bad.push('no "free" line');
if(!fin.hero) bad.push('the free page does not show him');
if(!fin.beforeLight) bad.push('the free line is not right before the ending scene');
console.log('problems:', bad.length?'\n  '+bad.join('\n  '):'none');
console.log('page errors:', errs.length?[...new Set(errs)].join('\n'):'none');
await b.close();
process.exit(bad.length||errs.length?1:0);
})();
