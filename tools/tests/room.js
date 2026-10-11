/* The sound of the place you are standing in. Three layers, all synthesised,
   and the things worth proving are that it starts, that it is DIFFERENT in a
   different region, that the volume slider reaches it while it is already
   playing, and above all that it stops when you walk away - a bed that keeps
   droning under the Study tab is the worst bug this feature could have. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--headless=new','--autoplay-policy=no-user-gesture-required']});
  const p=await b.newPage({viewport:{width:900,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);

  const r = await p.evaluate(async()=>{
    const bad=[], log=[];
    const wait = ms => new Promise(r=>setTimeout(r,ms));

    /* every region has a tone, and they are not all the same tone */
    const tones = [];
    for(let i=1;i<=10;i++){
      const t = roomTone(i);
      if(!t || !t.bed || !t.drip) { bad.push('region '+i+' has no room tone'); continue; }
      if(!(t.bed[1] > 0)) bad.push('region '+i+' has a silent bed');
      if(!(t.drip[1] > t.drip[0])) bad.push('region '+i+' has a backwards drip interval');
      tones.push(t.bed[0] + '/' + t.name);
    }
    if(new Set(tones).size < 6) bad.push('the regions nearly all sound the same: ' + tones.join(' '));
    log.push(['tones', tones.join(' ')]);
    /* out of range must not throw */
    [0, -3, 99, null, undefined].forEach(v=>{ if(!roomTone(v)) bad.push('roomTone('+v+') gave nothing'); });

    await setSound({volume:0.7, muted:false});
    App.character.classId='warrior'; startRun();
    App.run.floor = 35; App.run.monster = generateMonster(35, 0);
    App.dungeonView='battle'; App.topTab='play'; render();
    await wait(400);
    if(!ROOM.on) bad.push('no room sound in a fight');
    if(ROOM.region !== 4) bad.push('floor 35 is in region '+ROOM.region+', not 4');
    if(!ROOM.bed) bad.push('the bed never started');
    if(!ROOM.drip) bad.push('the drips never started');
    if(!ROOM.torch) bad.push('a torchlit region has no torch');
    log.push(['in a fight', 'region '+ROOM.region+', bed+drip+torch']);

    /* the slider reaches a sound that is ALREADY playing */
    await wait(1900);                       /* the bed fades in over 1.6s */
    const loud = ROOM.bedGain ? ROOM.bedGain.gain.value : -1;
    await setSound({volume:0.2}); await wait(450);
    const quiet = ROOM.bedGain ? ROOM.bedGain.gain.value : -1;
    if(!(quiet < loud)) bad.push('turning the volume down did not quieten the room ('+loud+' -> '+quiet+')');
    await setSound({muted:true}); await wait(400);
    const muted = ROOM.bedGain ? ROOM.bedGain.gain.value : -1;
    if(muted > 0.002) bad.push('mute did not silence the room (' + muted + ')');
    await setSound({muted:false, volume:0.7}); await wait(350);
    log.push(['the slider', loud.toFixed(4)+' -> '+quiet.toFixed(4)+' -> muted '+muted.toFixed(4)]);

    /* a different region is a different room, and moving does not stack beds */
    App.run.floor = 95; App.run.monster = generateMonster(95, 0); render();
    await wait(350);
    if(ROOM.region !== 10) bad.push('floor 95 did not change the room (region '+ROOM.region+')');
    const before = ROOM.bed;
    render(); await wait(120);
    if(ROOM.bed !== before) bad.push('a plain re-render restarted the room from scratch');
    log.push(['deeper', 'region '+ROOM.region+', re-render kept the same bed']);

    /* and it stops the moment you are not in a room any more */
    App.topTab='study'; render(); await wait(300);
    if(ROOM.on) bad.push('the room kept droning after leaving the dungeon');
    if(ROOM.drip || ROOM.torch) bad.push('a timer was left running after leaving');
    App.topTab='play'; App.dungeonView='hub'; render(); await wait(200);
    if(ROOM.on) bad.push('the hub has room sound, and it should not');

    /* versus is fought in a room too */
    App.topTab='pvp'; App.pvp = defaultPvp();
    App.pvp.players = [pvpMakePlayer(0,'warrior',0), pvpMakePlayer(1,'mage',1)];
    pvpStart(); render(); await wait(300);
    if(!ROOM.on) bad.push('a versus match is fought in silence');
    if(ROOM.region !== PVP_ARENA.region) bad.push('the versus room is not the versus arena');
    log.push(['versus', 'region '+ROOM.region]);
    App.pvp.stage = 'setup'; App.topTab='study'; render(); await wait(250);
    if(ROOM.on) bad.push('the versus room kept going after the match');

    return {bad, log};
  });

  r.log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
