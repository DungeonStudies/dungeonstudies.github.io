/* A monster has to finish dying. The boss-only sway rule was written with a
   selector that caught every monster and sits below the generic fade, so it
   won the tie and nothing ever left the screen. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForFunction(()=>typeof App!=='undefined');
  await p.waitForTimeout(400);

  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    const wait = ms => new Promise(r=>setTimeout(r,ms));
    App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'x'}];
    if(typeof setRealmSilently==='function') setRealmSilently('s1');
    App.character.classId='warrior';

    /* every archetype in the roster must have a death that ends */
    const arches = new Set();
    BAND_ROSTER.flat().forEach(sp=>arches.add(sp.arche));
    const kinds = {};
    arches.forEach(a=>{ kinds[deathKind(a)] = (kinds[deathKind(a)]||0)+1; if(!CRE_SHEET[a]) bad.push(a+' has no sprite'); });
    log.push(['death kinds in the roster', Object.keys(kinds).map(k=>k+'×'+kinds[k]).join(' ')]);
    if(Object.keys(kinds).length < 5) bad.push('only '+Object.keys(kinds).length+' death kinds across the whole roster');

    /* and the animation on a plain monster must be one that finishes */
    for(const [floor, label] of [[7,'ordinary'], [40,'boss']]){
      App.run = Object.assign(defaultRun(), {active:true, floor, difficulty:'medium'});
      partyInit(['warrior','mage','cleric']);
      App.run.monster = generateMonster(floor, 0);
      App.dungeonView='battle'; App.currentPhase='difficulty'; App.__life=null; render();
      await wait(120);
      const box = document.querySelector('.combatant.monster .sprite-box');
      if(!box){ bad.push(label+': no sprite to kill'); continue; }
      const m = App.run.monster;
      box.classList.add('dying', 'die-' + deathKind(m.arche));
      const cs = getComputedStyle(box);
      const name = cs.animationName, count = cs.animationIterationCount, fill = cs.animationFillMode;
      log.push([label+' ('+m.arche+')', name+' ×'+count+' fill:'+fill]);
      if(count === 'infinite' && !(m.isBoss && m.smallBoss)) bad.push(label+' death animation never ends: '+name);
      if(fill.indexOf('forwards') < 0) bad.push(label+' death does not hold its last frame: fill '+fill);
      /* and it really does end invisible */
      await wait(1100);
      const op = Number(getComputedStyle(box).opacity);
      log.push([label+' opacity after 1.1s', op.toFixed(2)]);
      if(op > 0.02) bad.push(label+' is still '+Math.round(op*100)+'% visible a second after dying');
      box.classList.remove('dying');
    }
    /* the staged arc: four beats, about two seconds, ends invisible, and it
       must never spring back upright to flash - which the first version did,
       because the dissolve carried !important but not the fallen pose */
    App.run = Object.assign(defaultRun(), {active:true, floor:7, difficulty:'medium'});
    partyInit(['warrior','mage','cleric']);
    App.run.monster = generateMonster(7, 0);
    App.dungeonView='battle'; App.currentPhase='difficulty'; App.__life=null; render();
    await wait(180);
    const els = getBattleEls();
    const box = els.monsterSprite;
    if(!box) bad.push('no sprite to kill');
    else {
      const t0 = performance.now();
      const seen = [];
      const watch = setInterval(()=>{
        const cs = getComputedStyle(box);
        const r = box.getBoundingClientRect();
        /* the CENTRE, not the top edge: these deaths rotate, and a rotated box
           grows upward on its own without the body having moved an inch */
        seen.push({t: Math.round(performance.now()-t0), a: cs.animationName,
                   y: (r.top + r.bottom) / 2, o: Number(cs.opacity)});
      }, 90);
      await playCreatureDeath(els.scene, box, App.run.monster);
      clearInterval(watch);
      const dur = performance.now() - t0;
      log.push(['death length', Math.round(dur)+'ms']);
      const want = DEATH_MS.stagger + DEATH_MS.buckle + DEATH_MS.fall + DEATH_MS.dissolve;
      if(dur < want*0.85 || dur > want*1.45) bad.push('the death runs '+Math.round(dur)+'ms, wanted about '+want);
      /* and the CSS must agree with the beats: a collapse longer than its own
         beat gets cut off by the dissolve and never plays to the end, which is
         how the dragon's topple lost its last 38% */
      const cs = getComputedStyle(document.documentElement);
      const ms = n => Math.round(parseFloat(cs.getPropertyValue(n)) || 0);
      log.push(['css beats', 'hit '+ms('--dth-hit')+' buckle '+ms('--dth-buckle')+
                             ' fall '+ms('--dth-fall')+' out '+ms('--dth-out')]);
      if(ms('--dth-fall') !== DEATH_MS.fall) bad.push('the CSS fall beat is '+ms('--dth-fall')+'ms, the code says '+DEATH_MS.fall);
      const probe = document.createElement('div');
      probe.className = 'sprite-box';
      const host2 = document.createElement('div'); host2.className = 'combatant';
      host2.appendChild(probe); document.body.appendChild(host2);
      const over = [];
      ['crumble','collapse','unmake','fell','drop','recoil','topple','burn'].forEach(k=>{
        probe.className = 'sprite-box die-' + k;
        const d = Math.round(parseFloat(getComputedStyle(probe).animationDuration) * 1000);
        if(d > DEATH_MS.fall) over.push(k + ' ' + d + 'ms');
      });
      host2.remove();
      log.push(['collapses longer than their beat', over.length ? over.join(' ') : 'none']);
      if(over.length) bad.push('these collapses are cut off before they finish: ' + over.join(', '));

      const stages = [...new Set(seen.map(s=>s.a))].filter(a=>a && a!=='none');
      log.push(['stages seen', stages.join(' → ')]);
      if(stages.length < 3) bad.push('only '+stages.length+' stage(s) played: '+stages.join(' '));

      /* it may go down and it may rise as it dissolves, but it must never come
         back UP while it is still solid */
      const solid = seen.filter(s=>s.o > 0.9);
      let sprang = 0;
      for(let i=1;i<solid.length;i++) if(solid[i].y < solid[i-1].y - 3) sprang++;
      log.push(['upward jumps while solid', sprang]);
      if(sprang) bad.push('it springs back upright '+sprang+' time(s) before dissolving');

      if(Number(getComputedStyle(box).opacity) > 0.02) bad.push('still visible when the death finished');
      log.push(['dissolve colour', dissolveHue(App.run.monster)]);
    }

    /* the zombie is not the skeleton */
    const a = CRE_SHEET.zombie, s2 = CRE_SHEET.skeleton;
    if(!a) bad.push('no zombie sprite');
    else {
      const same = JSON.stringify(a.px[a.clips.idle[0]]) === JSON.stringify(s2.px[s2.clips.idle[0]]);
      if(same) bad.push('the zombie is drawn exactly like the skeleton');
      const palSame = JSON.stringify(a.pal) === JSON.stringify(s2.pal);
      if(palSame) bad.push('the zombie shares the skeleton palette');
      log.push(['zombie', 'own sprite and own palette']);
    }
    const z = BAND_ROSTER.flat().find(sp=>sp.name && sp.name.indexOf('Zombie')>=0);
    if(z && z.arche !== 'zombie') bad.push('Zombie Corpse still uses the '+z.arche+' sprite');
    return {bad, log};
  });
  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
