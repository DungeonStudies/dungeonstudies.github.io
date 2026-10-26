const {chromium}=require('playwright');
/* AN UPDATE MUST NOT SHUT THE GAME DOWN UNDER SOMEBODY.
   It used to: the worker called skipWaiting() the moment it installed and the
   page reloaded itself on controllerchange, so deploying restarted the game
   for whoever was holding it. Mid-run that loses your place. Mid-arena it
   destroys the match outright, because a match lives only in memory - and an
   online one takes every other player down with it. These are the two halves
   that must stay true: the worker waits to be asked, and the offer never
   appears while a fight is live. */
const {chromium: _}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;}
    if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async()=>{
    const wait = ms => new Promise(r=>setTimeout(r,ms));
    const bad=[], log=[];
    const bar = ()=>document.getElementById('sw-bar');

    /* nothing offered until there is something to offer */
    if(bar()) bad.push('the update bar is showing with no update');

    /* an update lands while you are standing in the hub */
    const fake = {posted:[], postMessage(m){ this.posted.push(m); }};
    swUpdateReady(fake);
    if(!bar()) bad.push('an update in the hub was never offered');
    else log.push(['in the hub', 'offered: "' + bar().querySelector('.swb-text').textContent.trim() + '"']);
    if(bar() && !bar().querySelector('.swb-go')) bad.push('the offer has no way to accept it');
    if(bar() && !bar().querySelector('.swb-x')) bad.push('the offer cannot be dismissed');

    /* and now a fight starts under it */
    App.character.classId='warrior'; startRun();
    App.run.floor = 3; App.run.monster = generateMonster(3, 0);
    App.dungeonView='battle'; App.topTab='play'; render();
    await wait(120);
    if(!inTheDungeon()) bad.push('the test never got into a fight');
    if(bar()) bad.push('the update bar stayed up mid-run');
    log.push(['mid-run', 'the offer is withdrawn']);

    /* out the other side, it comes back */
    App.run.active = false; App.dungeonView='hub'; render();
    await wait(80);
    if(!bar()) bad.push('the offer never came back after the run');
    log.push(['back in the hub', 'the offer returns']);

    /* an arena match hides it just as hard */
    App.topTab='pvp'; App.pvpView='local'; openPvp(); pvpStart(); render();
    await wait(80);
    if(!inAMatch()) bad.push('the test never got into a match');
    if(bar()) bad.push('the update bar stayed up mid-match - this is the one that destroys a game');
    log.push(['mid-match', 'the offer is withdrawn']);
    App.pvp.stage='setup'; App.topTab='play'; App.dungeonView='hub'; render();
    await wait(80);

    /* accepting it is what asks the worker to step forward, and nothing else does */
    if(SW.asked) bad.push('the page asked for the update without being told to');
    if(fake.posted.length) bad.push('the worker was told to take over before anybody tapped');
    bar().querySelector('.swb-go').click();
    if(!SW.asked) bad.push('tapping Reload did not record the ask');
    if(!fake.posted.some(m=>m && m.t === 'skip')) bad.push('tapping Reload never told the worker to step forward');
    log.push(['on tapping Reload', 'the worker is asked, and only then']);
    SW.asked = false; SW.waiting = null;
    const b2 = bar(); if(b2) b2.remove();

    /* dismissing drops it for good */
    const f2 = {postMessage(){}};
    swUpdateReady(f2);
    if(!bar()) bad.push('a second update was never offered');
    bar().querySelector('.swb-x').click();
    if(bar()) bad.push('dismissing left the bar up');
    render(); await wait(60);
    if(bar()) bad.push('a dismissed update came back on the next render');
    log.push(['on dismissing', 'it stays gone']);
    return {bad, log};
  });

  /* and the worker itself must not seize control */
  const sw = require('fs').readFileSync('/home/user/Study-dungeon/sw.js','utf8');
  const bad2 = [];
  /* the install handler alone - the message handler that follows it is
     ALLOWED to call skipWaiting(), that is the whole point of it */
  const from = sw.indexOf("addEventListener('install'");
  const to = sw.indexOf("addEventListener(", from + 10);
  const install = sw.slice(from, to < 0 ? undefined : to);
  /* the CALL, not the word - the comment in there says "no skipWaiting" */
  if(/skipWaiting\s*\(/.test(install)) bad2.push('the worker still calls skipWaiting() as it installs');
  const msg = sw.indexOf("addEventListener('message'");
  if(msg < 0) bad2.push('the worker cannot be asked to step forward');
  else if(!/skipWaiting\s*\(/.test(sw.slice(msg, msg + 220))) bad2.push('asking the worker to step forward does nothing');

  r.log.forEach(x=>console.log(' ', String(x[0]).padEnd(18), x[1]));
  const bad = r.bad.concat(bad2);
  console.log('\nfailures:', bad.length?'\n  '+bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(bad.length||errs.length?1:0);
})();
