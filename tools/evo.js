const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:820}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep=()=>Promise.resolve(); });

const r = await p.evaluate(()=>{
  App.subjects=[{id:'s',name:'T',icon:'📘',notes:'x'}]; setRealmSilently('s');
  App.run=Object.assign(defaultRun(),{active:true,floor:40,difficulty:'medium'});
  partyInit(['warrior']);
  const m = App.run.monster = generateMonster(40,0);
  const before = {name:m.name, arche:m.arche, maxHp:m.maxHp, atk:m.atk, def:m.def, spd:m.spd};
  m.hp = Math.round(m.maxHp*0.2);                 // under 30%
  const couldAt20 = canEvolve();
  const hpBefore = m.hp;
  const res = evolveMonster();
  const after = {name:m.name, arche:m.arche, maxHp:m.maxHp, hp:m.hp, atk:m.atk, def:m.def, spd:m.spd};
  return {before, after, couldAt20, hpBefore, res,
          healedFraction: (after.hp - hpBefore) / after.maxHp,
          twiceCheck: canEvolve()};
});
console.log('same creature :', r.before.arche, '->', r.after.arche, r.before.arche===r.after.arche ? '(unchanged ✔)' : '(CHANGED ✘)');
console.log('name          :', r.before.name, '->', r.after.name);
console.log('max hp        :', r.before.maxHp, '->', r.after.maxHp, `(x${(r.after.maxHp/r.before.maxHp).toFixed(2)})`);
console.log('hp            :', r.hpBefore, '->', r.after.hp, `— healed ${(r.healedFraction*100).toFixed(0)}% of its max`);
console.log('not back to full:', r.after.hp < r.after.maxHp);
console.log('stats         : atk', r.before.atk,'->',r.after.atk, '| def', r.before.def,'->',r.after.def, '| spd', r.before.spd,'->',r.after.spd);
console.log('only once     :', r.twiceCheck === false);

// bosses never evolve, at any health
const boss = await p.evaluate(()=>{
  const out=[];
  [10,50,100].forEach(f=>{
    App.run.floor=f; const m=App.run.monster=generateMonster(f,0);
    m.hp=Math.round(m.maxHp*0.05);
    out.push(`f${f} ${m.name}${m.isBoss?' [boss]':''} -> canEvolve=${canEvolve()}`);
  });
  return out;
});
boss.forEach(l=>console.log('  ', l));

// and it is visibly bigger on screen, still standing on the floor
const size = await p.evaluate(async ()=>{
  App.run.floor=43; const m=App.run.monster=generateMonster(43,0);
  m.hp=Math.round(m.maxHp*0.2);
  if(m.isBoss) return {err:'picked a boss'};
  App.dungeonView='battle'; App.currentPhase='difficulty'; render();
  await new Promise(r=>setTimeout(r,200));
  const box = () => document.querySelector('.combatant.monster .sprite-box').getBoundingClientRect();
  const a = box();
  evolveMonster(); render();
  await new Promise(r=>setTimeout(r,200));
  const c = box();
  const hero = document.querySelector('.combatant.player .sprite-box').getBoundingClientRect();
  return {name:m.name, before:{h:Math.round(a.height), foot:Math.round(a.bottom)},
          after:{h:Math.round(c.height), foot:Math.round(c.bottom)},
          heroFoot:Math.round(hero.bottom)};
});
console.log('measured on  :', size.name);
console.log('sprite height :', size.before.h, '->', size.after.h, `(x${(size.after.h/size.before.h).toFixed(2)})`);
console.log('feet stay put :', size.before.foot, '->', size.after.foot, '| hero foot', size.heroFoot);
console.log('page errors:', errs.length ? errs : 'none');
await b.close();})();
