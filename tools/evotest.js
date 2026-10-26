const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:900,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    // 1. the roll only fires below 30%, never on a boss, never twice
    App.topTab='play'; App.character.classId='warrior'; setRealm('math'); startRun();
    App.run.floor=7; App.run.monster=generateMonster(7,0);
    const m=App.run.monster;
    m.hp=m.maxHp; if(canEvolve()) bad.push('evolves at full health');
    m.hp=Math.round(m.maxHp*0.5); if(canEvolve()) bad.push('evolves at half health');
    m.hp=Math.round(m.maxHp*0.25); if(!canEvolve()) bad.push('will not evolve under 30%');
    const before={name:m.name, hp:m.maxHp, atk:m.atk, def:m.def, spd:m.spd, arche:m.arche};
    const hpAtRoll = m.hp;
    const res=evolveMonster();
    log.push(['before', JSON.stringify(before)]);
    log.push(['after ', JSON.stringify({name:m.name, hp:m.maxHp, atk:m.atk, def:m.def, spd:m.spd, arche:m.arche})]);
    // it takes back HALF a bar, not all of it
    const healed = (m.hp - hpAtRoll) / m.maxHp;
    log.push(['healed', (healed*100).toFixed(1)+'% of its new max bar']);
    if(Math.abs(healed - EVOLVE_HEAL) > 0.02) bad.push('healed '+(healed*100).toFixed(1)+'%, wanted '+(EVOLVE_HEAL*100)+'%');
    if(m.hp >= m.maxHp) bad.push('came back to full - it should take half a bar, not all of it');
    if(!(m.maxHp>before.hp && m.atk>before.atk && m.def>before.def && m.spd>before.spd)) bad.push('did not get stronger');
    // it is the SAME creature, just bigger
    if(m.arche!==before.arche) bad.push('changed shape - it should be the same creature, larger');
    if(m.name===before.name) bad.push('name did not change');
    if(m.name.indexOf(before.name)<0) bad.push('new name lost the old one: '+m.name);
    if(canEvolve()) bad.push('can evolve a second time');
    App.run.monster.hp=1; App.run.monster.isBoss=true; App.run.monster.evolved=false;
    if(canEvolve()) bad.push('a boss can evolve');
    // 2. no archetype in the roster loses its sprite on evolving
    const arches=new Set(); BAND_ROSTER.flat().forEach(sp=>arches.add(sp.arche));
    arches.forEach(a=>{ if(!CRE_SHEET[a]) bad.push(a+' has no sprite to grow'); });
    log.push(['archetypes in roster', [...arches].join(' ')]);
    // 3. the rate is 5%
    let hits=0; for(let i=0;i<40000;i++) if(chance(EVOLVE_CHANCE)) hits++;
    log.push(['evolve rate over 40k rolls', (hits/400).toFixed(2)+'%']);
    if(hits/40000<0.043||hits/40000>0.057) bad.push('rate is '+(hits/400).toFixed(2)+'%');
    return {bad, log};
  });
  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
