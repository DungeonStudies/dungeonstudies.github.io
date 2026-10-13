const {chromium} = require('playwright');
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new']});
  const p = await b.newPage({viewport:{width:1260,height:760}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(()=>{
    const names = Object.keys(CRE_SHEET);
    document.body.innerHTML='<div id="s" style="display:flex;flex-wrap:wrap;gap:8px;padding:14px;background:#0b0912"></div>';
    const s=document.getElementById('s'); const bad=[];
    names.forEach((n,i)=>{
      const d=document.createElement('div');
      d.style.cssText='width:112px;height:126px;position:relative;background:#141021;border-radius:6px';
      const boss = i%4===0;
      d.innerHTML='<div style="position:absolute;inset:4px">'+creatureArt(n,'#888',{boss})+'</div>'+
        '<div style="position:absolute;bottom:1px;width:100%;text-align:center;color:#9a93ad;font:9px sans-serif">'+n+(boss?' ★':'')+'</div>';
      s.appendChild(d);
      const frames = d.querySelectorAll('.spr .sf').length;
      const px = d.querySelectorAll('.sf svg path').length;
      if(frames!==6 || px<8) bad.push(n+' idle frames='+frames+' paths='+px);
    });
    // every clip must render too
    ['idle','atk','move','hurt'].forEach(c=>{
      names.forEach(n=>{ const h=document.createElement('div'); h.innerHTML=creatureArt(n,'#888',{clip:c});
        if(!h.querySelector('svg path')) bad.push(n+'/'+c); });
    });
    const want={idle:6, atk:3, move:2, hurt:1};
    names.forEach(n=>{
      Object.entries(want).forEach(([c,k])=>{
        const got=(CRE_SHEET[n].clips[c]||[]).length;
        if(got!==k) bad.push(n+'/'+c+' has '+got+' frames, wanted '+k);
      });
    });
    return {count:names.length, bad};
  });
  console.log('creatures:', r.count, 'bad:', r.bad.length?r.bad:'none');
  await p.screenshot({path:'/tmp/pw/cre_sheet.png', fullPage:true});
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
