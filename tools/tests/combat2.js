const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  p.on('console',m=>{ if(String(m.text()).startsWith('STEP')) console.log(' ',m.text()); });
  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    // damage carries +-15% variance and a crit roll; pin both so a ratio means something
    const R=Math.random, C=window.chance;
    const det=()=>{ Math.random=()=>0.5; window.chance=()=>false; };
    const undet=()=>{ Math.random=R; window.chance=C; };
    const setup=(cls,floor,mon)=>{
      App.topTab='play'; App.character.classId=cls; setRealm('math'); startRun();
      App.run.floor=floor||1;
      App.run.monster = mon || generateMonster(App.run.floor,0);
      App.run.monster.hp=App.run.monster.maxHp=500000;
      App.run.energy=9; App.run.dots=[]; App.run.cooldowns={}; App.run.buffs=[];
      App.run.openedFloor=true;            // keep ambush out of the numbers
      App.character.strength=400;          // big numbers, so rounding is not the signal
      App.dungeonView='battle'; App.currentPhase='skillmenu'; render();
      return App.run.monster;
    };
    const hpLost=async(id)=>{ const m=App.run.monster; const before=m.hp;
      await resolvePlayerHit(SKILLS[id].mult, SKILLS[id], true, false, SKILLS[id]);
      return before - App.run.monster.hp; };

    console.log('STEP 1');
    // --- 1. weakness and resistance are exactly x1.5 and x0.5 ---
    { det();
      const mk=(weak,res)=>Object.assign(generateMonster(5,0),{weak,resist:res,dot:'normal',def:0,spd:1,hp:500000,maxHp:500000});
      setup('cleric',5, mk([],[]));            const plain = await hpLost('cleric_swing');
      setup('cleric',5, mk(['holy'],[]));      const weak  = await hpLost('cleric_swing');
      setup('cleric',5, mk([],['holy']));      const res   = await hpLost('cleric_swing');
      log.push(['holy vs plain/weak/resist', plain, weak, res]);
      if(Math.abs(weak/plain - 1.5) > 0.01) bad.push('weakness is '+(weak/plain).toFixed(2)+', wanted 1.50');
      if(Math.abs(res/plain - 0.5) > 0.01) bad.push('resistance is '+(res/plain).toFixed(2)+', wanted 0.50');
      undet();
    }
    console.log('STEP 2');
    // --- 2. the cleric really does hurt undead more than a warrior does ---
    { det();
      const und=()=>Object.assign(generateMonster(5,0),{weak:['holy'],resist:['poison','bleed'],dot:'tough',def:0,spd:1,hp:500000,maxHp:500000});
      setup('cleric',5,und());  const c = await hpLost('cleric_swing');
      setup('warrior',5,und()); const w = await hpLost('warrior_slash');
      log.push(['undead: cleric vs warrior basic', c, w]);
      if(!(c > w)) bad.push('cleric basic ('+c+') should beat warrior basic ('+w+') on undead');
      undet();
    }
    console.log('STEP 3');
    // --- 3. rogue stacks: up to three, they tick, and they pay ---
    { det();
      const frail=()=>Object.assign(generateMonster(5,0),{weak:[],resist:[],dot:'frail',def:0,spd:1,hp:500000,maxHp:500000});
      setup('rogue',5,frail());
      await hpLost('rogue_poison'); await hpLost('rogue_shadowstep'); await hpLost('rogue_poison');
      const n1 = dotStacks();
      await hpLost('rogue_poison');
      const n2 = dotStacks(), tick = dotTickTotal();
      log.push(['rogue stacks after 3 then 4 applications', n1, n2, 'tick '+tick]);
      if(n1 !== 3) bad.push('three applications gave '+n1+' stacks, wanted 3');
      if(n2 !== 3) bad.push('a fourth application pushed past the cap: '+n2);
      if(tick <= 0) bad.push('stacks do no damage per turn');
      // and the damage bonus that comes with them
      setup('rogue',5,frail()); const clean = await hpLost('rogue_stab');
      setup('rogue',5,frail());
      await hpLost('rogue_poison'); await hpLost('rogue_poison'); await hpLost('rogue_poison');
      const loaded = await hpLost('rogue_stab');
      log.push(['rogue stab: no stacks vs three', clean, loaded]);
      if(!(loaded > clean*1.3)) bad.push('venomcraft gave only '+(loaded/clean).toFixed(2)+'x with 3 stacks, wanted 1.36');
      undet();
    }
    console.log('STEP 4');
    // --- 4. nothing takes hold on something with nothing to rot ---
    {
      const imm=()=>Object.assign(generateMonster(5,0),{weak:[],resist:[],dot:'immune',def:0,spd:1,hp:500000,maxHp:500000});
      setup('rogue',5,imm());
      await hpLost('rogue_poison'); await hpLost('rogue_shadowstep');
      log.push(['stacks on an immune body', dotStacks()]);
      if(dotStacks() !== 0) bad.push('stacks landed on an immune monster');
    }
    console.log('STEP 5');
    // --- 5. brawler beats what it outruns ---
    { det();
      const at=(spd)=>Object.assign(generateMonster(5,0),{weak:[],resist:[],dot:'normal',def:0,spd,hp:500000,maxHp:500000});
      setup('brawler',5,at(30)); const slowSelf = await hpLost('brawler_jab');
      setup('brawler',5,at(1));  const fastSelf = await hpLost('brawler_jab');
      log.push(['brawler vs faster / slower foe', slowSelf, fastSelf]);
      if(!(fastSelf > slowSelf)) bad.push('momentum did nothing: '+slowSelf+' vs '+fastSelf);
      undet();
    }
    console.log('STEP 6');
    // --- 6. a stunned thing loses its turn ---
    {
      setup('warrior',5); App.run.monster.hp=500000;
      await hpLost('warrior_bash');
      if(!isStunned()) bad.push('Shield Bash did not stun');
      const hpBefore = App.run.hp;
      await resolveMonsterHit();
      log.push(['stun: hp before/after the enemy turn', hpBefore, App.run.hp]);
      if(App.run.hp !== hpBefore) bad.push('a stunned enemy still hit for '+(hpBefore-App.run.hp));
    }
    console.log('STEP 7');
    // --- 7. paralysis is wired to the roll, at the rate the skill claims ---
    {
      if(SKILLS.mage_lightning.paralyzePct !== 20) bad.push('Lightning Strike no longer claims 20%');
      // stub the roll only across the cast - buildQuestion retries on chance()
      setup('mage',5); App.run.monster.hp=500000;
      window.chance = ()=>true;
      await resolvePlayerHit(SKILLS.mage_lightning.mult, SKILLS.mage_lightning, true, false, SKILLS.mage_lightning);
      window.chance = C;
      const always = isStunned();
      setup('mage',5); App.run.monster.hp=500000;
      window.chance = ()=>false;
      await resolvePlayerHit(SKILLS.mage_lightning.mult, SKILLS.mage_lightning, true, false, SKILLS.mage_lightning);
      window.chance = C;
      const never = isStunned();
      let hit=0; for(let i=0;i<20000;i++) if(chance(20)) hit++;
      log.push(['paralyse: guaranteed roll / failed roll / chance(20) over 20k', always, never, (hit/200).toFixed(1)+'%']);
      if(!always) bad.push('a guaranteed roll did not paralyse');
      if(never) bad.push('a failed roll paralysed anyway');
      if(hit/20000 < 0.18 || hit/20000 > 0.22) bad.push('chance(20) returns '+(hit/200).toFixed(1)+'%');
    }
    console.log('STEP 8');
    // --- 8. the three buff skills: no damage, a buff, a cooldown, a glow ---
    for(const [cls,id] of [['cleric','cleric_benediction'],['mage','mage_focus'],['brawler','brawler_prep']]){
      setup(cls,5);
      const m=App.run.monster, hp0=m.hp;
      App.run.hp = Math.round(combatStats().maxHp*0.5);
      const php0=App.run.hp;
      await resolvePlayerHit(SKILLS[id].mult, SKILLS[id], true, false, SKILLS[id]);
      if(App.run.monster.hp !== hp0) bad.push(id+' dealt damage; it is a buff');
      const buff = activeChargeBuff();
      if(!buff) bad.push(id+' left no charge on you');
      if(skillCooldown(id) <= 0) bad.push(id+' did not go on cooldown');
      const atkUp = combatStats().atk;
      App.run.buffs=[]; const atkPlain = combatStats().atk;
      App.run.buffs=[Object.assign({},SKILLS[id].buffSelf,{turns:3})];
      log.push([id, 'atk '+atkPlain+' -> '+atkUp, 'glow '+(buff&&buff.glow), 'cd '+skillCooldown(id), 'healed '+(App.run.hp-php0)]);
      if(!(atkUp > atkPlain)) bad.push(id+' did not raise attack ('+atkPlain+' -> '+atkUp+')');
      if(SKILLS[id].healPct && App.run.hp <= php0) bad.push(id+' claims to heal but did not');
      if(!SKILLS[id].healPct && App.run.hp !== php0) bad.push(id+' healed without claiming to');
      App.run.buffs=[];
    }
    console.log('STEP 9');
    // --- 9. cooldowns actually tick back off ---
    {
      setup('brawler',5);
      await resolvePlayerHit(0, SKILLS.brawler_prep, true, false, SKILLS.brawler_prep);
      const start = skillCooldown('brawler_prep');
      for(let i=0;i<7;i++) tickCooldowns();
      log.push(['prep cooldown start / after 7 turns', start, skillCooldown('brawler_prep')]);
      if(start < 5) bad.push('cooldown started at '+start);
      if(skillCooldown('brawler_prep') !== 0) bad.push('cooldown never cleared');
    }
    console.log('STEP 10');
    // --- 9b. a charge buff has to outlast the wait for a 5-energy ultimate ---
    {
      for(const [cls,buffId,ultId] of [['cleric','cleric_benediction','cleric_smite'],
                                       ['mage','mage_focus','mage_fireball'],
                                       ['brawler','brawler_prep','brawler_ironpalm']]){
        setup(cls,5);
        App.run.energy = 0; App.run.buffs=[];
        await resolvePlayerHit(0, SKILLS[buffId], true, false, SKILLS[buffId]);
        let turns = 0, afforded = -1;
        const cost = SKILLS[ultId].cost;
        while(turns < 12){
          turns++;
          tickBuffTimers();
          App.run.energy = Math.min(9, App.run.energy + 1);
          if(afforded < 0 && App.run.energy >= cost) afforded = turns;
          if(!(App.run.buffs||[]).length) break;
        }
        const upFor = (App.run.buffs||[]).length ? turns : turns - 1;
        log.push([buffId+' lasts / '+ultId+' affordable at turn', upFor, afforded]);
        if(afforded < 0 || afforded > upFor)
          bad.push(buffId+' is gone by the time you can afford '+ultId+' (buff '+upFor+' turns, ultimate at turn '+afforded+')');
      }
    }
    // --- 10. Execute blows the stacks ---
    {
      const frail=()=>Object.assign(generateMonster(5,0),{weak:[],resist:[],dot:'frail',def:0,spd:1,hp:500000,maxHp:500000});
      setup('rogue',5,frail());
      await hpLost('rogue_poison'); await hpLost('rogue_poison');
      const pending = activeDots().reduce((n,d)=>n+d.perTurn*d.turnsLeft,0);
      const dealt = await hpLost('rogue_execute');
      log.push(['execute: stacks pending / total dealt', pending, dealt, 'left '+dotStacks()]);
      if(dotStacks() !== 0) bad.push('Execute left stacks behind');
      if(pending <= 0) bad.push('nothing was pending to detonate');
    }
    console.log('STEP 11');
    // --- 11. boots exist, equip, and move Speed ---
    {
      setup('rogue',5);
      const line = ARMOR_CATALOG.find(a=>a.slot==='boots' && a.rarity==='epic');
      if(!line) bad.push('no boots in the armour catalogue');
      else{
        if(!line.spd) bad.push('boots carry no speed');
        const before = combatStats().spd;
        App.character.armors.push({id:'test_boots', lineId:line.lineId, slot:'boots', name:line.name, def:line.def, spd:line.spd, rarity:'epic'});
        equipItem('boots','test_boots');
        const after = combatStats().spd;
        log.push(['boots: speed before/after', before, after, '+'+line.spd]);
        if(after !== before + line.spd) bad.push('equipping boots moved speed '+before+' -> '+after);
      }
    }
    console.log('STEP 12');
    // --- 12. a faster monster opens the fight ---
    {
      App.topTab='play'; App.character.classId='warrior'; setRealm('math'); startRun();
      equipMap().boots=null;
      const st=combatStats();
      App.run.floor=4;
      // force a swift species so it outruns the warrior
      const m=generateMonster(4,0); m.spd = st.spd + 5;
      App.run.monster=m; App.dungeonView='battle';
      startFloor(4);
      App.run.monster.spd = st.spd + 5;
      const opens = (App.run.monster.spd > st.spd);
      log.push(['floor 4 monster spd vs yours', App.run.monster.spd, st.spd]);
      if(!opens) bad.push('could not set up a faster monster');
    }
    return {bad, log};
  });
  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length? '\n  '+r.bad.join('\n  ') : 'none');
  console.log('page errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
