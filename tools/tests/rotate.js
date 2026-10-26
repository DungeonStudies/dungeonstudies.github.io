const {chromium}=require('playwright');
/* Screenshots land somewhere that exists on any machine, not in one
   session's scratchpad - these files outlive the session that wrote them. */
const OUT=(process.env.SD_SHOTS||'/tmp/sd-shots')+'/';
require('fs').mkdirSync(OUT,{recursive:true});
/* "Turn your phone sideways" has to be right on four screens, and the two
   that matter most are the ones where it must NOT appear: a desktop with a
   narrow window, and a tablet big enough to play upright. Getting either of
   those wrong locks somebody out of a game they could have played. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const errs=[];
  const shown = async (ctx, label, shot) => {
    const p = await ctx.newPage();
    p.on('pageerror',e=>errs.push(label+': '+e));
    await p.goto('file:///home/user/Study-dungeon/index.html');
    await p.waitForTimeout(900);
    const r = await p.evaluate(()=>{
      const g = document.getElementById('rotate-gate');
      const root = document.getElementById('root');
      return {gate: g ? getComputedStyle(g).display : 'missing',
              root: root ? getComputedStyle(root).display : 'missing'};
    });
    if(shot) await p.screenshot({path:OUT+shot});
    console.log(' ', label.padEnd(34), 'gate=' + r.gate.padEnd(6), 'game=' + r.root);
    await p.close();
    return r;
  };
  // a phone, upright
  const results = {};
  let ctx = await b.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  results.portrait = await shown(ctx, 'phone PORTRAIT (want: shown)');
  await ctx.close();
  // the same phone, turned
  ctx = await b.newContext({viewport:{width:844,height:390}, isMobile:true, hasTouch:true,
    userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  results.landscape = await shown(ctx, 'phone LANDSCAPE (want: hidden)');
  await ctx.close();
  // a desktop with a narrow window - must NOT be gated
  ctx = await b.newContext({viewport:{width:500,height:900}, hasTouch:false});
  results.desktop = await shown(ctx, 'narrow DESKTOP (want: hidden)');
  await ctx.close();
  // a big tablet upright - wide enough to play
  ctx = await b.newContext({viewport:{width:1024,height:1366}, isMobile:true, hasTouch:true});
  results.tablet = await shown(ctx, 'large tablet upright (want: hidden)');
  await ctx.close();
  // the escape hatch, for a phone with rotation locked
  ctx = await b.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
  const p = await ctx.newPage();
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(900);
  await p.click('.rg-anyway');
  await p.waitForTimeout(250);
  const escape = await p.evaluate(()=>({
    gate: getComputedStyle(document.getElementById('rotate-gate')).display,
    game: getComputedStyle(document.getElementById('root')).display,
    remembered: localStorage.getItem('sd_allowPortrait')}));
  console.log('  after "play anyway"'.padEnd(36), 'gate=' + escape.gate.padEnd(6), 'game=' + escape.game, '| remembered=' + escape.remembered);
  await p.reload(); await p.waitForTimeout(900);
  const reloaded = await p.evaluate(()=>getComputedStyle(document.getElementById('rotate-gate')).display);
  console.log('  after a reload'.padEnd(36), 'gate=' + reloaded, '(should stay none)');
  await ctx.close();
  const bad = [];
  if(results.portrait.gate !== 'flex') bad.push('a phone held upright was not asked to rotate');
  if(results.portrait.root !== 'none') bad.push('the game was still interactive behind the rotate screen');
  if(results.landscape.gate !== 'none') bad.push('a phone turned sideways was still being asked to rotate');
  if(results.desktop.gate !== 'none') bad.push('a narrow DESKTOP window was asked to rotate - it has no way to');
  if(results.tablet.gate !== 'none') bad.push('a tablet wide enough to play was asked to rotate');
  if(escape.gate !== 'none') bad.push('"play anyway" did not let anybody past');
  if(escape.remembered !== '1') bad.push('"play anyway" was not remembered, so a locked phone is asked every launch');
  if(reloaded !== 'none') bad.push('"play anyway" was forgotten on reload');
  console.log('\nfailures:', bad.length?'\n  '+bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(bad.length||errs.length?1:0);
})();
