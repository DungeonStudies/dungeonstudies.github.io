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
