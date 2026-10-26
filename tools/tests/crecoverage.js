const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage();
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(()=>{
    const bad=[], used=new Set(), rows=[];
    const check=(label, arche)=>{
      used.add(arche);
      const sh=CRE_SHEET[arche];
      if(!sh){ bad.push(label+' wants sprite "'+arche+'" which does not exist'); return; }
      const want={idle:6, atk:3, move:2, hurt:1};
      Object.entries(want).forEach(([c,k])=>{
        const got=(sh.clips[c]||[]).length;
        if(got!==k) bad.push(label+' ('+arche+') clip '+c+' has '+got+' frames, wanted '+k);
      });
    };
    // every floor of a full run, ordinary and boss alike
    for(let f=1;f<=100;f++){ const m=generateMonster(f,0); check('floor '+f+' '+m.name, m.arche); }
    // the trial
    for(let st=1;st<=5;st++){ const m=makeGauntletMonster(st); check('trial stage '+st+' '+m.name, m.arche); }
    check('the dwarf', makeDwarfBoss().arche);
    /* Evolution used to be a second way to reach a sprite - a skeleton came
       back wearing the Warden's body. It does not change shape any more, so
       nothing is reachable through it that was not reachable without it, and
       any sprite that was only ever seen by evolving into it is now dead
       content that this count will name. */
    rows.push(['distinct sprites reachable in play', used.size, 'of', Object.keys(CRE_SHEET).length]);
    const unused=Object.keys(CRE_SHEET).filter(k=>!used.has(k));
    rows.push(['never reachable', unused.length?unused.join(' '):'none']);
    return {bad, rows};
  });
  r.rows.forEach(x=>console.log(' ', x.join(' ')));
  console.log('\nproblems:', r.bad.length?'\n  '+[...new Set(r.bad)].join('\n  '):'none');
  await b.close();
  process.exit(r.bad.length?1:0);
})();
