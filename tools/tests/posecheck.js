const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  // for every skill, sample the player sprite's clip class while the attack runs
  const r = await p.evaluate(async()=>{
    const seen = {}, bad = [];
    for(const [cls, set] of Object.entries(CLASS_SKILLS)){
      App.topTab='play'; App.character.classId=cls; setRealm('math'); startRun();
      App.dungeonView='battle'; render();
      for(const id of Object.values(set)){
        App.run.monster.hp=9e8; App.run.monster.maxHp=9e8; App.run.energy=9;
        const want = (SKILL_FX[id]||{}).pose || 'atk';
        const box = getBattleEls().playerSprite;
        const hits = new Set();
        const t = setInterval(()=>{
          const n = box && box.querySelector('.spr');
          if(n) (n.className.match(/spr-(\w+)/)||[]).forEach((m,i)=>{ if(i===1) hits.add(m); });
        }, 25);
        await resolvePlayerHit(1.0, SKILLS[id], true, false, SKILLS[id]);
        clearInterval(t);
        seen[cls+'/'+id] = [...hits].join(',');
        if(!hits.has(want)) bad.push(cls+'/'+id+' wanted '+want+' saw ['+[...hits]+']');
      }
    }
    return {bad, sample:Object.entries(seen).slice(0,6)};
  });
  console.log('pose mismatches:', r.bad.length ? r.bad : 'none');
  console.log('sample:', r.sample);
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length ? 1 : 0);
})();
