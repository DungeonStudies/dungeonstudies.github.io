const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(async()=>{
    const bad=[], log=[]; const R=Math.random, C=window.chance;
    const setup=(cls, def)=>{
      App.topTab='play'; App.character.classId=cls; setRealm('math'); startRun();
      App.run.floor=30; App.run.monster=generateMonster(30,0);
      const m=App.run.monster;
      m.hp=m.maxHp=9999999; m.weak=[]; m.resist=[]; m.dot='normal'; m.def=def; m.spd=99;
      App.run.energy=9; App.run.openedFloor=true; App.run.dots=[]; App.run.shatter=0;
      App.run.difficulty='medium'; App.dungeonView='battle'; render();
      return m;
    };
    const punch=async(id)=>{ Math.random=()=>0.5; window.chance=()=>false;
      const before=App.run.monster.hp;
      await resolvePlayerHit(SKILLS[id].mult, SKILLS[id], (SKILLS[id].cost||0)>0, false, SKILLS[id]);
      Math.random=R; window.chance=C;
      const dealt = before - App.run.monster.hp;   // measure, then top it back up
      App.run.monster.hp = App.run.monster.maxHp;
      return dealt; };

    // 1. a heavily armoured target: each blow should land harder than the last
    setup('brawler', 14);
    const seq=[];
    for(let i=0;i<6;i++){ const d=await punch('brawler_jab'); seq.push(d+'('+shatterStacks()+')'); }
    log.push(['brawler jab vs 14 DEF, blow by blow', seq.join(' → ')]);
    const nums=seq.map(x=>+x.split('(')[0]);
    for(let i=1;i<5;i++) if(nums[i] < nums[i-1]) bad.push('blow '+(i+1)+' ('+nums[i]+') landed softer than blow '+i+' ('+nums[i-1]+')');
    if(!(nums[4] > nums[0]*1.5)) bad.push('five blows only took damage from '+nums[0]+' to '+nums[4]+'; the armour is not being cracked');
    if(shatterStacks()!==SHATTER_MAX) bad.push('stacks capped at '+shatterStacks()+', wanted '+SHATTER_MAX);

    // 2. at full stacks it is true damage: armour must not matter at all
    setup('brawler', 0);   App.run.shatter=SHATTER_MAX-1; const noArmour=await punch('brawler_jab');
    setup('brawler', 400); App.run.shatter=SHATTER_MAX-1; const heavyArmour=await punch('brawler_jab');
    log.push(['at full Shatter: 0 DEF vs 400 DEF', noArmour, heavyArmour]);
    if(noArmour!==heavyArmour) bad.push('true damage is not true: '+noArmour+' vs '+heavyArmour+' through 400 defense');

    // 3. nobody else gets it
    for(const cls of ['warrior','rogue','cleric','mage']){
      setup(cls, 400); App.run.shatter=0;
      const first=await punch(currentSkillSet()[0].id);
      setup(cls, 0); App.run.shatter=0;
      const bare=await punch(currentSkillSet()[0].id);
      if(first===bare && cls!=='mage') bad.push(cls+' is ignoring armour it should not ('+first+' through 400 DEF vs '+bare+' through none)');
      if(isShatterClass()) bad.push(cls+' counts as a shatter class');
    }
    // 4. the button still predicts it exactly, at every stack level
    setup('brawler', 14);
    for(let i=0;i<6;i++){
      const st=combatStats(), sk=SKILLS.brawler_jab;
      const bd=damageBreakdown(sk, st, App.run.monster);
      const dealt=await punch('brawler_jab');
      if(Math.abs(bd.est-dealt)>1) bad.push('at '+i+' stacks the button said '+bd.est+' and dealt '+dealt);
    }
    // 5. it resets between floors
    setup('brawler', 14); App.run.shatter=SHATTER_MAX;
    startFloor(31);
    log.push(['stacks after walking downstairs', shatterStacks()]);
    if(shatterStacks()!==0) bad.push('shatter carried over to the next floor');
    return {bad, log};
  });
  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
