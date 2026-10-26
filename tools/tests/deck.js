const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:900,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');

// export -> import round trip
const rt = await p.evaluate(()=>{
  const subj = {id:'a', name:'Biology', icon:'🧬', notes:'some notes', flashcards:[
    makeCard('Which organelle makes ATP?','Mitochondria',{wrong:['Ribosome','Golgi','Lysosome'],why:'because ATP synthase',topic:'Organelles',level:'recall'}),
    makeCard('Where does glycolysis occur?','Cytoplasm',{wrong:['Nucleus','Matrix','Ribosome'],why:'no membrane needed',topic:'Respiration',level:'apply'}),
  ]};
  const json = deckToJson(subj);
  const back = deckFromJson(json);
  const fresh = {id:'b', name:'Empty', icon:'📘', notes:'', flashcards:[]};
  const r1 = mergeDeck(fresh, back);
  const r2 = mergeDeck(fresh, back);                       // importing twice must be a no-op
  const bare = {id:'c', name:'Old', icon:'📘', notes:'', flashcards:[makeCard('Which organelle makes ATP?','Mitochondria')]};
  const r3 = mergeDeck(bare, back);                        // fills in what the old card lacks
  return {json: json.slice(0,120), cards: back.cards.length, name: back.name,
          first:r1, second:r2, enrich:r3,
          filled:{wrong:bare.flashcards[0].wrong, why:bare.flashcards[0].why.slice(0,20), topic:bare.flashcards[0].topic},
          count: fresh.flashcards.length};
});
console.log('export head  :', rt.json.replace(/\n/g,' ').slice(0,100)+'...');
console.log('round trip   :', rt.cards, 'cards, subject', JSON.stringify(rt.name));
console.log('import once  :', JSON.stringify(rt.first), '-> deck has', rt.count);
console.log('import twice :', JSON.stringify(rt.second), '(no duplicates)');
console.log('old card fill:', JSON.stringify(rt.enrich), JSON.stringify(rt.filled));

// junk files are rejected, not crashed on
const bad = await p.evaluate(()=>{
  const out=[];
  const tries=[['not json','hello'],['wrong shape','{"a":1}'],['empty cards','{"cards":[]}'],
               ['cards missing answers','{"cards":[{"q":"only a question"}]}'],
               ['bare array','[{"q":"Q","a":"A"}]']];
  tries.forEach(([label,txt])=>{
    try{ const d=deckFromJson(txt); out.push(label+' -> accepted, '+d.cards.length+' cards'); }
    catch(e){ out.push(label+' -> rejected: '+e.message); }
  });
  return out;
});
bad.forEach(l=>console.log('  ', l));

// the ollama path builds the right request and is reachable from the picker
const ol = await p.evaluate(async ()=>{
  let cap=null;
  window.fetch = async (url, init)=>{ cap={url, body:JSON.parse(init.body)};
    return {ok:true, status:200, json: async()=>({message:{content: JSON.stringify({notes:'n', cards:[
      {q:'Q1', a:'A1', why:'W', wrong:['x','y','z'], topic:'T', level:'recall'}]})}})}; };
  await setAiModel('ollama');
  await setOllama({model:'qwen2.5:7b', host:'http://localhost:11434'});
  const out = await aiStudyAnalyze('some text', [], '');
  return {url:cap.url, model:cap.body.model, hasSchema:!!cap.body.format,
          sysFirst:cap.body.messages[0].role, cards:out.flashcards.length,
          wrong:out.flashcards[0].wrong};
});
console.log('ollama url   :', ol.url, '| model', ol.model, '| schema', ol.hasSchema, '| first msg', ol.sysFirst);
console.log('ollama parsed:', ol.cards, 'card, wrong =', JSON.stringify(ol.wrong));

// and a dead ollama gives a useful message rather than a stack trace
const dead = await p.evaluate(async ()=>{
  window.fetch = async ()=>{ throw new TypeError('Failed to fetch'); };
  try{ await aiStudyAnalyze('x',[],''); return 'no error'; }catch(e){ return e.message; }
});
console.log('ollama down  :', dead);
console.log('page errors:', errs.length ? errs : 'none');
await b.close();})();
