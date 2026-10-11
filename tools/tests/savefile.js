const {chromium}=require('playwright');
/* The whole save, as one file you can carry to another machine. The two
   things that matter: everything a player owns survives the round trip, and
   the API key never leaves - not on the way out, and not on the way back in
   if somebody has pasted one into the file by hand. */
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:900,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(700);
  await p.evaluate(()=>{ if(typeof TUT!=='undefined'){TUT.on=false;TUT.seen=true;} });
  await p.evaluate(()=>{ if(App.dungeonView==='select') setRealm(App.profileId||'math'); });
  await p.waitForTimeout(1200);
  const r = await p.evaluate(async()=>{
    const out=[], bad=[];
    /* build something worth saving */
    const s0 = App.subjects[0];
    s0.notes = 'Arousal is the level of activation before performance.';
    s0.terms = [makeTerm('arousal','the level of activation','p'), makeTerm('anxiety','a negative response','p')];
    s0.syllabus = 'Outcomes.';
    App.character.classId='warrior';
    classProg().level = 14; classProg().skillPoints = 3;
    App.character.gems = 77; App.character.highestFloor = 42;
    /* Nothing in the game takes a key any more, but a browser that played it
       before they were removed still has one sitting in storage - and that is
       exactly the save somebody is most likely to carry to a new device. It
       must not travel, so the stripping stays and so does this. */
    await Storage.set('apiKey', 'sk-ant-SECRET-SHOULD-NOT-TRAVEL');
    await addFriend('Omar','KPX472');
    await saveSubjects(); await saveCharacter();

    const file = await buildSaveFile();
    const text = JSON.stringify(file);
    out.push(['summary', file.summary]);
    /* the key must not be in the file, anywhere */
    if(text.indexOf('SECRET-SHOULD-NOT-TRAVEL') >= 0) bad.push('a legacy API key travelled in the save file');
    if(file.data.apiKey !== undefined) bad.push('the save has an apiKey field');
    if(SAVE_SECRETS.indexOf('apiKey') < 0) bad.push('apiKey is no longer on the strip list, so an old one would travel');
    /* the things that SHOULD be there */
    ['subjects','profiles','discovered','friends'].forEach(k=>{
      if(file.data[k] === undefined) bad.push('the save is missing ' + k); });
    if(text.indexOf('arousal') < 0) bad.push('the glossary did not travel');
    if(text.indexOf('Outcomes.') < 0) bad.push('the syllabus did not travel');
    if(text.indexOf('KPX472') < 0) bad.push('the friends list did not travel');

    /* round trip */
    const parsed = parseSaveFile(text);
    if(parsed.data.apiKey !== undefined) bad.push('an imported save carried a key');
    /* a hand-edited file with a key in it is stripped on the way in */
    const tampered = JSON.parse(text);
    tampered.data.apiKey = 'sk-ant-INJECTED';
    const p2 = parseSaveFile(JSON.stringify(tampered));
    if(p2.data.apiKey !== undefined) bad.push('a key pasted into a save file was loaded');

    /* wipe, import, and check it all came back */
    await Storage.set('subjects', []); await Storage.set('friends', []);
    await importSave(parsed);
    const back = await Storage.get('subjects', []);
    if(!back.length) bad.push('importing did not restore the subjects');
    if(!(back[0].terms||[]).length) bad.push('importing lost the glossary');
    const fr = await Storage.get('friends', []);
    if(!fr.length) bad.push('importing lost the friends');
    const prof = await Storage.get('profiles', {});
    const anyHero = Object.values(prof).some(x=>x.character && x.character.gems === 77);
    if(!anyHero) bad.push('importing lost the hero');
    out.push(['round trip', back.length + ' subjects, ' + (back[0].terms||[]).length + ' terms, ' + fr.length + ' friends, hero ' + (anyHero?'ok':'LOST')]);

    /* and the things that must be refused */
    const refuse = (txt, why) => { try{ parseSaveFile(txt); bad.push('accepted ' + why); }catch(e){ out.push(['refused ' + why, e.message.slice(0,46)]); } };
    refuse('not json at all', 'junk');
    refuse('{"hello":1}', 'a random object');
    refuse(JSON.stringify({format:'study-dungeon-save', version:99, data:{subjects:[]}}), 'a newer version');
    refuse(JSON.stringify({format:DECK_FORMAT, cards:[{q:'a',a:'b'}]}), 'a deck file');
    /* the game was renamed; a save written under the old name still loads,
       and a deck written under it still loads too - the deck format string
       was deliberately NOT renamed, because every deck anybody has carries it */
    const oldNamed = JSON.parse(text); oldNamed.format = 'study-dungeon-save';
    try{ parseSaveFile(JSON.stringify(oldNamed)); out.push(['old-name save','still accepted']); }
    catch(e){ bad.push('a save from before the rename was refused: ' + e.message); }
    if(DECK_FORMAT !== 'study-dungeon-deck') bad.push('the deck format was renamed, which breaks every exported deck');
    refuse(JSON.stringify({format:'study-dungeon-save', version:1, data:{}}), 'an empty save');
    return {out, bad};
  });
  r.out.forEach(x=>console.log(' ', String(x[0]).padEnd(22), x[1]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
