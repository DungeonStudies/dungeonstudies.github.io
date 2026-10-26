/* The breath, measured where it lives. A creature's idle may lift its chest,
   and it may NOT lift its feet - which is the entire difference between the
   breath and the `idlebob` translate that made everything hover. */
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html'); await p.waitForTimeout(600);
  await p.evaluate(async()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math');
    await setTutSeen(true); TUT.seen=true; if(TUT.on) await endTutorial(); });
  await p.evaluate(()=>{ App.character.classId='warrior'; startRun(); App.run.floor=7;
    App.run.monster=generateMonster(7,0); App.dungeonView='battle'; App.currentPhase='difficulty'; render(); });
  await p.waitForSelector('.combatant.monster .sprite-box .spr', {timeout:8000});
  await p.waitForTimeout(300);

  const bad=[], log=[];

  /* 1. NOTHING may animate a monster's sprite except the frame swap. Two
     different CSS animations have lived here - a translate that hovered and a
     scale that grew and shrank - and the hero has never had either. */
  const css = await p.evaluate(()=>{
    const spr = document.querySelector('.combatant.monster .sprite-box .spr');
    const box = document.querySelector('.combatant.monster .sprite-box');
    const names = [getComputedStyle(spr).animationName, getComputedStyle(box).animationName];
    spr.querySelectorAll('*').forEach(n=>names.push(getComputedStyle(n).animationName));
    const hero = document.querySelector('.combatant.player .sprite-box');
    const hnames = [getComputedStyle(hero).animationName];
    hero.querySelectorAll('*').forEach(n=>hnames.push(getComputedStyle(n).animationName));
    return {mon:[...new Set(names)].filter(n=>n&&n!=='none'),
            hero:[...new Set(hnames)].filter(n=>n&&n!=='none'),
            monT:getComputedStyle(spr).transform};
  });
  const swap = n => /^(sf\d|cre\d|cw\d)/.test(n);
  log.push(['monster css', css.mon.join(' ')||'none']);
  log.push(['hero css   ', css.hero.join(' ')||'none']);
  const extra = css.mon.filter(n=>!swap(n));
  if(extra.length) bad.push('a monster is animated by '+extra.join(', ')+' — the hero is not, and this is how every hover and pulse got in');
  if(css.monT !== 'none' && css.monT !== '') bad.push('the monster sprite carries a transform: '+css.monT);

  /* 2. the hero's mechanic, measured on both. Whatever a creature is planted
     on - legs, a hem, a coil - must not move while it idles, and the body
     above it must. The snakes are exempt on the first count because their
     lower IS the tail and it is meant to wiggle. */
  const shapes = await p.evaluate(()=>{
    const cell=(f,y,x)=>((f[y]||'')[x]||'.');
    const measure=(sh,W,H)=>{
      const ids=sh.clips.idle, f=i=>sh.px[ids[i]];
      let lowest=-1;
      for(let y=H-1;y>=0&&lowest<0;y--) for(let x=0;x<W;x++) if(cell(f(0),y,x)!=='.'){lowest=y;break;}
      let foot=0, body=0;
      for(let i=1;i<ids.length;i++) for(let y=0;y<H;y++) for(let x=0;x<W;x++){
        if(cell(f(0),y,x)===cell(f(i),y,x)) continue;
        if(y > lowest-6) foot++; else body++;
      }
      return {foot, body, lowest};
    };
    const out={hero:{},mon:{}};
    ['warrior','mage','rogue','cleric','brawler'].forEach(n=>out.hero[n]=measure(HERO_SHEET[n],32,32));
    Object.keys(CRE_SHEET).forEach(n=>out.mon[n]=measure(CRE_SHEET[n],36,36));
    return out;
  });
  const TAILS = new Set(['serpent','leech']);
  const heroFoot = Math.max(...Object.values(shapes.hero).map(v=>v.foot));
  log.push(['hero planted-zone movement, worst', heroFoot]);
  let worst=0, worstN='';
  Object.keys(shapes.mon).forEach(n=>{
    const v = shapes.mon[n];
    if(!TAILS.has(n) && v.foot > worst){ worst = v.foot; worstN = n; }
    if(!TAILS.has(n) && v.foot > heroFoot) bad.push(n+' moves what it stands on ('+v.foot+' cells) more than any hero does ('+heroFoot+')');
    if(v.body < 20) bad.push(n+' barely changes at all while it idles ('+v.body+' cells)');
  });
  log.push(['monster planted-zone movement, worst', worstN+' '+worst]);

  /* the serpent's tongue: a hiss on an irregular timer, and it must stop the
     moment you leave the fight or it follows you round the hub */
  const amb = await p.evaluate(async()=>{
    const out = {};
    let heard = 0;
    const real = Sfx.voice.bind(Sfx);
    Sfx.voice = id => { heard++; out.last = id; };
    App.run.floor = 3;
    App.run.monster = generateMonster(3, 0);
    App.run.monster.arche = 'serpent'; App.run.monster.hp = App.run.monster.maxHp;
    App.dungeonView = 'battle'; render();
    await new Promise(r=>setTimeout(r, 6000));
    out.inFight = heard;
    heard = 0;
    App.dungeonView = 'hub'; render();
    await new Promise(r=>setTimeout(r, 6000));
    out.afterLeaving = heard;
    Sfx.voice = real;
    return out;
  });
  log.push(['serpent hiss', amb.inFight+' in 6s of fighting ('+amb.last+'), '+amb.afterLeaving+' in 6s after leaving']);
  if(!amb.inFight) bad.push('a serpent made no noise while you stood in front of it');
  if(amb.last !== 'hiss') bad.push('the serpent is making a '+amb.last+' rather than a hiss');
  if(amb.afterLeaving) bad.push('the hissing followed you out of the fight '+amb.afterLeaving+' times');

  log.forEach(x=>console.log(' ', x.join('  |  ')));
  console.log('\nfailures:', bad.length?'\n  '+bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(bad.length||errs.length?1:0);
})();
