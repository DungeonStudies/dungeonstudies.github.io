const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const ctx=await b.newContext({viewport:{width:1200,height:860}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e.stack||e).split('\n').slice(0,4).join(' // ')));
  const bad=[];
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);

  // the script must finish initialising at all - a throw during boot leaves
  // every top-level const permanently in its dead zone and the page blank
  const boot = await p.evaluate(()=>{ try{ return typeof App; }catch(e){ return 'THROWS: '+e.message; } });
  console.log('boot          :', boot);
  if(boot!=='object') bad.push('the script did not finish initialising: '+boot);

  // play a little, so there is something real in storage
  await p.evaluate(async()=>{
    App.topTab='play'; App.character.classId='brawler'; setRealm('math'); startRun();
  });
  await p.waitForTimeout(3200);
  await p.evaluate(async()=>{
    for(let f=1;f<=9;f++){ App.run.floor=f; App.run.monster=generateMonster(f,0);
      markDiscovered(bestiaryKeyFor(App.run.monster)); }
    App.character.highestFloor=9; App.character.gems=2;
    await saveCharacter(); await saveRun(); await saveDiscovered();
  });
  await p.waitForTimeout(600);
  const before = await p.evaluate(()=>Object.keys(App.discovered||{}).length);

  // RELOAD. Everything below is what a returning player actually gets.
  await p.reload();
  await p.waitForTimeout(1600);
  const boot2 = await p.evaluate(()=>{ try{ return typeof App; }catch(e){ return 'THROWS: '+e.message; } });
  if(boot2!=='object') bad.push('the script did not initialise after a reload: '+boot2);
  const after = await p.evaluate(()=>Object.keys(App.discovered||{}).length);
  console.log('discoveries   :', before, '-> after reload', after);
  if(after < before) bad.push('discoveries were lost across a reload: '+before+' -> '+after);

  // every screen must render on a loaded save, not just a freshly built one
  const screens = await p.evaluate(()=>{
    const out=[];
    const views=['select','battle','inventory','craft','index','gemshop','hub'];
    views.forEach(v=>{
      try{
        App.topTab='play'; App.dungeonView=v; render();
        const root=document.querySelector('.dg-wrap')||document.body;
        out.push([v, root.innerHTML.length>400 ? 'ok' : 'EMPTY ('+root.innerHTML.length+' chars)']);
      }catch(e){ out.push([v,'THREW: '+String(e&&e.message||e)]); }
    });
    ['weapons','armor','relics','artifacts','bestiary'].forEach(t=>{
      try{
        App.dungeonView='index'; App.indexTab=t; render();
        const n=document.querySelectorAll('.index-card').length;
        out.push(['index/'+t, n? n+' cards' : 'EMPTY']);
      }catch(e){ out.push(['index/'+t,'THREW: '+String(e&&e.message||e)]); }
    });
    return out;
  });
  screens.forEach(x=>{
    console.log('  '+x[0].padEnd(16), x[1]);
    if(/THREW|EMPTY/.test(x[1])) bad.push(x[0]+': '+x[1]);
  });
  console.log('\nfailures:', bad.length?'\n  '+bad.join('\n  '):'none');
  console.log('page errors:', errs.length?errs:'none');
  await b.close();
  process.exit(bad.length||errs.length?1:0);
})();
