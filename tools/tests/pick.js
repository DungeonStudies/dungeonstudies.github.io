const {chromium}=require('playwright');
/* Screenshots land somewhere that exists on any machine, not in one
   session's scratchpad - these files outlive the session that wrote them. */
const OUT=(process.env.SD_SHOTS||'/tmp/sd-shots')+'/';
require('fs').mkdirSync(OUT,{recursive:true});
/* Online versus is played against people you know, so knowing their class
   before the first question is most of the match. Two separate things have to
   hold for it to stay secret, and the second one is the one that broke: the
   wire must not carry somebody else's class, AND the host - who legitimately
   holds the real seat list in memory, because they are the one assembling the
   match - must not SHOW it. A predicate that hides a class only when it is
   missing locally passes the first and fails the second. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:980,height:1000}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async()=>{
    const bad=[], out=[];
    /* ---- what goes down the wire ---- */
    Object.assign(NET,{on:true,role:'host',code:'AAA111',me:'AAA111',conns:{},
      seats:[{code:'AAA111',name:'Me',classId:'warrior',team:0,host:true},
             {code:'BBB222',name:'Them',classId:'rogue',team:1},
             {code:'CCC333',name:'Other',classId:'mage',team:1}]});
    const toThem = netSeatsFor('BBB222');
    const mine = toThem.find(x=>x.code==='BBB222');
    const theirs = toThem.filter(x=>x.code!=='BBB222');
    if(mine.classId !== 'rogue') bad.push('a player cannot see their OWN class');
    theirs.forEach(x=>{ if(x.classId) bad.push('the wire carried ' + x.name + "'s class: " + x.classId); });
    if(JSON.stringify(toThem).indexOf('warrior') >= 0) bad.push('a class name still appears in the wire payload');
    if(!theirs.every(x=>x.locked)) bad.push('a hidden seat is not marked as ready');
    /* names and teams still travel - the lobby is useless without them */
    if(!theirs.every(x=>x.name && x.team !== undefined)) bad.push('names or teams were stripped too');
    out.push(['the wire', 'own class visible, ' + theirs.length + ' others withheld']);

    /* ---- what the HOST sees, holding the real list ---- */
    App.topTab='pvp'; App.pvpView='online'; App.pvp = defaultPvp();
    App.pvp.mode='online'; App.pvp.stage='room'; render();
    const txt = (document.querySelector('#panel')||{}).textContent || '';
    ['Rogue','Mage'].forEach(n=>{ if(txt.indexOf(n) >= 0) bad.push('the lobby shows "' + n + '" on screen'); });
    if(txt.indexOf('Warrior') < 0) bad.push('your own class is not shown to you');
    if(document.querySelectorAll('.pr-unknown').length !== 2) bad.push('a hidden seat still shows its portrait');
    out.push(['the host', 'shows their own, hides the other ' + theirs.length]);

    /* ---- nobody can act as anybody else ---- */
    Object.assign(NET,{on:true,role:'host',code:'AAA111',me:'AAA111',conns:{},
      seats:[{code:'AAA111',name:'Me',classId:'warrior',team:0,host:true},
             {code:'BBB222',name:'Them',classId:'rogue',team:1},
             {code:'CCC333',name:'Other',classId:'mage',team:1}]});
    const theirConn = {peer:'sdg-BBB222', open:true, send(){}};
    /* a doctored page writing somebody else's code into the body */
    netHostOnData(theirConn, {t:'seat', code:'CCC333', classId:'cleric', team:0});
    if(netSeat('CCC333').classId !== 'mage') bad.push('a guest changed another player\'s class');
    if(netSeat('CCC333').team !== 1) bad.push('a guest moved another player to the other side');
    if(netSeat('BBB222').classId !== 'cleric') bad.push('the change did not land on the sender\'s own seat');
    let acted = null;
    const realIntent = netHostApplyIntent; netHostApplyIntent = c => { acted = c; };
    netHostOnData(theirConn, {t:'act', code:'CCC333', act:{kind:'skill'}});
    netHostApplyIntent = realIntent;
    if(acted !== 'BBB222') bad.push('a turn was taken as ' + acted + ' by BBB222');
    /* and a stranger's seat cannot be conjured under somebody else's code */
    netHostOnData({peer:'sdg-ZZZ999', open:true, send(){}}, {t:'join', code:'AAA111', name:'Imposter'});
    if(NET.seats.length !== 4) bad.push('a join under a taken code was accepted');
    if(!netSeat('ZZZ999')) bad.push('a genuine join did not get a seat under its own code');
    out.push(['the handlers', 'read the sender, not the message']);
    netSeat('BBB222').classId = 'rogue'; netSeat('BBB222').team = 1;

    /* ---- a guest changing their own class sees it at once ---- */
    const sent = [];
    const realToHost = netToHost;
    netToHost = m => sent.push(m);
    Object.assign(NET,{role:'guest',me:'BBB222',hostCode:'AAA111',
      seats:[{code:'AAA111',name:'Me',team:0,host:true,locked:true},
             {code:'BBB222',name:'Them',classId:'rogue',team:1}]});
    render();
    const own = document.querySelector('.pr-pick');
    if(!own) bad.push('a guest has no change-class button on their own seat');
    else {
      own.click();
      const card = Array.from(document.querySelectorAll('.cp-card')).find(c=>c.dataset.cid === 'cleric');
      if(!card) bad.push('the guest picker is missing a class');
      else card.click();
      if(netSeat('BBB222').classId !== 'cleric') bad.push('a guest pick did not land on their own seat');
      if(!sent.some(m=>m.t==='seat' && m.classId==='cleric')) bad.push('a guest pick never reached the room holder');
      const g = (document.querySelector('#panel')||{}).textContent || '';
      if(g.indexOf('Cleric') < 0) bad.push('a guest pick is not shown back to them');
    }
    if(document.querySelectorAll('.pr-unknown').length !== 1) bad.push("the room holder's class leaked to a guest");
    netToHost = realToHost;
    out.push(['a guest', 'pick lands locally and goes to the holder']);

    /* ---- and the picker you change it with ---- */
    netReset();
    App.pvpView='local'; openPvp(); render();
    const btn = document.querySelector('.pr-pick');
    if(!btn) bad.push('no change-class button next to the player');
    else btn.click();
    if(!document.querySelector('.cp-back')) bad.push('the picker did not open');
    const cards = document.querySelectorAll('.cp-card');
    if(cards.length !== pvpClassIds().length) bad.push('the picker shows ' + cards.length + ' of ' + pvpClassIds().length + ' classes');
    const first = (document.querySelector('.cp-card')||{}).textContent || '';
    ['HP','ATK'].forEach(w=>{ if(first.indexOf(w) < 0) bad.push('a picker card does not show ' + w); });
    if(first.indexOf('✖') < 0) bad.push('a picker card does not say what the class is BAD at');
    /* picking one actually changes the seat, and shuts the picker */
    const was = document.querySelector('.pr-pick').textContent;
    const other = Array.from(cards).find(c=>c.dataset.cid && c.dataset.cid !== App.pvp.players[0].classId);
    if(other){
      other.click();
      if(document.querySelector('.cp-back')) bad.push('the picker stayed open after a pick');
      const now = (document.querySelector('.pr-pick')||{}).textContent || '';
      if(now === was) bad.push('picking a different class changed nothing');
    } else bad.push('could not find a class other than the one already picked');
    out.push(['the picker', cards.length + ' cards with stats, passive, weakness and kit']);
    return {bad, out};
  });
  await p.screenshot({path:OUT+'picker.png'});
  r.out.forEach(x=>console.log(' ', x[0].padEnd(12), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
})();
