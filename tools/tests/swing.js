const {chromium}=require('playwright');
/* WHOSE SWING IS THIS.
   Two bugs lived here together and both were visible to anyone who played a
   single arena round. The attack animation read App.character.classId - your
   DUNGEON hero - so a warrior swung as whatever you happened to be playing
   underground and turned back when the animation finished. And every clip
   swap wrote into the .sprite-box, overwriting the .sprite-flip wrapper that
   carries the mirror, so the fighter on the right spun round to face away
   mid-blow. Neither can come back without this failing. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1100,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(900);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;}
    if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async()=>{
    const wait = ms => new Promise(r=>setTimeout(r,ms));
    const bad=[], log=[];
    /* the dungeon hero is deliberately a class NEITHER fighter is playing */
    App.character.classId = 'cleric';
    App.topTab='pvp'; App.pvpView='local'; openPvp();
    App.pvp.players[0].classId = 'warrior'; App.pvp.players[0].team = 0;
    App.pvp.players[1].classId = 'mage';    App.pvp.players[1].team = 1;
    pvpStart(); render();
    const pv = App.pvp, me = pvpCurrent();
    const foe = pv.players.find(x=>x.team !== me.team);
    const skill = pvpSkillSet(me.classId)[0];
    pv.stage='target'; pv.pending=skill.id; pv.resolving=false;
    log.push([me.classId + ' hits ' + foe.classId, 'dungeon hero is ' + App.character.classId]);

    const asked = [];
    const realHero = heroSprite;
    heroSprite = (cid, clip)=>{ asked.push(cid); return realHero(cid, clip); };
    /* whoever is on team 1 faces left, and must still be facing left all the
       way through somebody else's attack */
    const t1 = pv.players.find(x=>x.team === 1);
    const mirror = new Set();
    const watch = setInterval(()=>{
      const n = document.querySelector('.pvp-scene [data-pid="'+t1.id+'"]');
      if(n) mirror.add(!!n.querySelector('.sprite-flip.mirror'));
    }, 25);
    await pvpStrikeLocal(foe.id);
    await wait(400);
    clearInterval(watch); heroSprite = realHero;

    const counts = {};
    asked.forEach(c=>{ counts[c] = (counts[c]||0)+1; });
    log.push(['classes drawn', JSON.stringify(counts)]);
    if(counts[App.character.classId])
      bad.push('the animation drew the dungeon hero (' + App.character.classId + ') '
               + counts[App.character.classId] + ' times - neither fighter is that class');
    if(!counts[me.classId]) bad.push('the attacker (' + me.classId + ') was never drawn');
    if(!counts[foe.classId]) bad.push('the defender (' + foe.classId + ') was never drawn');
    if(mirror.has(false)) bad.push('the team-1 fighter turned around mid-attack');
    if(!mirror.has(true)) bad.push('the team-1 fighter never faced left at all');
    log.push(['facing', 'the right-hand fighter kept its mirror throughout']);

    /* ---- the same bug, underground, wearing a different hat ----
       The dungeon hero's box holds the charge glow beside the art - the light
       on a mage's hand that says you are still charged. A clip swap writing
       innerHTML on the BOX wiped it out, so it vanished for most of every
       swing and came back when the animation finished: gone at exactly the
       moment you would look at your character to check. */
    App.character.classId='mage'; startRun(); App.character.classId='mage';
    App.run.floor=6; App.run.monster=generateMonster(6,0);
    App.run.monster.maxHp=999999; App.run.monster.hp=999999;
    App.dungeonView='battle'; App.topTab='play'; render();
    await wait(150);
    const hbox = ()=>document.querySelector('.combatant.player .sprite-box');
    if(!hbox().querySelector('.sprite-flip')) bad.push('the dungeon hero has no art wrapper');
    App.run.energy = 10;
    const focus = SKILLS.mage_focus;
    await resolvePlayerHit(1, Object.assign({id:'mage_focus'}, focus), true, 0, focus);
    await wait(500);
    if(!activeChargeBuff()) bad.push('Focus did not charge the mage');
    if(!hbox().querySelector('.hand-glow')) bad.push('a charged mage has no glow at rest');
    App.run.energy = 10;
    const frames = [];
    const tick = setInterval(()=>{ const b2 = hbox();
      frames.push(b2 ? b2.querySelectorAll('.hand-glow').length : -1); }, 25);
    const bolt = SKILLS.mage_lightning;
    await resolvePlayerHit(1, Object.assign({id:'mage_lightning'}, bolt), true, 0, bolt);
    await wait(380);
    clearInterval(tick);
    const dark = frames.filter(n=>n === 0).length;
    if(!activeChargeBuff()) bad.push('the charge fell off during the swing, so this proves nothing');
    else if(dark) bad.push('the charge glow was wiped for ' + dark + ' of ' + frames.length
                           + ' frames of the swing');
    else log.push(['the charge glow', 'held for all ' + frames.length + ' frames of a swing']);

    /* and the helper itself, which is what keeps that true */
    const box = document.createElement('div');
    box.innerHTML = '<div class="sprite-flip mirror"></div>';
    if(spriteHost(box) !== box.firstChild) bad.push('spriteHost skips the mirror wrapper');
    const bare = document.createElement('div');
    if(spriteHost(bare) !== bare) bad.push('spriteHost drops a box that has no wrapper');
    if(spriteHost(null) !== null) bad.push('spriteHost(null) did not come back null');
    const flip = document.createElement('div'); flip.className = 'sprite-flip';
    if(spriteHost(flip) !== flip) bad.push('spriteHost went looking inside a wrapper it was handed');
    return {bad, log};
  });
  r.log.forEach(x=>console.log(' ', String(x[0]).padEnd(26), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
