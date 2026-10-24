const {chromium}=require('playwright');
/* THE CLIMB. Ten floors to a block, three choices a floor, and the gate at the
   tenth only opens on ten out of ten. The rules worth pinning down: a clean
   block moves you up and pays gems, a block with any miss drops you back to
   the BOTTOM OF THAT BLOCK rather than to the start of the climb, the gate
   checks at the tenth floor and not the moment you slip, the gems stop at
   fifty a day, and none of it touches the dungeon run. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(1100);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.waitForTimeout(800);
  const r = await p.evaluate(async()=>{
    const wait = ms=>new Promise(r=>setTimeout(r,ms));
    const bad=[], log=[];
    /* a realm with plenty to ask about */
    App.profileId='eald'; setRealm('eald');
    App.character.gems = 0; App.character.trialBest = 1;
    App.character.trialGems = {day:'', got:0};

    openTrial(); await wait(60);
    if(App.dungeonView !== 'trial') bad.push('the hub tile did not open the climb');
    if(!trialPlayable()) bad.push('a realm with 225 cards says it cannot be climbed');

    /* every question is three choices, never typed */
    trialStart(); await wait(60);
    const shapes = new Set();
    for(let i=0;i<12;i++){
      trialNextQuestion();
      shapes.add((App.trial.q.options||[]).length + '/' + App.trial.q.mode);
    }
    log.push(['question shape', [...shapes].join(' ')]);
    if([...shapes].some(x=>!/^3\/mcq$/.test(x))) bad.push('not every question is three-choice multiple choice: ' + [...shapes].join(' '));

    /* --- a clean block opens the gate, moves you up, and pays --- */
    const climb = async (missAt)=>{
      trialStart(); await wait(20);
      for(let i=0;i<10;i++){
        const q = App.trial.q;
        const answer = (i === missAt) ? (q.options.find(o=>o !== q.correct)) : q.correct;
        await trialAnswer(answer); await wait(10);
        await trialAdvance(); await wait(10);
      }
    };
    App.trial.block = 1;
    await climb(-1);
    if(App.trial.phase !== 'gate') bad.push('ten answers did not reach the gate, phase=' + App.trial.phase);
    if(!App.trial.cleared) bad.push('a clean block did not open the gate');
    if(App.trial.gained !== 3) bad.push('a cleared block paid ' + App.trial.gained + ' gems, not 3');
    if(App.character.gems !== 3) bad.push('the gems did not reach the character: ' + App.character.gems);
    if(App.character.trialBest !== 2) bad.push('the high mark did not move: ' + App.character.trialBest);
    log.push(['a clean block', 'gate opens, +' + App.trial.gained + ' gems, best now block ' + App.character.trialBest]);
    trialThrough(); await wait(20);
    if(App.trial.block !== 2) bad.push('through the gate did not move to block 2');
    if(trialFloor() !== 11) bad.push('block 2 does not start at floor 11: ' + trialFloor());
    log.push(['through the gate', 'block ' + App.trial.block + ', floor ' + trialFloor()]);

    /* --- one miss anywhere, and the gate sends you back down the block --- */
    App.trial.block = 5;                     /* floors 41-50 */
    await climb(3);                          /* miss the fourth floor */
    if(App.trial.cleared) bad.push('a block with a miss still opened the gate');
    if(App.trial.wrong !== 1) bad.push('the miss was not counted: ' + App.trial.wrong);
    if(App.trial.marks.length !== 10) bad.push('the gate fired early — only ' + App.trial.marks.length + ' answered');
    /* and the floor shown at the gate is the tenth of the block, not the first
       of the next one - it used to read FLOOR 51 while sending you to 41 */
    if(trialFloor() !== 50) bad.push('the gate shows floor ' + trialFloor() + ', not 50');
    const gemsBefore = App.character.gems;
    trialThrough(); await wait(20);
    if(App.trial.block !== 5) bad.push('a failed block moved you off block 5 to ' + App.trial.block);
    if(trialFloor() !== 41) bad.push('it did not drop to the bottom of the block: floor ' + trialFloor());
    if(App.character.gems !== gemsBefore) bad.push('a failed block still paid gems');
    log.push(['one miss of ten', 'back to floor ' + trialFloor() + ', still block ' + App.trial.block + ', no gems']);

    /* --- the daily cap --- */
    App.character.trialGems = {day: trialToday(), got: 48};
    App.character.gems = 0;
    App.trial.block = 1;
    await climb(-1);
    if(App.trial.gained !== 2) bad.push('the cap did not clip the payout: got ' + App.trial.gained);
    if(trialGemsLeft() !== 0) bad.push('there are still ' + trialGemsLeft() + ' gems left after the cap');
    trialThrough(); await wait(20);
    await climb(-1);
    if(App.trial.gained !== 0) bad.push('it paid ' + App.trial.gained + ' gems past the daily cap');
    if(!App.trial.cleared) bad.push('hitting the cap stopped the climb counting');
    log.push(['the daily cap', 'clipped to 2, then 0, and the climb still counts']);

    /* a new day starts the tally again */
    App.character.trialGems = {day:'1999-01-01', got: 50};
    if(trialGemsLeft() !== 50) bad.push('yesterday’s tally did not roll over: ' + trialGemsLeft());
    log.push(['a new day', trialGemsLeft() + ' gems available again']);

    /* --- and none of it touches the dungeon --- */
    App.character.classId='warrior'; startRun();
    const runFloor = App.run.floor, runHp = App.run.hp;
    openTrial(); trialStart(); await wait(20);
    await trialAnswer(App.trial.q.options.find(o=>o !== App.trial.q.correct)); await wait(20);
    if(App.run.floor !== runFloor || App.run.hp !== runHp) bad.push('the climb changed the dungeon run');
    if(App.run.active === false) bad.push('the climb ended the run');
    log.push(['the run', 'floor ' + App.run.floor + ', hp ' + App.run.hp + ' — untouched']);
    return {bad, log};
  });
  (r.log||[]).forEach(x=>console.log(' ', String(x[0]).padEnd(18), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
