/* The rewarded-ad layer: the panel works both ways round, the per-run limits
   hold, a refusal costs nothing, and a game with no publisher ID never reaches
   out to anyone. The consent panel is driven through the DOM rather than
   stubbed, so what is tested is the path a player actually takes. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:900,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  /* The game already pulls fonts and a PDF reader from public CDNs. What must
     never happen with no publisher ID set is a call to an ad server. */
  const adCalls=[];
  p.on('request',r=>{ if(/googlesyndication|doubleclick|adsbygoogle|googleads/.test(r.url())) adCalls.push(r.url()); });
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(500);

  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    const wait = ms => new Promise(r=>setTimeout(r,ms));

    /* Answers the consent panel the moment it appears, the way a player would.
       Returns once whatever it was driving has settled. */
    async function answering(label, fn){
      const done = fn();
      for(let i=0;i<60;i++){
        const back = document.querySelector('.ad-back');
        if(back){
          const btn = [...back.querySelectorAll('button')].find(x=>x.textContent.indexOf(label)>=0);
          if(!btn){ bad.push('no "'+label+'" button on the panel'); back.remove(); break; }
          btn.click();
          break;
        }
        await wait(10);
      }
      return done;
    }
    let asked = 0;
    let grant = true;
    Ads.rewarded = async ()=>{ asked++; return grant; };   /* the ad itself, not the offer */

    /* 0. the three named entry points the rest of the game is allowed to call */
    ['showRewardedAd_Hint','showRewardedAd_Revive','showInterstitialAd'].forEach(n=>{
      if(typeof window[n] !== 'function') bad.push(n+' is missing');
    });

    App.topTab='play'; App.character.classId='warrior'; setRealm('math'); startRun();
    App.run.floor=3; App.run.monster=generateMonster(3,0);
    const mkq = ()=>({id:'q', cardId:null, prompt:'Which one?', correct:'right',
                      mode:'mcq', options:['right','wrong a','wrong b','wrong c'],
                      hintUsed:false, eliminatedIdx:null, difficulty:'medium',
                      why:'The right one is right because the tide comes in.', topic:'Tides'});

    /* 1. a fresh run carries the allowance, and an older save backfills it */
    if(adHintsLeft()!==AD_HINTS_PER_RUN) bad.push('run starts with '+adHintsLeft()+' hints, wanted '+AD_HINTS_PER_RUN);
    if(adRevivesLeft()!==AD_REVIVES_PER_RUN) bad.push('run starts with '+adRevivesLeft()+' revives');
    const old = defaultRun(); delete old.adHints; delete old.adRevives;
    backfill(old, defaultRun());
    if(old.adHints!==AD_HINTS_PER_RUN) bad.push('an older saved run does not backfill its hints');

    /* 2. "No thanks" is a real answer and costs nothing */
    App.currentQuestion = mkq(); App.currentPhase='question';
    await answering('No thanks', useAdHint);
    if(asked!==0) bad.push('"No thanks" played an ad anyway');
    if(adHintsLeft()!==AD_HINTS_PER_RUN) bad.push('"No thanks" still cost a hint');
    if(App.currentQuestion.hintUsed) bad.push('"No thanks" still gave the hint');

    /* 3. three hints, then no more, and each one lands on the question */
    for(let i=0;i<AD_HINTS_PER_RUN;i++){
      const before = adHintsLeft();
      App.currentQuestion = mkq();
      await answering('Watch an ad', useAdHint);
      const q = App.currentQuestion;
      if(!q.hintUsed) bad.push('hint '+(i+1)+' did not mark the question');
      if(q.eliminatedIdx==null) bad.push('hint '+(i+1)+' ruled nothing out');
      else if(q.options[q.eliminatedIdx]===q.correct) bad.push('hint '+(i+1)+' ruled out the right answer');
      if(adHintsLeft()!==before-1) bad.push('hint '+(i+1)+' did not cost a hint');
    }
    log.push(['hints left after '+AD_HINTS_PER_RUN, adHintsLeft()]);
    log.push(['ads played', asked]);
    if(adHintsLeft()!==0) bad.push('the allowance did not run out');
    const spent = asked;
    App.currentQuestion = mkq();
    await useAdHint();                                  /* no panel should even open */
    if(document.querySelector('.ad-back')){ document.querySelector('.ad-back').remove(); bad.push('offered a fourth ad past the limit'); }
    if(asked!==spent) bad.push('played a fourth ad past the limit');
    if(App.currentQuestion.hintUsed) bad.push('gave a fourth hint');

    /* 4. the hint says where to look and never says the answer */
    App.run.adHints = 1; App.currentQuestion = mkq();
    await answering('Watch an ad', useAdHint);
    const note = App.currentQuestion.hintNote || '';
    log.push(['hint text', note]);
    if(!note) bad.push('the hint came with no text');
    if(note.toLowerCase().indexOf('tides')<0) bad.push('the hint never names the topic it came from');
    if(/\bright\b/i.test(note.replace(/<[^>]*>/g,''))) bad.push('the hint contains the answer: '+note);

    /* 5. an ad that does not finish costs the player nothing */
    App.run.adHints = 2; App.currentQuestion = mkq(); grant = false;
    await answering('Watch an ad', useAdHint);
    if(adHintsLeft()!==2) bad.push('an unfinished ad still charged a hint');
    if(App.currentQuestion.hintUsed) bad.push('an unfinished ad still gave the hint');
    grant = true;

    /* 6. one revive, from the screen you died on, back into the same fight */
    App.run.hp=0; App.run.active=false; App.pendingRunBreak=true; App.dungeonView='death';
    const st = combatStats();
    await answering('Watch an ad', useAdRevive);
    log.push(['revived at', App.run.hp+'/'+st.maxHp]);
    if(!App.run.active) bad.push('revive did not restart the run');
    if(App.dungeonView!=='battle') bad.push('revive went to '+App.dungeonView+', not back to the fight');
    if(App.run.hp < Math.round(st.maxHp*0.45) || App.run.hp > Math.round(st.maxHp*0.55)) bad.push('revive hp is '+App.run.hp+', wanted about half of '+st.maxHp);
    if(adRevivesLeft()!==0) bad.push('revive did not spend the allowance');
    App.run.hp=0; App.run.active=false; App.dungeonView='death';
    await useAdRevive();
    if(document.querySelector('.ad-back')){ document.querySelector('.ad-back').remove(); bad.push('offered a second revive'); }
    if(App.run.active) bad.push('revived a second time in one run');

    /* 7. the between-runs break plays once per run, not once per exit */
    let breaks = 0;
    Ads.interstitial = async ()=>{ breaks++; };
    App.pendingRunBreak = true;
    await runEndBreak(); await runEndBreak(); await runEndBreak();
    log.push(['breaks after three exits from one run', breaks]);
    if(breaks!==1) bad.push('the run-end break played '+breaks+' times for one run');

    /* 8. taking the stairs plays a break; answering a question never does */
    let floorBreaks = 0, where = [];
    Ads.interstitial = async (w)=>{ floorBreaks++; where.push(w); };
    startRun();
    App.run.floor = 4;
    await descendTo(5);
    log.push(['descending to 5', floorBreaks+' break(s) '+JSON.stringify(where)]);
    if(AD_FLOOR_EVERY===1 && floorBreaks!==1) bad.push('taking the stairs played '+floorBreaks+' breaks');
    if(floorBreaks && where[0].indexOf('floor')<0) bad.push('the floor break is not labelled as one: '+where[0]);
    floorBreaks = 0;
    await descendTo(1);                                  /* the start of a run is not a transition */
    if(floorBreaks) bad.push('played a break on the way into floor 1');
    /* and nothing in answering a question reaches an ad */
    floorBreaks = 0; const beforeQ = asked;
    App.run.floor=3; App.run.monster=generateMonster(3,0); App.run.adHints=3;
    App.currentQuestion = mkq(); App.currentPhase='question';
    await submitAnswer('wrong a');
    if(floorBreaks || asked!==beforeQ) bad.push('answering a question played an ad');

    /* 9. WHOSE CONFIGURATION THIS IS.
       The publisher id SHIPS now - it used to be typed into Settings, which
       meant it lived in one browser's local storage and every other player
       had a blank one, so no real ad was ever requested and the game earned
       nothing from anybody. What must stay true either way: with no id the
       game claims nothing and calls nobody, and with an id it is the SAME id
       for everyone, so it cannot come from storage. */
    log.push(['configured', JSON.stringify(AD_CFG_CACHE)]);
    if(typeof AD_CLIENT !== 'string') bad.push('there is no shipped publisher id to fill in');
    if(AD_CFG_CACHE.client !== AD_CLIENT) bad.push('the live config does not match the shipped one');
    /* storage must not be able to change it - that was the whole bug */
    await Storage.set('adCfg', {client:'ca-pub-9999999999999999', test:true});
    AD_CFG_CACHE = null;
    const after = await getAdCfg();
    if(after.client !== AD_CLIENT) bad.push('a value in local storage overrode the shipped publisher id');
    if(typeof setAdCfg === 'function') bad.push('players can still write an ad config');
    if(!AD_CLIENT && Ads.ready()) bad.push('claims a live ad network with no publisher ID');

    /* 10. and neither panel is in the game any more */
    App.topTab = 'settings'; render();
    const txt = (document.getElementById('panel')||{}).textContent || '';
    if(/AdSense|publisher ID|Play a test break/i.test(txt)) bad.push('the ads panel is still in Settings');
    if(/sk-ant|Anthropic API Key|costs real money/i.test(txt)) bad.push('the paid AI key is still in Settings');
    if(document.querySelector('#key-input')) bad.push('there is still a key field');
    if(!/built-in generator/i.test(txt)) bad.push('Settings does not say where questions come from');
    /* the free routes, and only those */
    if(AI_MODELS.some(m=>m.provider === 'anthropic')) bad.push('a paid model is still offered');
    if(aiModelSpec('claude-opus-5').provider === 'anthropic') bad.push('an old save could still select a paid model');
    if(aiModelSpec('__offline__').provider === 'ollama') bad.push('the default would try a local server nobody has');
    log.push(['settings', 'no ads panel, no key field, ' + AI_MODELS.length + ' switchable model(s)']);
    return {bad, log};
  });

  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log(' ', 'ad-server requests  |', adCalls.length?adCalls.join(' '):'none');
  const bad = r.bad.concat(adCalls.length?['called an ad server with no publisher ID set: '+adCalls.join(' ')]:[]);
  console.log('\nfailures:', bad.length?'\n  '+bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(bad.length||errs.length?1:0);
})();
