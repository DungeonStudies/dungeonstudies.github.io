const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  await p.evaluate(()=>{ App.topTab='play'; setRealm('math'); startRun(); App.dungeonView='index'; render(); });
  await p.waitForTimeout(300);
  const tabs = await p.evaluate(()=>[...document.querySelectorAll('.tabs .btn, .tab, .px-btn')]
      .map(e=>e.textContent.trim()).filter(t=>['Weapons','Armor','Boss Relics','Artifacts','Bestiary'].includes(t)));
  console.log('tabs found:', tabs);
  for(const t of tabs){
    const r = await p.evaluate(async(t)=>{
      const btn=[...document.querySelectorAll('button,.btn,.px-btn')].find(e=>e.textContent.trim()===t);
      if(!btn) return {t, err:'no button'};
      const t0=performance.now();
      btn.click();
      await new Promise(r=>setTimeout(r,50));
      const ms=Math.round(performance.now()-t0);
      const grid=document.querySelector('#root');
      const entries=grid.querySelectorAll('.idx-card, .index-card, .icard, [class*=idx]').length;
      return {t, ms, html:grid.innerHTML.length, entries, text:(grid.innerText||'').length};
    }, t);
    console.log(JSON.stringify(r));
    await p.screenshot({path:'/tmp/pw/idx_'+t.replace(/\s+/g,'')+'.png'});
  }
  console.log('errors:', errs.length?errs:'none');
  await b.close();
})();
