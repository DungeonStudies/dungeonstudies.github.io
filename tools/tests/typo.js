const {chromium}=require('playwright');
/* THREE THINGS ABOUT GETTING IT WRONG.
   A misspelling is not ignorance: somebody who types "enjambement" knows what
   enjambment is, and marking that the same as a blank page punishes them for
   a keyboard. It counts, at half strength.
   The answer you missed used to flash past in the half second before the
   monster swung - the one moment you want to read it is after being hit for
   missing it, so it stays on screen with the Continue button.
   And the Play tab used to walk you straight out of a live floor. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1100,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(1000);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.waitForTimeout(800);
  const r = await p.evaluate(async()=>{
    const wait = ms=>new Promise(r=>setTimeout(r,ms));
    const bad=[], log=[];

    /* --- what counts as a slip and what does not --- */
    const yes = [['enjambement','enjambment'], ['mitochondira','mitochondria'],
                 ['photosynthsis','photosynthesis'], ['personifcation','personification'],
                 ['oxidative phosphorilation','oxidative phosphorylation']];
    const no  = [['cat','bat'], ['metaphor','simile'], ['','enjambment'],
                 ['tone','tense'], ['anaphora','epistrophe'], ['alliteration','assonance']];
    yes.forEach(([a,b2])=>{ if(!nearMiss(a,b2)) bad.push('"'+a+'" should count as a slip for "'+b2+'"'); });
    no.forEach(([a,b2])=>{ if(nearMiss(a,b2)) bad.push('"'+a+'" must NOT count as "'+b2+'"'); });
    log.push(['slips accepted', yes.length + ' typos, ' + no.length + ' different words rejected']);

    /* --- a slip is a half strike, not a free turn and not a miss --- */
    App.character.classId='warrior'; startRun();
    App.run.floor=3; App.run.monster=generateMonster(3,0);
    App.run.monster.maxHp=99999; App.run.monster.hp=99999;
    App.dungeonView='battle'; App.topTab='play';
    App.currentQuestion = {mode:'text', prompt:'Name it.', correct:'enjambment', why:'A line runs on.'};
    App.currentPhase='question'; render(); await wait(60);
    await submitAnswerNow(App.currentQuestion, 'enjambement');
    await wait(400);
    if(!App.lastAnswerCorrect) bad.push('a misspelling still counted as wrong');
    if(!App.nearMiss) bad.push('the slip was not recorded');
    if(App.run.examMult !== 0.5) bad.push('the strike was not halved: examMult=' + App.run.examMult);
    if(App.currentPhase !== 'skillmenu') bad.push('a slip did not reach the skill menu, phase=' + App.currentPhase);
    log.push(['a misspelled answer', 'counts, at ×' + App.run.examMult + ', phase ' + App.currentPhase]);

    /* --- a genuinely wrong answer keeps the answer on screen afterwards --- */
    App.run.examMult = 0; App.nearMiss = null;
    App.currentQuestion = {mode:'text', prompt:'What is a caesura?', correct:'a pause in the middle of a line', why:'It stops the reader.'};
    App.currentPhase='question'; render(); await wait(60);
    await submitAnswerNow(App.currentQuestion, 'something else entirely');
    await wait(1800);
    if(App.lastAnswerCorrect) bad.push('a wrong answer counted as right');
    if(App.currentPhase !== 'postattack') bad.push('did not reach the Continue screen, phase=' + App.currentPhase);
    const card = document.querySelector('.answer-card');
    if(!card) bad.push('the answer is not shown with the Continue button');
    else {
      const t = card.textContent || '';
      if(t.indexOf('a pause in the middle of a line') < 0) bad.push('the correct answer is not in it');
      if(t.indexOf('It stops the reader') < 0) bad.push('the explanation is not in it');
    }
    if(!document.querySelector('.px-btn.gold')) bad.push('there is no Continue button');
    log.push(['after a wrong answer', 'the answer and why stay up with Continue']);

    /* --- and Play cannot walk you out of a floor --- */
    App.run.active = true; App.dungeonView='battle'; App.topTab='play'; render();
    if(!inTheDungeon()) bad.push('the test is not in a live run');
    const before = App.dungeonView;
    setTopTab('play');
    if(App.dungeonView !== before) bad.push('tapping Play left the fight: view is now ' + App.dungeonView);
    log.push(['tapping Play mid-floor', 'stays on ' + App.dungeonView]);
    /* fleeing still works */
    if(typeof fleeRun !== 'function') bad.push('there is no way to flee');
    return {bad, log};
  });
  (r.log||[]).forEach(x=>console.log(' ', String(x[0]).padEnd(26), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
