const {chromium}=require('playwright');
/* Two decks written off two PDFs, kept apart because they do different jobs:
   vocabulary is about WRITING the essay, the concept bank is about the FILM.
   What has to hold for both is what holds for every hand-written deck - four
   distinct options on every card, the answer never visible in the question,
   and the wrong answers drawn from the same family. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1100,height:950}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(1100);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.waitForTimeout(800);
  const r = await p.evaluate(()=>{
    const bad=[], log=[];
    const want = ['truman-vocab','truman-concepts','tman'];
    want.forEach(id=>{ if(!App.subjects.find(x=>x.id===id)) bad.push(id + ' is not in the game'); });
    /* and they are SEPARATE subjects, which is the whole request */
    if(App.subjects.filter(x=>/^truman-/.test(x.id)).length !== 2) bad.push('the two files were not kept apart');
    /* TMAN is the player's own 60-question bank, and the options came with the
       questions - so every one must have kept its four, unchanged */
    const tm = App.subjects.find(x=>x.id==='tman');
    if(tm){
      if(tm.flashcards.length !== 60) bad.push('TMAN has ' + tm.flashcards.length + ' questions, not 60');
      const tops = {};
      tm.flashcards.forEach(c=>{ tops[c.topic] = (tops[c.topic]||0)+1; });
      Object.keys(tops).forEach(k=>{ if(tops[k] !== 20) bad.push('TMAN tier "' + k + '" has ' + tops[k] + ', not 20'); });
      if(Object.keys(tops).length !== 3) bad.push('TMAN has ' + Object.keys(tops).length + ' tiers, not 3');
      const weir = tm.flashcards.find(c=>/Who directed/.test(c.front));
      if(!weir) bad.push('TMAN lost the first question');
      else if(weir.back !== 'Peter Weir') bad.push('TMAN answer changed: ' + weir.back);
      else if((weir.wrong||[]).indexOf('Andrew Niccol') < 0) bad.push('TMAN lost a written distractor');
    }

    want.forEach(id=>{
      const s = App.subjects.find(x=>x.id===id);
      if(!s) return;
      const fronts = new Set();
      s.flashcards.forEach(c=>{
        if(fronts.has(c.front)) bad.push(id + ': duplicate card ' + c.front.slice(0,40));
        fronts.add(c.front);
        const opts = [c.back].concat(c.wrong||[]);
        if(opts.length !== 4) bad.push(id + ': ' + opts.length + ' options on ' + c.front.slice(0,40));
        if(new Set(opts.map(normText)).size !== opts.length) bad.push(id + ': a repeated option on ' + c.front.slice(0,40));
        if(String(c.back).length > 6 && String(c.front).indexOf(String(c.back)) >= 0)
          bad.push(id + ': the answer is in the question — ' + c.front.slice(0,50));
      });
      log.push([s.name, s.flashcards.length + ' cards, ' + (s.terms||[]).length + ' terms, '
                + [...new Set(s.flashcards.map(c=>c.topic))].length + ' topics']);
    });

    /* each one asks its own questions in its own realm, and no maths */
    const seen = {};
    want.forEach(id=>{
      App.profileId = id; setRealm(id);
      const asked = [];
      for(let i=0;i<20;i++){ const q = buildQuestion('medium', questionSources(), 4); if(q) asked.push(String(q.prompt||'')); }
      seen[id] = asked;
      if(asked.some(x=>/×|multiplied|Red Planet|World War/.test(x))) bad.push(id + ' served a question from another subject');
      if(!asked.length) bad.push(id + ' produced no questions at all');
    });
    /* the two decks must not be asking the same things */
    const a = new Set(seen['truman-vocab']||[]), c = seen['truman-concepts']||[];
    const overlap = c.filter(x=>a.has(x)).length;
    if(overlap) bad.push(overlap + ' questions appear in BOTH decks');
    log.push(['kept apart', '20 questions each, ' + overlap + ' shared']);
    return {bad, log};
  });
  (r.log||[]).forEach(x=>console.log(' ', String(x[0]).padEnd(34), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.slice(0,12).join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
