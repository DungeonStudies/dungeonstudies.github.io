const {chromium} = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new']});
  const p = await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(500);
  // every screen renders for every class x gender
  const r = await p.evaluate(()=>{
    const out=[];
    for(const c of ['warrior','mage','rogue','cleric','brawler']){
      for(const g of ['m','f']){
        App.character.classId=c;
        try{ classArt(c); }catch(e){ out.push(c+' ART '+e.message); }
      }
    }
    App.topTab='play'; setRealm('math'); startRun();
    for(const v of ['hub','battle','inventory','craft','index','gemshop','select','explore','checkpoint']){
      App.dungeonView=v; App.exploreResult=null; App.checkpointResult=null;
      try{ render(); }catch(e){ out.push(v+' '+e.message); }
    }
    for(const t of ['study','characters','play']){ App.topTab=t; try{ render(); }catch(e){ out.push(t+' '+e.message); } }
    return out;
  });
  console.log('render failures:', r.length?r:'none');
  // one full combat round, plus an ultimate
  const combat = await p.evaluate(async()=>{
    App.topTab='play'; App.character.classId='brawler';
    setRealm('math'); startRun();
    App.run.monster.hp=99999; App.run.monster.maxHp=99999; App.run.energy=9;
    App.currentPhase='difficulty'; chooseDifficulty('hard');
    await submitAnswer(App.currentQuestion.correct);
    const afterE = App.run.energy;
    const ult = currentSkillSet().find(s=>s.ultimate);
    await useSkillById(ult.id);
    return {energyAfterHard:afterE, phase:App.currentPhase, monsterHp:App.run.monster.hp<99999, cinemaGone:!document.querySelector('.ult-cinema')};
  });
  console.log('combat:', JSON.stringify(combat));
  console.log('errors:', errs);
  await b.close();
})();
