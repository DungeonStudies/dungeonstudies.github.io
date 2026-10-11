const {chromium} = require('playwright');
/* Screenshots land somewhere that exists on any machine, not in one
   session's scratchpad - these files outlive the session that wrote them. */
const OUT=(process.env.SD_SHOTS||'/tmp/sd-shots')+'/';
require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new']});
  const p = await b.newPage({viewport:{width:1280,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(500);
  /* scoped to the nav: "Play in portrait anyway" on the rotate gate also
     contains the word Play, and it is in the DOM on a desktop, just hidden */
  await p.click('.navtab:has-text("Study")');
  await p.waitForTimeout(250);
  await p.screenshot({path:OUT+'s_notes.png', fullPage:true});
  // add a subject through the UI
  await p.click('button:has-text("+ New Subject")');
  await p.waitForTimeout(150);
  await p.fill('.inline-form input', 'World History');
  await p.click('.inline-form button:has-text("Create")');
  await p.waitForTimeout(250);
  console.log('subject bar:', (await p.textContent('.subject-bar')).replace(/\s+/g,' '));
  await p.click('button:has-text("Quiz Practice")');
  await p.waitForTimeout(250);
  console.log('quiz (History, no cards):', (await p.textContent('#panel')).replace(/\s+/g,' ').slice(120,330));
  await p.click('.quizdiffs button:has-text("Hard")');
  await p.waitForTimeout(200);
  console.log('quiz hard:', (await p.textContent('#panel')).replace(/\s+/g,' ').slice(120,300));
  // back to Play: the new subject should be a realm
  await p.click('.navtab:has-text("Play")');
  await p.waitForTimeout(250);
  console.log('realms:', await p.$$eval('.realm-card', es=>es.map(e=>e.textContent.replace(/\s+/g,' ').trim())));
  await p.screenshot({path:OUT+'s_select3.png', fullPage:true});
  console.log('errors:', errs);
  await b.close();
})();
