/* The four things added together: the tour, the sound settings, the injured
   adventurer, and enchanting through to ascension. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:940,height:860}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(600);
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1500);

  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    const wait = ms => new Promise(r=>setTimeout(r,ms));

    /* 1. the tour forces itself once, points at real things, and stops */
    if(!document.querySelector('.tut-card')) bad.push('the tour did not start on a first run');
    log.push(['tour steps', TUTORIAL.length]);
    const missing = TUTORIAL.filter(s=>s.at).map(s=>s.at);
    for(let i=0;i<TUTORIAL.length;i++){
      if(i){ tutStep(1); }                    /* the way a player advances it */
      await wait(90); paintTutorial(); await wait(50);
      const s = TUTORIAL[i];
      if(TUT.step !== i) bad.push('Next went to step '+(TUT.step+1)+', wanted '+(i+1));
      if(!document.querySelector('.tut-card')) bad.push('step '+(i+1)+' drew no card');
      if(s.at){
        if(!document.querySelector(s.at)) bad.push('step '+(i+1)+' points at '+s.at+', which is not on the page');
        else if(!document.querySelector('.tut-ring')) bad.push('step '+(i+1)+' has a target but no ring');
        if(!document.querySelector('.tut-arrow')) bad.push('step '+(i+1)+' has a target but no arrow');
      }
      if(!s.title || !s.text) bad.push('step '+(i+1)+' has no words');
    }
    await endTutorial(); await wait(80);
    if(document.querySelector('.tut-card')) bad.push('the tour did not clean up after itself');
    if(document.querySelector('.tut-ring')) bad.push('a ring was left behind');
    if(!TUT.seen) bad.push('finishing the tour did not remember that it was seen');
    /* and it does not come back */
    App.topTab='play'; App.dungeonView='hub'; render(); await wait(700);
    if(document.querySelector('.tut-card')) bad.push('the tour started again after being finished');
    /* but Help can ask for it */
    startTutorial(true); await wait(80);
    if(!document.querySelector('.tut-card')) bad.push('Help could not replay the tour');
    await endTutorial(); await wait(60);

    /* 2. the volume slider actually reaches the sound */
    await setSound({volume:0.5, muted:false});
    if(Math.abs(Sfx.level() - 0.5) > 0.001) bad.push('volume 0.5 read back as ' + Sfx.level());
    if(Math.abs(FinScore.peak() - 0.45) > 0.01) bad.push('the music did not follow the slider: ' + FinScore.peak());
    await setSound({muted:true});
    if(Sfx.level() !== 0) bad.push('mute did not silence the cues');
    if(FinScore.peak() > 0.001) bad.push('mute did not silence the music');
    await setSound({volume:0.7, muted:false});
    log.push(['sound', 'level '+Sfx.level()+', music peak '+FinScore.peak().toFixed(2)]);

    /* 3. the injured adventurer: two potions in, coin and loot out */
    App.character.classId='warrior'; setRealm('math'); startRun();
    App.run.floor = 12;
    Object.keys(App.character.potions||{}).forEach(k=>App.character.potions[k]=0);
    startHurtEvent(12);
    if(App.dungeonView!=='hurt') bad.push('the event did not open its own screen');
    const goldBefore0 = App.run.gold||0;
    hurtHelp();                                     /* with nothing to give */
    if(App.run.hurt.done) bad.push('helped him with no potions in the pack');
    if((App.run.gold||0) !== goldBefore0) bad.push('paid out for a refusal');
    addPotion('hp_small', 1); addPotion('hp_large', 2);
    const goldBefore = App.run.gold||0, fragBefore = matCount('fragment');
    hurtHelp();
    log.push(['after helping', 'small '+potionCount('hp_small')+', large '+potionCount('hp_large')+
              ', +'+((App.run.gold||0)-goldBefore)+' gold, +'+(matCount('fragment')-fragBefore)+' fragments']);
    if(!App.run.hurt.helped) bad.push('helping did not take');
    if(potionCount('hp_small') + potionCount('hp_large') !== 1) bad.push('spent the wrong number of potions');
    if(potionCount('hp_small') !== 0) bad.push('spent a great potion before a small one');
    if((App.run.gold||0) - goldBefore !== POTIONS.hp_small.price) bad.push('paid back the wrong coin');
    if(matCount('fragment') <= fragBefore) bad.push('handed over none of his loot');
    hurtLeave();
    if(App.run.hurt) bad.push('the event did not clear');
    /* and he is a once-a-run event */
    if(!App.run.hurtMet) bad.push('the run did not remember meeting him');

    /* 4. enchanting to +10, then ascending */
    const line = WEAPON_CATALOG.find(w=>w.classId==='warrior' && w.rarity==='legendary');
    const sword = makeWeaponInstance(line);
    App.character.weapons.push(sword);
    const base = sword.atk;
    App.character.materials.fragment = 0;
    enchantWeapon(sword.id);
    if(enchLevel(sword) !== 0) bad.push('enchanted with no fragments');
    let total = 0; for(let n=0;n<ENCH_MAX;n++) total += ENCH_COST(n);
    App.character.materials.fragment = total;
    for(let i=0;i<ENCH_MAX;i++) enchantWeapon(sword.id);
    log.push(['enchanting', base+' ATK → '+itemAtk(sword)+' ATK at +'+enchLevel(sword)+', cost '+total+' fragments']);
    if(enchLevel(sword) !== ENCH_MAX) bad.push('stopped at +'+enchLevel(sword));
    if(matCount('fragment') !== 0) bad.push('the costs do not add up: '+matCount('fragment')+' left');
    enchantWeapon(sword.id);
    if(enchLevel(sword) > ENCH_MAX) bad.push('went past +'+ENCH_MAX);
    if(itemAtk(sword) !== Math.round(base * (1 + ENCH_MAX*ENCH_STEP))) bad.push('the attack does not match the level');
    if(sword.atk !== base) bad.push('enchanting rewrote the base attack');

    if(!canAscend(sword)) bad.push('a legendary at +10 cannot ascend');
    App.character.materials.remnant = ASCEND_COST - 1;
    ascendWeapon(sword.id);
    if(sword.rarity === 'mythic') bad.push('ascended one remnant short');
    App.character.materials.remnant = ASCEND_COST;
    const atkAt10 = itemAtk(sword);
    ascendWeapon(sword.id);
    log.push(['ascension', atkAt10+' ATK → '+itemAtk(sword)+' ATK, "'+sword.name+'"']);
    if(sword.rarity !== 'mythic') bad.push('ascension did not take');
    if(matCount('remnant') !== 0) bad.push('remnants were not spent');
    if(enchLevel(sword) !== 0) bad.push('a mythical blade should start its ten levels again');
    if(itemAtk(sword) <= atkAt10) bad.push('ascension made it weaker');
    if(sword.name.indexOf('Mythic') !== 0) bad.push('the name did not change: '+sword.name);
    if(!canEnchant(sword)) bad.push('a mythical blade cannot be enchanted');
    ascendWeapon(sword.id);
    if(sword.name.indexOf('Mythic Mythic') === 0) bad.push('ascended twice into a silly name');

    /* an epic never gets there, however enchanted */
    const epicLine = WEAPON_CATALOG.find(w=>w.classId==='warrior' && w.rarity==='epic');
    const epic = makeWeaponInstance(epicLine); epic.ench = ENCH_MAX;
    if(canAscend(epic)) bad.push('an epic blade can ascend');

    /* 5. the idle is a nod, not a pulse: no creature may move more of itself
       across its idle loop than the heroes do, and none may change width */
    function loopMotion(sheet, name, W){
      const sh = sheet[name], ids = sh.clips.idle;
      let moved = 0, minW = 99, maxW = 0;
      for(let k=0;k<ids.length;k++){
        const a = sh.px[ids[k]], c = sh.px[ids[(k+1)%ids.length]];
        let lo=99, hi=-1;
        for(let y=0;y<36;y++){
          const ra=a[y]||'', rc=c[y]||'';
          for(let x=0;x<W;x++){
            const A=(ra[x]||'.')!=='.', C=(rc[x]||'.')!=='.';
            if(A!==C) moved++;
            if(A){ if(x<lo)lo=x; if(x>hi)hi=x; }
          }
        }
        if(hi>=lo){ const w=hi-lo+1; if(w<minW)minW=w; if(w>maxW)maxW=w; }
      }
      return {moved, widthSwing: maxW-minW};
    }
    /* Cell counts, raw or normalised, both turned out to be the wrong yardstick:
       a wide creature moves more cells for the same one-pixel settle, and a thin
       one moves a larger share of itself for it, and neither looks any different
       on screen. What matters is the displacement, and the rule is simply that
       an idle may move the body by ONE pixel and no more - which is the hero's
       own settle. Measured as the bounding box's top edge. */
    const boxOf = (sheet, n, W) => {
      const sh = sheet[n];
      return sh.clips.idle.map(i=>{
        const f = sh.px[i]; let t=99, b=-1;
        for(let y=0;y<36;y++){ const r=f[y]||'';
          for(let x=0;x<W;x++) if(r[x]&&r[x]!=='.'){ if(y<t)t=y; if(y>b)b=y; break; } }
        return {t, b};
      });
    };
    const spreadOf = a => Math.max(...a) - Math.min(...a);
    const heroLift = Math.max(...['warrior','mage','rogue','cleric','brawler']
      .map(k=>spreadOf(boxOf(HERO_SHEET,k,32).map(v=>v.t))));
    let maxLift = 0, liftName = '';
    Object.keys(CRE_SHEET).forEach(n=>{
      const bx = boxOf(CRE_SHEET, n, 36);
      const lift = spreadOf(bx.map(v=>v.t));
      if(lift > maxLift){ maxLift = lift; liftName = n; }
      if(lift > 1) bad.push(n + ' lifts its body ' + lift + ' pixels in an idle — one is the hero\'s settle and the limit');
    });
    log.push(['body settle', 'worst creature ' + liftName + ' ' + maxLift + 'px, worst hero ' + heroLift + 'px']);

    /* 5b. a monster must be animated the same way the hero is: frame swaps and
       nothing else. Any transform animation the hero does not also have is a
       creature moving around on its own, which is what hovering was. */
    App.run = Object.assign(defaultRun(), {active:true, floor:7, difficulty:'medium'});
    partyInit(['warrior','mage','cleric']);
    App.run.monster = generateMonster(7, 0);
    App.dungeonView='battle'; App.currentPhase='difficulty'; App.__life=null; render();
    await wait(150);
    const anims = sel => {
      const box = document.querySelector(sel + ' .sprite-box');
      if(!box) return null;
      const names = [getComputedStyle(box).animationName];
      box.querySelectorAll('*').forEach(n=>names.push(getComputedStyle(n).animationName));
      return names.filter(n=>n && n !== 'none');
    };
    const ma = anims('.combatant.monster') || [];
    const allowed = n => /^(sf\d|cre\d|cw\d|creBreathe$)/.test(n);
    const monExtra = [...new Set(ma.filter(n=>!allowed(n)))];
    log.push(['monster animations', [...new Set(ma)].join(' ') || 'none']);
    if(monExtra.length) bad.push('the monster is animated by '+monExtra.join(', ')+', which is neither a frame swap nor the breath');

    /* the breath itself is measured in tools/tests/breath.js, which builds a
       clean battle rather than inheriting this file's death-and-revive state */
    const pBox = document.querySelector('.combatant.player .sprite-box');
    const mBox = document.querySelector('.combatant.monster .sprite-box');
    if(pBox && mBox){
      const d = Math.abs(pBox.getBoundingClientRect().bottom - mBox.getBoundingClientRect().bottom);
      log.push(['footing gap, hero vs monster', Math.round(d)+'px']);
      if(d > 2) bad.push('the monster stands '+Math.round(d)+'px off the hero\'s line');
    }

    /* 5c. no idle may oscillate: a part that goes one way and back inside one
       loop reads as a glitch. Measured as the silhouette's centre of mass
       changing direction more than once. */
    Object.keys(CRE_SHEET).forEach(n=>{
      const sh = CRE_SHEET[n], ids = sh.clips.idle;
      const cx = ids.map(i=>{ const f=sh.px[i]; let sum=0,cnt=0;
        for(let y=0;y<36;y++){ const r=f[y]||'';
          for(let x=0;x<36;x++) if(r[x]&&r[x]!=='.'){ sum+=x; cnt++; } }
        return cnt?sum/cnt:0; });
      let turns = 0, last = 0;
      for(let k=1;k<cx.length;k++){
        const d = cx[k] - cx[k-1];
        if(Math.abs(d) < 0.05) continue;
        const dir = d > 0 ? 1 : -1;
        if(last && dir !== last) turns++;
        last = dir;
      }
      if(turns > 1) bad.push(n+' changes direction '+turns+' times in one idle — that is a jitter, not a motion');
    });

    /* What an idle may and may not do is measured in tools/tests/breath.js
       against the hero's own frames, which is the only fair standard: whatever
       a creature stands on must not move more than a hero's feet do, and the
       body above it must. The rule that used to live here - "an idle may not
       displace a single pixel" - was the previous answer to this, and it was
       wrong: the hero displaces plenty, it just never moves what it is
       standing on. */

    /* and the circlet is for the undead, not for everything that is not on a list */
    ['golem','colossus','automaton','harpy','roc','reaper','wraith','tyrant','overseer','dragon']
      .forEach(n=>{ if(CRE_CROWN_OK.has(n)) bad.push(n + ' is wearing the undead circlet'); });
    if(!CRE_CROWN_OK.has('skeleton')) bad.push('the undead lost their circlet entirely');
    log.push(['circlet', [...CRE_CROWN_OK].join(' ')]);

    /* 6. remnants are not in the common pool */
    let leaked = 0;
    for(let i=0;i<4000;i++) if(pickMaterialId(30) === 'remnant' || pickMaterialId(30) === 'fragment') leaked++;
    log.push(['pool leaks in 4000 draws', leaked]);
    if(leaked) bad.push('fragments or remnants turn up in the ordinary material pool');

    return {bad, log};
  });

  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
