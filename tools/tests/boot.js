const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR: '+String(e.stack||e).split('\n').slice(0,6).join('\n   ')));
  p.on('console',m=>errs.push('CONSOLE['+m.type()+']: '+m.text().slice(0,400)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);
  console.log('App defined:', await p.evaluate(()=>{ try{ return typeof App; }catch(e){ return 'THROWS: '+e.message; } }));
  /* Network failures are the sandbox blocking the pdf.js CDN; the game falls
     back exactly as designed, so they are not a boot failure. */
  const real = errs.filter(e=>!/net::ERR_|Failed to load resource/.test(e));
  if(errs.length) console.log('boot log:\n', errs.join('\n---\n'));
  console.log('errors:', real.length ? '\n  '+real.join('\n  ') : 'none');
  await b.close();
  process.exit(real.length ? 1 : 0);
})();
