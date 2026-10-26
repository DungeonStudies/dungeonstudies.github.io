const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(async()=>{
    const bad=[]; let n=0; const R=Math.random, C=window.chance;
    const BUFF={cleric:'cleric_benediction', mage:'mage_focus', brawler:'brawler_prep'};
    // the number on the button must equal the number dealt, for every class,
    // every skill, buffed and not, on ordinary floors and on bosses
    for(const cls of ['warrior','mage','rogue','cleric','brawler']){
      for(const floor of [4,10,50]){
        for(const diff of ['easy','hard']){
          for(const buffed of (BUFF[cls]?[false,true]:[false])){
            App.topTab='play'; App.character.classId=cls; setRealm('math'); startRun();
            App.run.floor=floor; App.run.monster=generateMonster(floor,0);
            const m=App.run.monster; m.hp=m.maxHp=9999999;
            App.run.difficulty=diff; App.run.energy=9; App.run.openedFloor=true; App.run.dots=[];
            App.run.buffs = buffed ? [Object.assign({},SKILLS[BUFF[cls]].buffSelf,{turns:5})] : [];
            App.dungeonView='battle'; render();
            const st=combatStats();
            const set = currentSkillSet().filter(x=>!x.noDamage && !x.hits);
            for(const sk of [set[0], set[set.length-1]].filter(Boolean)){   // basic and ultimate
              const bd=damageBreakdown(sk, st, m);
              Math.random=()=>0.5; window.chance=()=>false;
              const before=App.run.monster.hp;
              await resolvePlayerHit(sk.mult, sk, (sk.cost||0)>0, false, sk);
              const dealt=before-App.run.monster.hp;
              Math.random=R; window.chance=C;
              App.run.dots=[]; App.run.monster.hp=m.maxHp;
              n++;
              if(Math.abs(bd.est-dealt) > 1)
                bad.push(cls+'/'+sk.id+' f'+floor+' '+diff+(buffed?' buffed':'')+': button says '+bd.est+', dealt '+dealt);
            }
          }
        }
      }
    }
    return {bad, n};
  });
  console.log('checked', r.n, 'button-vs-dealt comparisons');
  console.log('mismatches:', r.bad.length? '\n  '+r.bad.slice(0,12).join('\n  ')+(r.bad.length>12?'\n  ...+'+(r.bad.length-12)+' more':'') : 'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
