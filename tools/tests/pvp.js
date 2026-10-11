/* Local versus: 2-6 people, one device. The things worth proving are that a
   match ENDS, that the hot seat never leaks the last person's question to the
   next one, that nobody is stronger for having played more, and that none of
   it touches the save. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:980,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);

  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    const wait = ms => new Promise(r=>setTimeout(r,ms));

    /* ---------- 1. everyone is built the same ---------- */
    const builds = pvpClassIds().map(c=>pvpStats(c));
    const hps = builds.map(b2=>b2.maxHp);
    if(Math.max(...hps) / Math.min(...hps) > 1.45)
      bad.push('the classes are not within reach of each other: HP '+hps.join('/'));
    pvpClassIds().forEach(c=>{
      const st = pvpStats(c);
      if(!(st.maxHp>0 && st.atk>0 && st.energyMax>0)) bad.push(c+' builds with no stats');
    });
    log.push(['level '+PVP_LEVEL+' builds', pvpClassIds().map(c=>CLASSES[c].name+' '+pvpStats(c).maxHp+'hp/'+pvpStats(c).atk+'atk').join(', ')]);

    /* a build must not read anything the player has earned */
    const before = JSON.stringify(pvpStats('warrior'));
    App.character.level = 60; App.character.equipped = App.character.equipped || {};
    if(JSON.stringify(pvpStats('warrior')) !== before)
      bad.push('a versus build changed when the save changed - it is not a level playing field');

    /* ---------- 2. setting up 3v3 ---------- */
    openPvp();
    if(App.dungeonView !== 'pvp') bad.push('Local Versus did not open');
    const pv = App.pvp;
    if(pv.players.length !== PVP_MIN) bad.push('a fresh match did not start with '+PVP_MIN+' players');
    const ids = pvpClassIds();
    while(pv.players.length < 6) pv.players.push(pvpMakePlayer(pv.players.length, ids[pv.players.length % ids.length], 0));
    pv.players.forEach((x,i)=>{ x.team = i < 3 ? 0 : 1; x.name = 'P'+(i+1); });
    pv.diff = 'medium'; pv.srcId = App.subjects[0].id;
    if(pvpAliveSetup(0) !== 3 || pvpAliveSetup(1) !== 3) bad.push('could not make it 3v3');

    /* ---------- 3. the save is untouched by a whole match ---------- */
    const saveBefore = JSON.stringify({
      lv: App.character.classId, xp: App.character.xp, gems: App.character.gems,
      floor: App.character.highestFloor, answered: App.character.totalAnswered,
      gear: (App.character.inventory||[]).length, runActive: App.run.active,
    });

    pvpStart();
    if(pv.stage !== 'pass') bad.push('a match did not open on the handover screen');
    if(pv.order.length !== 6) bad.push('the turn order has '+pv.order.length+' in it, not 6');
    /* fastest first */
    const first = pvpCurrent();
    const fastest = Math.max(...pv.players.map(x=>x.spd));
    if(first.spd !== fastest) bad.push('the quickest player does not go first');

    /* ---------- 4. the hot seat does not leak ---------- */
    App.dungeonView='pvp'; render();
    let leak = 0;
    pvpAskQuestion();
    const liveQ = pv.question.prompt;
    render();
    if(((document.querySelector('#panel')||{}).textContent||'').indexOf(liveQ) < 0)
      bad.push('the question is not on screen when it is your turn');
    /* answer it wrong, which hands over */
    const wrongOpt = (pv.question.options||[]).find(o=>o!==pv.question.correct) || 'zzzz';
    await pvpAnswer(wrongOpt);
    await wait(1700);
    if(pv.stage !== 'pass') bad.push('a wrong answer did not end the turn (stage '+pv.stage+')');
    render();
    const passText = (document.querySelector('#panel') || {}).textContent || '';
    if(passText.indexOf(liveQ) >= 0) leak++;
    if(passText.indexOf(String(pv.players[0].name)) < 0 && passText.indexOf('Pass it to') < 0)
      bad.push('the handover screen does not say whose turn it is');
    if(leak) bad.push('the handover screen still showed the last question');
    log.push(['hot seat', leak ? 'LEAKS' : 'shows nothing but whose turn it is']);

    /* ---------- 5. a whole match, played to a winner ---------- */
    let guard = 0;
    while(pv.stage !== 'over' && guard < 600){
      guard++;
      if(pv.stage === 'pass'){ pvpAskQuestion(); continue; }
      if(pv.stage === 'question'){
        const q = pv.question;
        /* red always knows it, blue never does - so it has to end */
        const me = pvpCurrent();
        const right = me.team === 0;
        const val = right ? q.correct
                  : ((q.options||[]).find(o=>o!==q.correct) || 'definitely wrong');
        await pvpAnswer(val);
        await wait(right ? 700 : 1600);
        continue;
      }
      if(pv.stage === 'skill'){
        const me = pvpCurrent();
        const hit = pvpSkillSet(me.classId).find(sk=>!sk.noDamage && (sk.cost||0) <= me.energy);
        pvpPickSkill((hit || pvpSkillSet(me.classId)[0]).id);
        continue;
      }
      if(pv.stage === 'target'){
        const me = pvpCurrent();
        const foe = pvpEnemiesOf(me)[0];
        if(!foe){ bad.push('a target phase with nobody to hit'); break; }
        await pvpStrike(foe.id);
        await wait(950);
        continue;
      }
      await wait(60);
    }
    if(pv.stage !== 'over') bad.push('the match never finished in '+guard+' steps (stuck at '+pv.stage+')');
    if(pv.winner !== 0) bad.push('the side that answered everything correctly did not win (winner '+pv.winner+')');
    if(pvpAlive(1).length) bad.push('the match ended with '+pvpAlive(1).length+' of the losing side still up');
    log.push(['a full 3v3', 'won by '+PVP_TEAM_NAMES[pv.winner]+' in '+pv.round+' rounds, '+guard+' steps']);
    /* Six people taking turns: a match that runs to fifteen rounds is ninety
       turns, and nobody is still playing by then. */
    if(pv.round > 10) bad.push('a 3v3 took '+pv.round+' rounds - far too long for a party game');

    /* nobody went below zero or above full */
    pv.players.forEach(x=>{
      if(x.hp < 0 || x.hp > x.maxHp) bad.push(x.name+' finished on '+x.hp+' of '+x.maxHp);
      if(x.energy < 0 || x.energy > x.energyMax) bad.push(x.name+' finished on '+x.energy+' energy');
      if(x.hp <= 0 && !x.down) bad.push(x.name+' is on 0 HP and still standing');
    });

    /* ---------- 6. and the save is exactly where it was ---------- */
    const saveAfter = JSON.stringify({
      lv: App.character.classId, xp: App.character.xp, gems: App.character.gems,
      floor: App.character.highestFloor, answered: App.character.totalAnswered,
      gear: (App.character.inventory||[]).length, runActive: App.run.active,
    });
    if(saveBefore !== saveAfter) bad.push('a versus match changed the save: '+saveBefore+' -> '+saveAfter);
    log.push(['the save', saveBefore === saveAfter ? 'untouched' : 'CHANGED']);

    /* ---------- 7. the result screen, and running it back ---------- */
    render();
    if(!document.querySelector('.pvp-win')) bad.push('no result screen');
    if(!document.querySelector('.pvp-table')) bad.push('the result screen has no scoreboard');
    const scored = pv.players.reduce((n,x)=>n+x.asked, 0);
    if(!scored) bad.push('nobody was recorded as having been asked anything');
    pvpStart();
    if(pv.stage !== 'pass') bad.push('running it back did not start a new match');
    if(pv.players.some(x=>x.down || x.hp !== x.maxHp)) bad.push('running it back kept the last match’s damage');
    if(pv.players.some(x=>x.asked)) bad.push('running it back kept the last match’s scores');

    /* ---------- 8. versus never asks for an essay ---------- */
    await setExamMode(true);
    const s0 = App.subjects[0];
    s0.notes = s0.notes || 'Arousal is the level of activation before performance.';
    s0.terms = (s0.terms && s0.terms.length) ? s0.terms
      : [makeTerm('arousal','the level of activation before performance','p'),
         makeTerm('anxiety','a negative response to threat','p')];
    let written = 0;
    for(let i=0;i<120;i++){ if(buildQuestion(pv.diff, pvpSources(), {noWritten:true}).mode === 'written') written++; }
    if(written) bad.push('versus asked for a written answer '+written+' times with exam mode on');
    await setExamMode(false);
    log.push(['written in versus', written]);

    /* ---------- 8b. nothing to spend, nothing to carry in ---------- */
    /* Versus is knowledge and how you play the turn, full stop. No potions,
       no artifacts, no hints, no gear - so none of those controls may ever
       appear on any screen of a match, and no stat may come from the save. */
    pv.stage = 'pass'; App.dungeonView='pvp'; render();
    const screens = [];
    const sweep = () => {
      /* #panel is what was actually drawn. document.body.textContent would
         include the inline <script>, i.e. the whole program, which mentions
         every one of these words in its own source. */
      const t = (document.querySelector('#panel') || {}).textContent || '';
      ['Inventory','Potion','potion','Use Hint','Watch Ad','artifact','Artifact']
        .forEach(w=>{ if(t.indexOf(w) >= 0) screens.push(pv.stage + ' shows "' + w + '"'); });
      if(document.querySelector('#panel .item-grid, #panel .potion-card, #panel .ad-btn, #panel .artifact-inline'))
        screens.push(pv.stage + ' has an item/ad control');
    };
    sweep();
    pvpAskQuestion(); render(); sweep();
    const me2 = pvpCurrent();
    await pvpAnswer(pv.question.correct);
    render(); sweep();                               /* the skill menu */
    pvpPickSkill(pvpSkillSet(me2.classId)[0].id);
    render(); sweep();                               /* picking a target */
    if(screens.length) bad.push('items leaked into versus: ' + screens.join('; '));
    /* and the move list itself is only ever class skills plus the guard */
    pvpClassIds().forEach(cid=>{
      pvpSkillSet(cid).forEach(sk=>{
        if(!sk) { bad.push(cid + ' has a missing skill in its versus set'); return; }
        if(sk.itemId || sk.potion) bad.push(cid + ' can use an item in versus: ' + sk.id);
      });
      if(!pvpSkillSet(cid).some(sk=>sk.id === 'block')) bad.push(cid + ' has no Block in versus');
    });
    log.push(['no items', screens.length ? 'LEAKED' : 'nothing to spend on any screen']);
    /* a fighter carries no inventory of its own */
    const sample = pv.players[0];
    ['potions','artifacts','inventory','equipped','gems','materials'].forEach(k=>{
      if(k in sample) bad.push('a versus fighter carries ' + k);
    });

    /* ---------- 8c. a stage with no question must not blank the screen ---------- */
    pv.stage = 'question'; pv.question = null;
    try{ render(); }catch(e){ bad.push('a question stage with no question threw: ' + e.message); }
    if(pv.stage !== 'pass') bad.push('a question stage with no question did not fall back to the handover');

    /* ---------- 8d. the netcode's authority rules ----------
       The real connection cannot be tested from here - it needs two machines
       and a live introduction service. What CAN be tested, and is the part
       that would actually ruin a match, is who is allowed to do what. */
    const sentToGuests = [];
    const realToAll = window.netToAll;
    window.netToAll = m => sentToGuests.push(m);

    /* set up a 1v1 as if we were the host, with the guest owning seat 2 */
    pv.players = [pvpMakePlayer(0,'warrior',0), pvpMakePlayer(1,'mage',1)];
    pv.players[0].name='Host'; pv.players[0].net='HOST11';
    pv.players[1].name='Guest'; pv.players[1].net='GUEST2';
    Object.assign(NET, {on:true, role:'host', code:'HOST11', me:'HOST11', hostCode:'HOST11',
      conns:{}, seats:[], status:'', error:''});
    pvpStart();
    if(!netIsOnline() || !netIsHost()) bad.push('the host does not think it is hosting');
    /* the state that travels must be plain data */
    let snap = null;
    try{ snap = netSnapshot(); JSON.stringify(snap); }
    catch(e){ bad.push('the state going down the wire is not serialisable: '+e.message); }
    if(snap && typeof snap.players[0].hp !== 'number') bad.push('the snapshot lost the fighters');

    /* whoever is up, only THEY may act, and only from their own machine */
    const up = pvpCurrent();
    const other = pv.players.find(x=>x.id !== up.id);
    pvpAskQuestion();
    const q0 = pv.question;
    const wrongCode = other.net;
    await netHostApplyIntent(wrongCode, {t:'answer', value:q0.correct});
    if(pv.stage !== 'question') bad.push('a player acted on somebody else\u2019s turn');
    await netHostApplyIntent('NOBODY', {t:'answer', value:q0.correct});
    if(pv.stage !== 'question') bad.push('an unknown machine was allowed to act');
    /* and the right one works */
    await netHostApplyIntent(up.net, {t:'answer', value:q0.correct});
    await wait(50);
    if(pv.stage !== 'skill') bad.push('the player whose turn it is could not answer (stage '+pv.stage+')');
    /* an intent for the wrong stage is refused */
    await netHostApplyIntent(up.net, {t:'target', id:other.id});
    if(pv.stage !== 'skill') bad.push('a target was accepted during the move choice');
    log.push(['authority', 'only the player whose turn it is, from their own machine']);

    /* the host broadcasts after every change it makes */
    const before2 = sentToGuests.length;
    pvpPickSkillLocal(pvpSkillSet(up.classId)[0].id);
    if(sentToGuests.length <= before2) bad.push('the host changed the match without telling anyone');
    if(!sentToGuests.some(m=>m && m.t === 'state')) bad.push('no state was ever broadcast');

    /* a guest only sees its own turn */
    Object.assign(NET, {role:'guest', me:'GUEST2'});
    if(pvpIsMine(up) === (up.net === 'GUEST2') ? false : true){ /* shape check below */ }
    if(pvpIsMine(pv.players.find(x=>x.net==='HOST11'))) bad.push('a guest believes it owns the host\u2019s fighter');
    if(!pvpIsMine(pv.players.find(x=>x.net==='GUEST2'))) bad.push('a guest does not own its own fighter');
    /* and a guest never resolves anything itself */
    const stageWas = pv.stage, hpWas = other.hp;
    const sentToHost = [];
    const realToHost = window.netToHost;
    window.netToHost = m => sentToHost.push(m);
    pv.stage = 'question'; pv.question = q0;
    pv.turn = pv.order.indexOf(pv.players.find(x=>x.net==='GUEST2').id);
    await pvpAnswer(q0.correct);
    if(!sentToHost.length) bad.push('a guest answered without asking the host');
    if(pv.stage !== 'question') bad.push('a guest resolved its own answer instead of asking');
    window.netToHost = realToHost;
    window.netToAll = realToAll;

    /* a guest takes whatever the host sends, wholesale */
    const fake = {stage:'over', players:pv.players, order:pv.order, turn:0, round:7,
                  winner:1, log:['from the host'], online:true};
    netGuestOnData({t:'state', state:fake});
    if(App.pvp.round !== 7 || App.pvp.winner !== 1) bad.push('a guest ignored the state the host sent');
    /* the live object must BE the one everybody is holding, not a new one */
    if(App.pvp !== pv) bad.push('adopting a state swapped the match object and orphaned every reference to it');
    log.push(['guest', 'asks, never resolves, and takes the host\u2019s state']);

    /* ---------- 8e. friends are saved and forgotten ---------- */
    netReset();
    const n0f = friends().length;
    await addFriend('Test Mate', 'abc-123');
    const added = friends().find(f=>f.code === 'ABC123');
    if(!added) bad.push('a friend was not saved, or the code was not cleaned up');
    if(added && added.name !== 'Test Mate') bad.push('the friend\u2019s name was lost');
    await addFriend('Test Mate', 'ABC123');
    if(friends().filter(f=>f.code==='ABC123').length !== 1) bad.push('adding the same code twice made two friends');
    let threw = false;
    try{ await addFriend('x','ab'); }catch(e){ threw = true; }
    if(!threw) bad.push('a code too short to be a code was accepted');
    const live = friends().find(f=>f.code === 'ABC123');
    if(live) await removeFriend(live.id);
    if(friends().length !== n0f) bad.push('forgetting a friend did not work');
    log.push(['friends', 'saved, de-duplicated, forgotten']);

    /* ---------- 8f. offline is unchanged by all of it ---------- */
    netReset();
    if(netIsOnline()) bad.push('leaving the room did not disconnect');
    pv.players = [pvpMakePlayer(0,'warrior',0), pvpMakePlayer(1,'mage',1)];
    pvpStart();
    if(pv.players.some(x=>x.net !== 'local')) bad.push('an offline match did not mark its fighters local');
    if(!pvpMyTurn()) bad.push('offline, the person holding the screen cannot act');
    pv.players.forEach(x=>{ if(!pvpIsMine(x)) bad.push('offline, a fighter is not actable'); });

    /* ---------- 9. you cannot wander off mid-match ---------- */
    App.dungeonView='pvp'; pv.stage='question'; render();
    if(!inTheDungeon()) bad.push('you can leave the Play tab in the middle of somebody else’s turn');
    pv.stage='setup';
    if(inTheDungeon() && !(App.run && App.run.active)) bad.push('the setup screen locks you in, and it should not');

    return {bad, log};
  });

  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
