const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:900,height:1250}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{
  App.subjects=[{id:'s1',name:'Biology',icon:'🧬',notes:'x',flashcards:[
    makeCard('Which organelle makes ATP?','Mitochondria',
      {wrong:['Ribosome','Golgi apparatus','Mitochondria'], why:'ATP synthase sits on the inner membrane.', topic:'Organelles'})]}];
  App.activeSubjectId='s1'; App.topTab='study'; App.studyView='flashcards'; fcEditing=true; render();
});
await p.waitForTimeout(300);
await p.screenshot({path:'/tmp/pw/card_edit.png', fullPage:true});
// edit it and save
const after = await p.evaluate(async ()=>{
  document.querySelector('#ed-a').value = 'Mitochondrion';
  document.querySelector('#ed-x').value = 'Ribosome\nGolgi apparatus\nLysosome\nMitochondrion';   // last one duplicates the answer
  document.querySelector('#ed-w').value = 'ATP synthase sits on the inner mitochondrial membrane.';
  document.querySelector('#ed-t').value = 'Cell organelles';
  document.querySelector('#ed-save').click();
  await new Promise(r=>setTimeout(r,120));
  const c = App.subjects[0].flashcards[0];
  return {back:c.back, wrong:c.wrong, topic:c.topic, editingClosed: !fcEditing};
});
console.log('saved answer   :', after.back);
console.log('wrong answers  :', JSON.stringify(after.wrong), '(the one matching the answer is dropped)');
console.log('topic          :', after.topic);
console.log('editor closed  :', after.editingClosed);
// a card with no question is refused
const refuse = await p.evaluate(async ()=>{
  fcEditing = true; render();
  await new Promise(r=>setTimeout(r,80));
  document.querySelector('#ed-a').value = '';
  document.querySelector('#ed-save').click();
  await new Promise(r=>setTimeout(r,80));
  return {msg: document.querySelector('#ed-msg').textContent, stillThere: App.subjects[0].flashcards[0].back};
});
console.log('empty answer   :', JSON.stringify(refuse.msg), '| card kept as', refuse.stillThere);
console.log('page errors:', errs.length ? errs : 'none');
await b.close();})();
