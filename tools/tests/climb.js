const {chromium}=require('playwright');
/* THE CLIMB. Ten floors to a block, three choices a floor, and the gate at the
   tenth only opens on ten out of ten. The rules worth pinning down: a clean
   block moves you up and pays gems, a block with any miss drops you back to
   the BOTTOM OF THAT BLOCK rather than to the start of the climb, the gate
   checks at the tenth floor and not the moment you slip, the gems stop at
   fifty a day, and none of it touches the dungeon run.

   The climb sits in Play beside the dungeon, not inside it, and you answer by
   picking one of three doors with the answer written on it. */
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

    /* --- the climb is a mode of Play, reached from the switch above it --- */
    setTopTab('play'); await wait(60);
    const pick = [...document.querySelectorAll('.play-pick .arena-card')];
    log.push(['the play switch', pick.map(b=>b.textContent.trim()).join(' | ') || 'MISSING']);
    if(pick.length !== 2) bad.push('the play switch does not offer two modes: ' + pick.length);
    const climbBtn = pick.find(b=>/climb/i.test(b.textContent));
    if(!climbBtn) bad.push('there is no climb button in Play');
    else { climbBtn.click(); await wait(80); }
    if(App.playMode !== 'climb') bad.push('the switch did not put Play into the climb: ' + App.playMode);
    if(App.dungeonView === 'trial') bad.push('the climb is still a dungeon view');
    if(!document.querySelector('.trial-start')) bad.push('the climb did not render in the Play tab');
    if(document.querySelector('.dg-realms, .realm-card')) bad.push('the dungeon is still rendered under the climb');

    /* the switch picks up where you left off, and crossing to the dungeon and
       back does not wipe a block you are part way through */
    App.playMode = 'dungeon'; App.trial = null;
    App.character.trialBest = 4;
    setPlayMode('climb'); await wait(60);
    if(!App.trial || App.trial.block !== 4) bad.push('the switch started at block ' + (App.trial&&App.trial.block) + ', not the best of 4');
    trialStart(); await wait(20);
    await trialAnswer(App.trial.q.correct); await wait(10);
    await trialAdvance(); await wait(10);
    const midStep = App.trial.step;
    setPlayMode('dungeon'); await wait(40);
    setPlayMode('climb'); await wait(40);
    if(App.trial.step !== midStep || App.trial.block !== 4) bad.push('crossing to the dungeon and back wiped the climb');
    log.push(['crossing over', 'block ' + App.trial.block + ' at step ' + App.trial.step + ' survives the switch']);
    App.character.trialBest = 1;

    openTrial(); await wait(60);
    if(App.playMode !== 'climb') bad.push('openTrial did not put Play into the climb');
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

    /* --- three doors, the answer printed on each --- */
    trialStart(); await wait(60);
    let doors = [...document.querySelectorAll('.trial-door')];
    if(doors.length !== 3) bad.push('there are ' + doors.length + ' doors, not 3');
    const printed = doors.map(d=>(d.querySelector('.td-board')||{}).textContent || '');
    const want = (App.trial.q.options||[]).map(String);
    log.push(['the doors', printed.join(' | ')]);
    if(printed.some(t=>!t.trim())) bad.push('a door has no answer printed on it');
    if(JSON.stringify(printed) !== JSON.stringify(want)) bad.push('the doors do not carry the options: ' + printed.join('|') + ' vs ' + want.join('|'));
    if(doors.some(d=>!d.querySelector('.td-svg'))) bad.push('a door is missing its door');
    if(doors.some(d=>d.disabled)) bad.push('the doors are shut before you have picked');

    /* picking the right one swings it open and shuts the others */
    const rightIdx = want.indexOf(String(App.trial.q.correct));
    doors[rightIdx].click(); await wait(120);
    doors = [...document.querySelectorAll('.trial-door')];
    if(!doors[rightIdx].classList.contains('open')) bad.push('the right door did not open');
    if(doors.some((d,i)=>i !== rightIdx && d.classList.contains('open'))) bad.push('a wrong door opened too');
    if(!doors[rightIdx].querySelector('.td-mark')) bad.push('the opened door is not marked');
    if(doors.some(d=>!d.disabled)) bad.push('a door is still pickable after the reveal');
    log.push(['a right pick', 'door ' + (rightIdx+1) + ' opens, the rest hold']);

    /* picking a wrong one shuts it AND still shows which door was the way on */
    await trialAdvance(); await wait(60);
    const want2 = (App.trial.q.options||[]).map(String);
    const right2 = want2.indexOf(String(App.trial.q.correct));
    const wrong2 = want2.findIndex((o,i)=>i !== right2);
    [...document.querySelectorAll('.trial-door')][wrong2].click(); await wait(120);
    doors = [...document.querySelectorAll('.trial-door')];
    if(!doors[wrong2].classList.contains('shut')) bad.push('the wrong door did not shut');
    if(!doors[right2].classList.contains('open')) bad.push('a wrong pick did not show the way on');
    if(!/td-mark bad|class="td-mark bad"/.test(doors[wrong2].innerHTML)) bad.push('the wrong door is not marked wrong');
    log.push(['a wrong pick', 'door ' + (wrong2+1) + ' shuts, door ' + (right2+1) + ' shows the way']);
    await trialAdvance(); await wait(40);

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

    /* --- and a run in progress locks the switch, same as the Play tab does --- */
    App.playMode = 'dungeon';
    App.character.classId='warrior'; startRun(); await wait(60);
    const runFloor = App.run.floor, runHp = App.run.hp;
    setTopTab('play'); await wait(60);
    if(document.querySelector('.play-pick')) bad.push('the mode switch is still offered mid-run — you must flee');
    setPlayMode('climb'); await wait(40);
    if(App.playMode !== 'dungeon') bad.push('the switch walked out of a live run');
    if(App.run.floor !== runFloor || App.run.hp !== runHp) bad.push('the climb changed the dungeon run');
    if(App.run.active === false) bad.push('the climb ended the run');
    log.push(['mid-run', 'switch hidden and refused, floor ' + App.run.floor + ', hp ' + App.run.hp]);
    return {bad, log};
  });
  (r.log||[]).forEach(x=>console.log(' ', String(x[0]).padEnd(18), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
