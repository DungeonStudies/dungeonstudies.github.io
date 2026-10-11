/* Exam mode, the glossary question, the Block guard, and the endless descent.
   The question worth asking of all of it is whether the MARK reaches the
   DAMAGE, because that is the whole mechanic: a 14/15 has to hit harder than
   a 7/15, and a blank page has to do nothing at all. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:980,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){ TUT.on=false; TUT.seen=true; } });
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);

  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    const wait = ms => new Promise(r=>setTimeout(r,ms));

    /* ---------- a subject with something to examine ---------- */
    const subj = App.subjects.find(s=>!s.builtin) || App.subjects[App.subjects.length-1];
    subj.notes = 'Arousal is the level of physiological activation in the body before performance.\n\n'
               + 'Adrenaline is the hormone released by the adrenal glands that raises heart rate.\n\n'
               + 'Anxiety is the negative emotional response to a perceived threat in competition.';
    subj.syllabus = 'Students learn about the physiological and psychological factors affecting performance.';
    subj.terms = [
      makeTerm('arousal',    'the level of physiological activation in the body before performance', 'performance'),
      makeTerm('adrenaline', 'the hormone released by the adrenal glands that raises heart rate',    'performance'),
      makeTerm('anxiety',    'the negative emotional response to a perceived threat',                'performance'),
      makeTerm('mitosis',    'the division of a cell into two identical daughter cells',             'cells'),
      makeTerm('osmosis',    'the movement of water across a semipermeable membrane',                'cells'),
    ];
    subj.flashcards = subj.flashcards && subj.flashcards.length ? subj.flashcards
      : [makeCard('Which hormone raises heart rate before performance?','adrenaline',{why:'The adrenal glands release it.',topic:'performance'})];
    App.subjects.forEach(normalizeSubject);
    await saveSubjects();

    /* ---------- 1. the mark tiers, and who is allowed them ---------- */
    log.push(['tiers', MARK_VALUES.join(' ')]);
    if(tiersFor('easy').some(t=>t.marks>4))   bad.push('Easy was offered a marker over 4');
    if(tiersFor('medium').some(t=>t.marks>6)) bad.push('Medium was offered a marker over 6');
    if(!tiersFor('hard').some(t=>t.marks>=8)) bad.push('Hard cannot reach an 8-marker, which is the only reason to take it');
    if(tiersFor('hard').length !== MARK_TIERS.length) bad.push('Hard cannot reach every marker');
    /* and the floor still decides which one, inside that cap */
    const deep = examTierFor(100,'hard').marks, shallow = examTierFor(10,'hard').marks;
    if(!(deep > shallow)) bad.push('floor 100 asks '+deep+' marks and floor 10 asks '+shallow+' - the paper does not get longer');
    if(examTierFor(100,'easy').marks > 4) bad.push('Easy got handed the floor-100 marker anyway');
    log.push(['floor 10 / 100 on hard', shallow+' then '+deep+' marks']);

    /* ---------- 2. the mark IS the multiplier ---------- */
    const z = examMultiplier(0,15), half = examMultiplier(8,15), full = examMultiplier(15,15);
    if(z.mult !== 0) bad.push('a blank page still did '+z.mult+'x damage');
    if(!(half.mult > 0.9 && half.mult < 1.2)) bad.push('half marks came out at x'+half.mult+', which is not an ordinary hit');
    if(!(full.mult > half.mult * 1.8)) bad.push('full marks (x'+full.mult+') is not worth much more than half (x'+half.mult+')');
    let last = -1, mono = true;
    for(let a=0;a<=15;a++){ const m = examMultiplier(a,15).mult; if(m < last) mono = false; last = m; }
    if(!mono) bad.push('an extra mark somewhere made the strike weaker');
    log.push(['0 / 8 / 15 of 15', 'x'+z.mult+'  x'+half.mult+'  x'+full.mult]);
    /* and a two-marker cannot pay what a twenty-marker pays */
    const small = examMultiplier(2,2).mult, big = examMultiplier(20,20).mult;
    if(!(small < big)) bad.push('a full 2-marker (x'+small+') strikes as hard as a full 20-marker (x'+big+')');
    if(examMultiplier(1,2).mult > examMultiplier(10,20).mult + 0.02) bad.push('half marks pay differently by question size');
    log.push(['full 2 vs full 20', 'x'+small+' vs x'+big]);

    /* ---------- 3. off, nothing asks you to write ---------- */
    await setExamMode(false);
    App.character.classId='warrior'; setRealm(subj.id); startRun();
    let written = 0, term = 0, kinds = {};
    for(let i=0;i<260;i++){
      App.run.floor = 1 + (i % 40);
      App.run.monster = generateMonster(App.run.floor, 0);
      const q = buildQuestion(i%3===0?'hard':(i%3===1?'medium':'easy'));
      kinds[q.mode] = (kinds[q.mode]||0)+1;
      if(q.mode==='written') written++;
      if(q.kind==='term') term++;
      if(!q.prompt) bad.push('a question came out with no prompt');
      if(q.mode==='mcq' && (!q.options || q.options.length<2)) bad.push('an mcq came out with '+(q.options||[]).length+' options');
      if(q.mode==='mcq' && q.options.indexOf(q.correct)<0) bad.push('an mcq does not contain its own answer');
    }
    if(written) bad.push('exam mode is OFF and '+written+' questions still asked for an essay');
    if(!term) bad.push('the glossary never came up - "here is the description, name the term" never got asked');
    log.push(['exam off', JSON.stringify(kinds)+', '+term+' glossary']);

    /* the glossary question has to be answerable and its distractors real */
    for(let i=0;i<40;i++){
      const q = buildTermQuestion(subj,'medium');
      if(q.mode==='mcq'){
        if(q.options.indexOf(q.correct)<0) bad.push('a glossary question does not contain its own answer');
        if(new Set(q.options.map(normText)).size !== q.options.length) bad.push('a glossary question repeated an option');
      }
      if(/which term is being described/i.test(q.prompt) && normText(q.prompt).indexOf(normText(q.correct))>=0)
        bad.push('the description gives the term away: '+q.prompt);
    }

    /* ---------- 4. on, a boss floor is a paper and nothing else ---------- */
    await setExamMode(true);
    let bossWritten = 0, bossMcq = 0, floorWritten = 0;
    for(let i=0;i<60;i++){
      App.run.floor = 10 * (1 + (i % 10));
      App.run.monster = generateMonster(App.run.floor, 0);
      const q = buildQuestion('hard');
      if(q.mode==='written') bossWritten++; else bossMcq++;
      if(q.mode==='written' && !(q.criteria||[]).length) bad.push('a '+q.marks+'-marker arrived with no marking guideline');
      if(q.mode==='written' && !q.marks) bad.push('a written question arrived worth no marks');
    }
    if(bossMcq) bad.push(bossMcq+' boss floors offered multiple choice in exam mode');
    for(let i=0;i<200;i++){
      App.run.floor = 1 + (i % 9);
      App.run.monster = generateMonster(App.run.floor, 0);
      if(buildQuestion('hard').mode==='written') floorWritten++;
    }
    if(!floorWritten) bad.push('exam mode never asked for a short written answer on an ordinary floor');
    if(floorWritten > 160) bad.push('exam mode asked for writing on '+floorWritten+' of 200 ordinary floors - it is meant to be mixed');
    log.push(['exam on', bossWritten+'/60 boss floors written, '+floorWritten+'/200 ordinary floors written']);

    /* ---------- 5. the offline marker reads the guideline ---------- */
    const q12 = offlineExamQuestion(subj, 12);
    if(!q12.prompt || !q12.criteria.length) bad.push('the offline writer produced nothing usable');
    if(q12.criteria.reduce((n,c)=>n+c.marks,0) !== 12) bad.push('the offline guideline adds up to '+q12.criteria.reduce((n,c)=>n+c.marks,0)+', not 12');
    const blank = offlineMark(q12, '');
    if(blank.awarded !== 0) bad.push('a blank page scored '+blank.awarded);
    const good = offlineMark(q12, q12.criteria.map(c=>c.text).join('. ') + '. ' + 'x '.repeat(500) + '\n\nSecond paragraph.');
    const poor = offlineMark(q12, 'I think it is important and it matters a lot for many reasons.');
    if(!(good.awarded > poor.awarded)) bad.push('covering every criterion ('+good.awarded+') scored no better than waffle ('+poor.awarded+')');
    log.push(['offline marker on a 12', 'blank '+blank.awarded+', waffle '+poor.awarded+', covered '+good.awarded]);

    /* ---------- 6. the mark reaches the damage ---------- */
    App.run.floor = 40; App.run.monster = generateMonster(40, 0);
    App.run.difficulty = 'hard';
    const hpAt = async mult => {
      App.run.monster = generateMonster(40, 0);
      App.run.monster.hp = App.run.monster.maxHp = 2000000;
      App.run.examMult = mult;
      App.run.energy = 9;
      await resolvePlayerHit(1, {id:'t', type:'physical', noCrit:true}, false, false, {id:'t',name:'t'});
      return 2000000 - App.run.monster.hp;
    };
    const dLow = await hpAt(0.35), dHigh = await hpAt(2.75);
    if(!(dHigh > dLow * 4)) bad.push('a Band 6 response ('+dHigh+') did not hit far harder than a Band 1 ('+dLow+')');
    log.push(['damage at x0.35 vs x2.75', dLow+' then '+dHigh]);
    App.run.examMult = 0;

    /* and the whole submit path, end to end, with no AI anywhere */
    await setApiKey('');
    App.run.floor = 50; App.run.monster = generateMonster(50, 0);
    App.run.hp = App.run.maxHp = 9999;
    App.currentQuestion = buildExamQuestion('hard', questionSources(), 50);
    App.currentPhase = 'question'; App.dungeonView='battle'; render(); await wait(300);
    if(!document.querySelector('.exam-sheet')) bad.push('the written question drew no sheet to write on');
    if(!document.querySelector('.exam-marks')) bad.push('the written question never says what it is worth');
    const crit = (App.currentQuestion.criteria||[]).map(c=>c.text).join('. ');
    await submitWritten(crit + '. ' + 'detail '.repeat(400) + '\n\nSecond paragraph, with a judgement.');
    await wait(200);
    if(App.currentPhase !== 'marked') bad.push('after marking the game sat in phase '+App.currentPhase);
    if(!App.examResult) bad.push('nothing came back from the marker');
    if(!document.querySelector('.marked-score')) bad.push('the marked paper never showed a score');
    if(!(App.run.examMult > 0)) bad.push('a covered response set a multiplier of '+App.run.examMult);
    log.push(['end to end', App.examResult.awarded+'/'+App.examResult.max+' -> x'+App.run.examMult+' ('+(App.examResult.offline?'offline':'ai')+')']);
    await continueFromMarked(); await wait(250);
    if(App.currentPhase !== 'skillmenu') bad.push('a marked pass did not reach the skill menu (phase '+App.currentPhase+')');

    /* a blank page is a miss: the thing takes its turn. HP has to be inside
       what the hero can actually hold, because the hit is clamped to it -
       parking 9999 in there and watching it come back as 120 says nothing. */
    App.run.floor = 50; App.run.monster = generateMonster(50, 0);
    App.run.monster.atk = 8; App.run.monster.cunning = 0; App.run.monster.kit = [];
    App.run.hp = combatStats().maxHp;
    App.currentQuestion = buildExamQuestion('hard', questionSources(), 50);
    App.currentPhase = 'question';
    await submitWritten(''); await wait(150);
    if(App.examResult.awarded !== 0) bad.push('an empty page was awarded '+App.examResult.awarded);
    if(App.run.examMult !== 0) bad.push('an empty page still set a multiplier');
    const hpWas = App.run.hp;
    await continueFromMarked();
    if(App.run.hp >= hpWas && App.run.active) bad.push('a non-attempt cost nothing - the monster never swung');
    log.push(['non-attempt', hpWas+' -> '+App.run.hp+' HP']);

    /* ---------- 6b. a deck file carries the glossary with it ---------- */
    const gloss = App.subjects.find(x=>(x.terms||[]).length>=4);
    gloss.syllabus = gloss.syllabus || 'Outcomes for this course.';
    const json = deckToJson(gloss);
    const back = deckFromJson(json);
    if((back.terms||[]).length !== gloss.terms.length)
      bad.push('a deck file lost the glossary: '+(back.terms||[]).length+' of '+gloss.terms.length+' terms survived');
    if(back.syllabus !== gloss.syllabus) bad.push('a deck file lost the syllabus');
    const empty = normalizeSubject({id:'tmp', name:'tmp', flashcards:[], notes:''});
    const merged = mergeDeck(empty, back);
    if(!merged.terms) bad.push('importing a deck into an empty subject brought no terms');
    if(empty.syllabus !== gloss.syllabus) bad.push('importing did not fill an empty syllabus');
    /* and it never overwrites one you already wrote */
    const mine = normalizeSubject({id:'t2', name:'t2', flashcards:[], notes:'', syllabus:'mine'});
    mergeDeck(mine, back);
    if(mine.syllabus !== 'mine') bad.push('importing overwrote a syllabus that was already there');
    log.push(['deck round trip', back.terms.length+' terms, '+back.cards.length+' cards']);

    /* ---------- 7. Block, on every class ---------- */
    Object.keys(CLASSES).forEach(cid=>{
      App.character.classId = cid;
      if(!currentSkillSet().some(s=>s && s.id==='block')) bad.push(CLASSES[cid].name+' has no Block');
    });
    App.character.classId = 'warrior';
    App.run.shieldPct = 0;
    await applySkillSelfEffects(SKILLS.block, combatStats(), getBattleEls());
    if(Math.abs(App.run.shieldPct - 0.5) > 0.001) bad.push('Block set the guard to '+App.run.shieldPct+', not a half');
    /* and it never weakens a stronger guard already up */
    App.run.shieldPct = 0.6;
    await applySkillSelfEffects(SKILLS.block, combatStats(), getBattleEls());
    if(App.run.shieldPct !== 0.6) bad.push('Block downgraded a 60% guard to '+App.run.shieldPct);
    /* the halving actually lands. A monster swing carries +-15% and the
       clamp to maxHp means a big hit tells you nothing, so this is averaged
       over several swings on an ordinary floor, sized to take about a third
       of the bar, with nothing that could charge or cast getting in the way. */
    startRun(); App.run.floor = 44;
    const swing = async guard => {
      let total = 0;
      for(let i=0;i<6;i++){
        const st0 = combatStats();
        App.run.monster = generateMonster(44, 0);
        App.run.monster.cunning = 0; App.run.monster.kit = []; App.run.monster.energyMax = 99;
        App.run.monster.atk = Math.round(0.30*st0.maxHp + st0.def*0.5);
        App.run.hp = st0.maxHp;
        App.run.shieldPct = guard ? BLOCK_CUT : 0;
        App.run.nullifyNextWrong = false;
        await resolveMonsterHit();
        total += st0.maxHp - App.run.hp;
        if(App.run.hp <= 0) startRun(), App.run.floor = 44;
      }
      return total;
    };
    const tookGuarded = await swing(true), tookBare = await swing(false);
    if(!(tookGuarded < tookBare * 0.72)) bad.push('six guarded swings took '+tookGuarded+' and six bare took '+tookBare+' - Block is not halving anything');
    if(App.run.shieldPct !== 0) bad.push('the guard was not spent by the hit it stopped');
    log.push(['block over 6 swings', 'guarded '+tookGuarded+' vs bare '+tookBare]);
    if(!SKILLS.block.noDamage) bad.push('Block deals damage, so it costs nothing at all');

    /* ---------- 8. the endless descent ---------- */
    setRealm(INFINITY_ID);
    if(isFinalFloor(100)) bad.push('Infinity still has a final boss on floor 100');
    if(floorCap() !== '∞') bad.push('Infinity still counts up to a hundred');
    const seen = {};
    for(const f of [100, 101, 110, 150, 200, 237, 310]){
      const m = generateMonster(f, 0);
      if(!m || !m.name) bad.push('floor '+f+' generated nothing');
      if(m.isFinal) bad.push('floor '+f+' spawned the final boss');
      if(isBossFloor(f) && !m.isBoss) bad.push('floor '+f+' is a ten and had no boss');
      if(!(m.maxHp > 0 && m.atk > 0)) bad.push('floor '+f+' spawned something with no stats');
      seen[f] = m.name + ' / ' + m.bandName + ' / ' + m.maxHp + 'hp';
    }
    if(!(generateMonster(210,0).maxHp > generateMonster(110,0).maxHp)) bad.push('the numbers stopped climbing past the first descent');
    if(descentOf(100)!==1 || descentOf(101)!==2 || descentOf(200)!==2 || descentOf(201)!==3)
      bad.push('the descent count is wrong: '+[100,101,200,201].map(descentOf).join(' '));
    if(cycleFloor(110)!==10 || cycleFloor(200)!==100) bad.push('the wrap is wrong: '+cycleFloor(110)+' '+cycleFloor(200));
    if(!/Descent II/.test(generateMonster(150,0).bandName)) bad.push('a second-descent floor does not say which descent it is');
    Object.keys(seen).forEach(f=>log.push(['floor '+f, seen[f]]));
    /* and a subject realm still ends */
    setRealm(subj.id);
    if(!isFinalFloor(100)) bad.push('a subject realm lost its final boss too');
    if(floorCap() !== '100') bad.push('a subject realm stopped counting to a hundred');

    /* ---------- 9. the bugs that were found after the fact ---------- */
    /* a one-word criterion used to be unscoreable: no word over four letters,
       so no keywords, so never met however exactly it was answered */
    const shortQ = {marks:2, criteria:[{text:'ATP', marks:1},{text:'the cell\u2019s energy currency', marks:1}]};
    const shortA = 'ATP. It is the energy currency of the cell and it drives active transport across every membrane in the body, '
                 + 'and without it the sodium potassium pump stops and the cell can no longer hold its resting potential.';
    const short = offlineMark(shortQ, shortA);
    /* the bug was that a criterion with no word over four letters produced no
       keywords at all, so it could never be met however exactly it was said */
    short.criteria.forEach(c=>{ if(!c.met) bad.push('criterion "'+c.text+'" was not credited though the answer says it'); });
    if(short.awarded < 2) bad.push('a fully covered 2-marker scored '+short.awarded+'/2');
    /* and length is still a real ceiling: the same points, said too briefly */
    const brief = offlineMark(shortQ, 'ATP, the energy currency of the cell.');
    if(brief.awarded >= short.awarded) bad.push('a one-line answer scored the same as a full one');
    log.push(['short criteria', 'full '+short.awarded+'/2, brief '+brief.awarded+'/2, met '+short.criteria.map(c=>c.met).join(',')]);

    /* a term with no definition is not a question */
    const blanky = normalizeSubject({id:'bl',name:'Bl',flashcards:[],notes:'',
      terms:[makeTerm('aa',''),makeTerm('bb',''),makeTerm('cc',''),makeTerm('dd','')]});
    let blanks = 0;
    for(let i=0;i<20;i++){
      let q; try{ q = buildTermQuestion(blanky,'medium'); }
      catch(e){ bad.push('a glossary of blanks threw: '+e.message); break; }
      if(/described\? \u2014 *$/.test(q.prompt||'')) blanks++;
    }
    if(blanks) bad.push(blanks+' questions asked you to name a term with no description');

    /* a subject with notes but nothing to read a definition out of must not be
       examined on the demo deck's content under its own name */
    const notesOnly = normalizeSubject({id:'no2',name:'NotesOnly',flashcards:[],notes:'Some prose about things.'});
    const nq = offlineExamQuestion(notesOnly, 8);
    ['Romeo','Pacific','H2O','prime'].forEach(w=>{
      if(nq.prompt.indexOf(w) >= 0) bad.push('a notes-only subject was examined on the demo deck: '+nq.prompt);
    });
    log.push(['notes-only question', '"'+nq.prompt.slice(0,52)+'"']);

    /* a fresh install has the fields the rest of the game reads by name */
    const fresh = defaultSubjects()[0];
    ['terms','exams','syllabus'].forEach(k=>{ if(!(k in fresh)) bad.push('defaultSubjects() has no '+k); });

    /* one click is one action */
    await setExamMode(false);
    setRealm(App.subjects[0].id); startRun();
    App.run.floor = 11; App.run.monster = generateMonster(11, 0);
    App.run.monster.atk = 4; App.run.monster.cunning = 0; App.run.monster.kit = [];
    App.run.hp = combatStats().maxHp;
    App.currentQuestion = buildQuestion('medium');
    App.currentPhase = 'question';
    const n0 = App.character.totalAnswered;
    const wrongOpt = (App.currentQuestion.options||[]).find(o=>o!==App.currentQuestion.correct) || 'zzzz';
    await Promise.all([submitAnswer(wrongOpt), submitAnswer(wrongOpt)]);
    await wait(400);
    if(App.character.totalAnswered - n0 !== 1)
      bad.push('a double tap answered the question '+(App.character.totalAnswered-n0)+' times');
    App.run.floor = 11; App.run.monster = generateMonster(11, 0);
    App.run.monster.hp = App.run.monster.maxHp = 500000;
    App.run.energy = 9; App.currentPhase = 'skillmenu';
    const mhp = App.run.monster.hp;
    await Promise.all([useSkillById('warrior_slash'), useSkillById('warrior_slash')]);
    const hits = App.run.monster.hp < mhp ? 1 : 0;
    log.push(['double tap', 'answered once, '+(mhp-App.run.monster.hp)+' damage from a doubled click']);
    if(!hits) bad.push('the doubled skill click dealt nothing at all');

    /* ---------- 10. the tour and the help page know about all of it ---------- */
    const tourText = TUTORIAL.map(s2=>s2.title+' '+s2.text).join(' ').toLowerCase();
    [['exam mode','exam mode'],['the mark as damage','mark'],['block','block'],
     ['the glossary','glossary'],['the syllabus','syllabus'],['infinity being endless','no bottom'],
     ['local versus','local versus']]
      .forEach(([what,word])=>{ if(tourText.indexOf(word) < 0) bad.push('the tour never mentions '+what); });
    App.topTab='settings'; render(); await wait(200);
    if(!document.querySelector('#exam-on')) bad.push('Settings has no exam mode switch');
    const helpTitles = [...document.querySelectorAll('.help-step h3')].map(h=>h.textContent);
    if(helpTitles.length !== TUTORIAL.length + 1)
      bad.push('Help shows '+helpTitles.length+' sections for '+TUTORIAL.length+' tour steps plus the numbers');
    if(document.querySelectorAll('.help-tbl').length !== 2) bad.push('the Help reference lost a table');
    const nums = (document.querySelector('.help-numbers')||{}).textContent || '';
    [String(MARK_TIERS[0].marks), String(MARK_TIERS[MARK_TIERS.length-1].marks),
     EXAM_CURVE[EXAM_CURVE.length-1].band, String(Math.round(BLOCK_CUT*100))]
      .forEach(v=>{ if(nums.indexOf(v) < 0) bad.push('the Help reference does not print '+v); });
    log.push(['tour / help', TUTORIAL.length+' steps, '+helpTitles.length+' help sections']);

    await setExamMode(false);
    return {bad, log};
  });

  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
