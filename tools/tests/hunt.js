const {chromium}=require('playwright');
const R=[]; const bug=(a,b)=>R.push(a+': '+b);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{ const t=m.text(); if(m.type()==='error' && !/ERR_|net::/.test(t)) errs.push('console: '+t); });
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(500);

  // --- 1. every screen and sub-tab, for every class
  let r = await p.evaluate(()=>{
    const bad=[];
    for(const c of Object.keys(CLASSES)){
      App.character.classId=c; App.topTab='play'; setRealm('math'); startRun();
      for(const v of ['hub','battle','inventory','craft','index','gemshop','select','explore','checkpoint','bossrush']){
        for(const it of ['weapons','armor','relics','artifacts','bestiary']){
          App.dungeonView=v; App.indexTab=it; App.exploreResult=null; App.checkpointResult=null;
          try{ render(); }catch(e){ bad.push(c+'/'+v+'/'+it+': '+e.message); }
        }
      }
      for(const inv of ['backpack','cores','stash','shrine']){
        App.dungeonView='inventory'; App.invTab=inv;
        try{ render(); }catch(e){ bad.push(c+'/inv/'+inv+': '+e.message); }
      }
      for(const t of ['study','characters','play']){ App.topTab=t;
        for(const st of ['notes','upload','flashcards','quiz','settings']){ App.studyTab=st;
          try{ render(); }catch(e){ bad.push(c+'/'+t+'/'+st+': '+e.message); } } }
    }
    return bad;
  });
  r.forEach(x=>bug('render', x));

  // --- 2. a long run: 100 floors, every difficulty, all classes
  r = await p.evaluate(async()=>{
    const bad=[]; 
    for(const c of ['warrior','mage','rogue','cleric','brawler']){
      App.topTab='play'; App.character.classId=c; setRealm('math'); startRun();
      for(let f=1; f<=100; f++){
        App.run.floor=f; App.run.monster=generateMonster(f,0); App.run.openedFloor=false;
        const m=App.run.monster;
        if(!m || !m.name || !(m.hp>0) || !(m.maxHp>0)) { bad.push(c+' floor '+f+' bad monster'); break; }
        if(!CRE_SHEET[m.arche]) bad.push(c+' floor '+f+' no sheet for '+m.arche);
        for(const d of ['easy','medium','hard']){
          App.currentPhase='difficulty';
          try{ chooseDifficulty(d); }catch(e){ bad.push(c+' f'+f+' '+d+': '+e.message); continue; }
          const q=App.currentQuestion;
          if(!q || q.correct===undefined) { bad.push(c+' f'+f+' '+d+' no question'); continue; }
          // arithmetic: substitute the answer for '?' and check both sides balance
          const txt=String(q.prompt||'').replace(/×/g,'*').replace(/\s/g,'');
          const mm=txt.match(/^([\d*?]+)=([\d?]+)$/);
          if(mm){
            const lhs=mm[1].replace('?', q.correct), rhs=mm[2].replace('?', q.correct);
            let lv=0; try{ lv=lhs.split('*').reduce((a,b)=>a*(+b),1); }catch(e){}
            if(lv !== +rhs) bad.push('MATH '+q.prompt+' ans='+q.correct);
          } else bad.push('UNPARSED '+q.prompt);
          if(q.mode==='mcq'){
            if(!q.options || q.options.length!==DIFFS[d].opts) bad.push('OPTS count '+((q.options||[]).length)+' for '+d);
            else if(!q.options.includes(String(q.correct))) bad.push('OPTS missing answer: '+q.prompt);
            else if(new Set(q.options).size!==q.options.length) bad.push('OPTS duplicate: '+q.prompt+' '+q.options);
          } else if(q.options && q.options.length) bad.push('hard question got options');
        }
      }
    }
    return bad;
  });
  r.slice(0,12).forEach(x=>bug('run', x));
  if(r.length>12) bug('run', '... and '+(r.length-12)+' more');

  // --- 3. combat edge cases
  r = await p.evaluate(async()=>{
    const bad=[];
    App.topTab='play'; App.character.classId='brawler'; setRealm('math'); startRun();
    // a multi-hit ultimate against a monster that dies on hit 1
    App.run.monster.hp=1; App.run.energy=9;
    try{ await useSkillById('brawler_flurry'); }catch(e){ bad.push('flurry vs 1hp: '+e.message); }
    if(App.run.monster.hp>0 && App.run.monster.hp<1) bad.push('monster hp fractional: '+App.run.monster.hp);
    // spending more energy than held
    App.character.classId='mage'; setRealm('math'); startRun(); App.run.energy=0;
    const before=App.run.monster.hp;
    try{ await useSkillById('mage_fireball'); }catch(e){ bad.push('ult w/o energy: '+e.message); }
    if(App.run.monster.hp!==before) bad.push('ultimate fired with 0 energy');
    if(App.run.energy<0) bad.push('energy went negative: '+App.run.energy);
    // death and revive
    App.character.classId='warrior'; setRealm('math'); startRun();
    App.run.hp=1; App.run.monster.hp=9e8;
    try{ await resolveMonsterHit(); }catch(e){ bad.push('lethal hit: '+e.message); }
    if(App.run.hp<0) bad.push('hp went negative: '+App.run.hp);
    return bad;
  });
  r.forEach(x=>bug('combat', x));

  // --- 4. save / load round trip and realm isolation
  r = await p.evaluate(async()=>{
    const bad=[];
    App.topTab='play'; App.character.classId='rogue'; setRealm('math'); startRun();
    App.run.floor=17; App.character.gold=1234; await saveCharacter();
    const raw = await Storage.get('profiles', null);
    if(!raw) bad.push('no profiles saved');
    const size = JSON.stringify(raw||{}).length;
    if(size > 400000) bad.push('save is '+size+' bytes');
    await loadAll();
    if(App.character.gold!==1234) bad.push('gold lost on reload: '+App.character.gold);
    return bad.concat(['save bytes='+JSON.stringify(raw||{}).length]);
  });
  r.forEach(x=>bug('save', x));

  // --- 5. study tools with no live AI, which is now the default and the
  //        only thing most people will ever run: the built-in generator
  //        has to carry the whole feature on its own
  r = await p.evaluate(async()=>{
    const bad=[];
    try{
      const out = localAnalyze('Photosynthesis converts light into sugar. Mitochondria make ATP for the cell. Chlorophyll absorbs red and blue light.');
      if(!out || !out.flashcards || !out.flashcards.length) bad.push('offline generator made no flashcards');
      if(!out || !out.notes) bad.push('offline generator made no notes');
    }catch(e){ bad.push('offline generator: '+e.message); }
    return bad;
  });
  r.forEach(x=>bug('study', x));

  // --- 6. mobile viewport
  await p.setViewportSize({width:390, height:844});
  await p.evaluate(()=>{ App.topTab='play'; setRealm('math'); startRun(); App.dungeonView='battle'; render(); });
  await p.waitForTimeout(400);
  const m = await p.evaluate(()=>({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  if(m.scrollW > m.clientW + 1) bug('mobile', 'horizontal overflow '+m.scrollW+' > '+m.clientW);
  await p.screenshot({path:'/tmp/pw/hunt_mobile.png'});

  console.log(R.length ? R.join('\n') : 'no issues found');
  console.log('\npage errors:', errs.length?errs:'none');
  await b.close();
})();
