const {chromium}=require('playwright');
/* The five techniques, the bar you choose, and the rule under all of it:
   a skill belongs to a class and no amount of clicking puts it anywhere
   else. Also that the new states actually do something - a silence costs a
   turn, smoke takes you off the target list, a taunt drags everyone onto
   one person, and a rend halves what a cleric gives back. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:900,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async()=>{
    const out=[], bad=[];
    const wait=ms=>new Promise(r=>setTimeout(r,ms));
    /* every class has a technique branch, and it gates nothing */
    Object.keys(CLASSES).forEach(cid=>{
      const tech = CLASSES[cid].tree.filter(n=>n.branch==='tech');
      if(!tech.length) bad.push(cid+' has no techniques');
      tech.forEach(n=>{ if(n.requires.length) bad.push(cid+' technique '+n.name+' requires something'); });
      /* and nothing requires a technique */
      CLASSES[cid].tree.forEach(n=>{
        n.requires.forEach(r=>{ if(/_tech_/.test(r)) bad.push(cid+': '+n.name+' depends on a technique'); });
      });
      out.push([cid, tech.map(n=>n.name).join(', ')]);
    });
    /* a class can never equip another class's technique */
    const ch = App.character;
    Object.keys(CLASSES).forEach(cid=>{
      ch.classId = cid;
      const prog = ch.classProgress[cid];
      prog.skillPoints = 30; prog.allocated = {};
      CLASSES[cid].tree.filter(n=>n.branch==='tech').forEach(n=>allocateNode(n.id));
      const able = eligibleSkills(cid);
      able.forEach(sid=>{ const sk=SKILLS[sid];
        if(sk.classes && sk.classes.indexOf(cid)<0) bad.push(cid+' may carry '+sid); });
      Object.keys(CLASS_TECHNIQUES).forEach(other=>{
        if(other===cid) CLASS_TECHNIQUES[other].forEach(sid=>{
          if(able.indexOf(sid)<0) bad.push(cid+' took '+sid+' in the tree but cannot carry it'); });
        else CLASS_TECHNIQUES[other].forEach(sid=>{
          if(able.indexOf(sid)>=0) bad.push(cid+' can carry '+other+"'s "+sid); });
      });
      /* and setSkillBar refuses one even if you ask directly */
      const foreign = (CLASS_TECHNIQUES[cid==='rogue'?'warrior':'rogue']||[])[0];
      setSkillBar([foreign]);
      if(skillBar().indexOf(foreign)>=0) bad.push(cid+' equipped a foreign skill through setSkillBar');
      prog.bar = null;
    });
    ch.classId='rogue';
    out.push(['rogue bar', skillBar().join(', ')]);
    out.push(['block always on', currentSkillSet().some(s=>s.id==='block')]);
    /* versus gives the whole class kit including techniques, no books */
    ch.learnedSkills = ch.learnedSkills||{}; ch.learnedSkills['ms_boneshard']=true;
    Object.keys(CLASSES).forEach(cid=>{
      const ids = pvpSkillSet(cid).map(s=>s.id);
      (CLASS_TECHNIQUES[cid]||[]).forEach(sid=>{ if(ids.indexOf(sid)<0) bad.push('versus '+cid+' is missing '+sid); });
      if(ids.indexOf('ms_boneshard')>=0) bad.push('versus '+cid+' carries a monster book');
      if(ids.indexOf('block')<0) bad.push('versus '+cid+' has no Block');
      ids.forEach(sid=>{ const sk=SKILLS[sid];
        if(sk.classes && sk.classes.indexOf(cid)<0) bad.push('versus '+cid+' carries '+sid); });
    });
    out.push(['versus rogue kit', pvpSkillSet('rogue').map(s=>s.name).join(', ')]);

    /* ---- and the states do something ---- */
    App.pvp = defaultPvp();
    const pv = App.pvp;
    pv.players = [pvpMakePlayer(0,'warrior',0), pvpMakePlayer(1,'cleric',0),
                  pvpMakePlayer(2,'rogue',1),   pvpMakePlayer(3,'brawler',1)];
    pv.players.forEach((x,i)=>x.name = ['Knight','Priest','Thief','Bruiser'][i]);
    pvpStart();
    const [kn, pr, th, br] = pv.players;

    /* smoke takes you off the list; a taunt puts one person back on it alone */
    th.hidden = 2;
    if(pvpTargetsFor(kn).indexOf(th) >= 0) bad.push('smoke did not hide the rogue');
    if(pvpTargetsFor(kn).indexOf(br) < 0) bad.push('the one not hiding became untargetable too');
    th.hidden = 0; br.taunt = 2;
    const t2 = pvpTargetsFor(kn);
    if(t2.length !== 1 || t2[0] !== br) bad.push('a taunt did not make them the only target');
    th.hidden = 2;
    const t3 = pvpTargetsFor(kn);
    if(t3.length !== 1 || t3[0] !== br) bad.push('a taunt should beat smoke');
    br.taunt = 0; th.hidden = 0;
    /* everyone hiding still leaves something to swing at */
    th.hidden = 2; br.hidden = 2;
    if(!pvpTargetsFor(kn).length) bad.push('a turn with nothing at all to hit');
    th.hidden = 0; br.hidden = 0;
    out.push(['targeting', 'smoke hides, taunt overrides, never empty']);

    /* rend halves what the cleric gives back */
    pr.hp = 40; pr.healCut = 0;
    pvpApplySupport(pr, pr, SKILLS.cleric_benediction);
    const full = pr.hp - 40;
    pr.hp = 40; pr.healCut = 0.5;
    pvpApplySupport(pr, pr, SKILLS.cleric_benediction);
    const cut = pr.hp - 40;
    if(!(cut < full)) bad.push('a bleeding target healed the same ('+full+' vs '+cut+')');
    out.push(['rend vs cleric', full + ' HP normally, ' + cut + ' while bleeding']);

    /* mending light strips it and wards against the next one */
    pr.bleedTurns = 3; pr.bleed = 9; pr.healCut = 0.5; pr.healCutTurns = 3; pr.silenced = 1;
    pvpApplySupport(pr, pr, SKILLS.cleric_mending);
    if(pr.bleedTurns || pr.healCut || pr.silenced) bad.push('mending light did not strip everything');
    if(!(pr.ward > 0)) bad.push('mending light left no ward');
    out.push(['mending light', 'stripped and warded']);

    /* a silence costs exactly one turn */
    pv.turn = pv.order.indexOf(kn.id);
    th.silenced = 2;
    const roundBefore = pv.round;
    let seen = [];
    for(let i=0;i<6;i++){ pvpEndTurn(); const c = pvpCurrent(); if(c) seen.push(c.name); }
    if(seen.indexOf('Thief') >= 0 && th.silenced > 0) bad.push('a silenced fighter still got a turn');
    out.push(['silence', 'turn order ran ' + seen.join(' > ')]);

    return {out, bad};
  });
  r.out.forEach(x=>console.log(' ', x[0].padEnd(16), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
