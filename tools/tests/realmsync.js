const {chromium}=require('playwright');
/* THE SUBJECT YOU PICK AND THE GROUND YOU FIGHT ON.
   These were two separate settings. You could choose EALD in Study, walk into
   the dungeon, and be asked multiplication - because the realm was still
   Mathematics and nothing on the screen said so. Reported as "there are some
   maths questions in eald", which is exactly what it would look like from the
   outside. They move together now, both ways, except during a live run where
   swapping the ground under somebody would lose their floor. */
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
    const ids = App.subjects.map(s=>s.id);
    if(ids.indexOf('eald') < 0) bad.push('the EALD deck is not in the game');
    if(ids.indexOf('math') < 0) bad.push('Mathematics is not in the game');

    /* start in maths, then pick EALD in Study the way a person would */
    setRealmSilently('math');
    App.topTab='study'; App.studyView='notes'; render();
    await wait(80);
    const chips = Array.from(document.querySelectorAll('.subject-chip'));
    const ealdChip = chips.find(c=>/EALD/i.test(c.textContent));
    if(!ealdChip) { bad.push('no EALD chip in the subject bar'); return {bad, log}; }
    ealdChip.querySelector('span').click();
    await wait(80);
    log.push(['picked EALD in Study', 'realm is now ' + App.profileId]);
    if(App.profileId !== 'eald') bad.push('the realm stayed on ' + App.profileId + ' - this is the bug');
    if(App.activeSubjectId !== 'eald') bad.push('the study subject did not change');

    /* and what the dungeon would actually ask */
    const asked = [];
    for(let i=0;i<25;i++){
      const q = buildQuestion('medium', questionSources(), 4);
      if(q) asked.push(String(q.prompt||''));
    }
    const mathy = asked.filter(x=>/×|\d+\s*[*×]\s*\d|multiplied|times table/i.test(x));
    if(mathy.length) bad.push(mathy.length + ' of 25 questions were multiplication: ' + mathy[0].slice(0,50));
    log.push(['25 questions in that realm', mathy.length + ' multiplication']);

    /* the other way round */
    setRealm('math');
    await wait(60);
    if(App.activeSubjectId !== 'math') bad.push('entering the Mathematics realm did not move the Study subject');
    log.push(['entered the maths realm', 'study subject is now ' + App.activeSubjectId]);

    /* and a live run is NOT yanked out from under you */
    setRealmSilently('math');
    App.character.classId = 'warrior'; startRun();
    App.run.active = true;
    App.topTab='study'; render(); await wait(60);
    const chip2 = Array.from(document.querySelectorAll('.subject-chip')).find(c=>/EALD/i.test(c.textContent));
    if(chip2) chip2.querySelector('span').click();
    await wait(60);
    if(App.profileId !== 'math') bad.push('a live run was moved to another realm mid-floor');
    log.push(['mid-run', 'realm stayed on ' + App.profileId + ', study subject ' + App.activeSubjectId]);
    return {bad, log};
  });
  (r.log||[]).forEach(x=>console.log(' ', String(x[0]).padEnd(28), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
