const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1100,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');

// ---- THE TWO FREE ROUTES, WHICH ARE NOW THE ONLY ONES.
// The paid key and its three Claude models are gone: nobody was going to open
// a billing account to play a game. What has to keep working is the built-in
// generator, which is the default and asks the network for nothing at all,
// and a local model for whoever already runs one.
const def = await p.evaluate(async ()=>{
  let called = 0;
  const realFetch = window.fetch;
  window.fetch = async (...a)=>{ called++; return realFetch(...a); };
  const model = await getAiModel();
  const spec = aiModelSpec(model);
  let threw = null;
  try{ await callClaude({text:'hello'}); }catch(e){ threw = e.message; }
  /* aiStudyAnalyze is BELOW the fallback - it is supposed to throw, and the
     upload loop is what catches it and calls localAnalyze instead. Test the
     layer that actually has the fallback in it. */
  let analyzeThrew = false;
  try{ await aiStudyAnalyze('x', [], ''); }catch(e){ analyzeThrew = true; }
  const out = localAnalyze('Mitochondria make ATP. Ribosomes build proteins. The nucleus holds DNA.');
  window.fetch = realFetch;
  return {model, provider:spec.provider, threw, called, analyzeThrew,
          cards: (out.flashcards||[]).length, notes: (out.notes||'').length};
});
console.log('default model', def.model, '| provider', def.provider);
console.log('asks the network for nothing:', def.called === 0);
console.log('a live call refuses, so the offline generator takes over:', !!def.threw && def.analyzeThrew);
console.log('cards from the built-in generator:', def.cards, '| notes:', def.notes, 'chars');
if(def.provider === 'anthropic') console.log('PROBLEM: the default is a paid provider');
if(def.cards === 0) console.log('PROBLEM: the built-in generator made no cards');

const paid = await p.evaluate(()=>({
  models: AI_MODELS.map(m=>m.id + '/' + m.provider),
  anyPaid: AI_MODELS.some(m=>m.provider === 'anthropic'),
  oldSave: aiModelSpec('claude-opus-5').provider,
}));
console.log('models offered', JSON.stringify(paid.models));
if(paid.anyPaid) console.log('PROBLEM: a paid model is still offered');
if(paid.oldSave === 'anthropic') console.log('PROBLEM: an old save still selects a paid model');

// ---- the local route, which is the one that can still reach the network
const req = await p.evaluate(async ()=>{
  let captured=null;
  window.fetch = async (url, init)=>{
    captured = {url, body: JSON.parse(init.body)};
    return {ok:true, status:200, headers:{get:()=>null}, json: async ()=>({
      message:{content: JSON.stringify({
        notes:'# Cells\n- **Mitochondria** make ATP.',
        cards:[
          {q:'Which organelle makes ATP?', a:'Mitochondria', why:'ATP is produced by oxidative phosphorylation on the inner mitochondrial membrane.',
           wrong:['Ribosome','Golgi apparatus','Lysosome'], topic:'Organelles', level:'recall'},
          {q:'What process makes most ATP?', a:'Oxidative phosphorylation', why:'It couples the electron transport chain to ATP synthase.',
           wrong:['Glycolysis','Fermentation','Mitochondria'], topic:'Respiration', level:'apply'}
        ]})}
    })};
  };
  await setAiModel('ollama');
  const out = await aiStudyAnalyze('Mitochondria make ATP.', [], 'focus on definitions');
  return {captured, out, model: await getAiModel()};
});

console.log('local model  ', req.model);
console.log('goes to the player\'s own machine:', /localhost|127\.0\.0\.1/.test(req.captured.url), req.captured.url);
console.log('system       ', req.captured.body.messages.some(m=>m.role==='system') ? 'sent' : 'MISSING');
console.log('schema       ', req.captured.body.format ? 'sent' : 'MISSING');
console.log('source in user turn, not system:',
   req.captured.body.messages.some(m=>m.role==='user' && String(m.content).includes('<extract>')));
console.log('cards parsed ', req.out.flashcards.length,
            '| wrong answers:', JSON.stringify(req.out.flashcards[0].wrong),
            '| topic:', req.out.flashcards[0].topic,
            '| why:', req.out.flashcards[0].why.slice(0,40)+'...');
console.log('self-answer stripped:',
  !req.out.flashcards[1].wrong.some(w=>w.toLowerCase()==='oxidative phosphorylation'));

// ---- the distractors actually reach the multiple choice
const mcq = await p.evaluate(()=>{
  const pool = [
    makeCard('Which organelle makes ATP?','Mitochondria',{wrong:['Ribosome','Golgi apparatus','Lysosome'],why:'because',topic:'Organelles'}),
    makeCard('Capital of France?','Paris',{wrong:['Lyon','Marseille','Nice']}),
    makeCard('2+2?','4',{wrong:['3','5','6']}),
  ];
  const q = buildCardQuestion(pool.filter(c=>c.front.indexOf('organelle')>=0), 'medium', {id:'x',name:'Bio'});
  return {options:q.options, why:q.why, topic:q.topic};
});
console.log('mcq options  ', JSON.stringify(mcq.options));
console.log('all from this question:',
  mcq.options.every(o=>['Mitochondria','Ribosome','Golgi apparatus','Lysosome'].indexOf(o)>=0));
console.log('why carried  ', !!mcq.why, '| topic carried', mcq.topic);

// ---- old decks without the new fields still work
const legacy = await p.evaluate(()=>{
  const s = {name:'Old', flashcards:[{id:'a',front:'Q1',back:'A1'},{id:'b',front:'Q2',back:'A2'},{id:'c',front:'Q3',back:'A3'}]};
  normalizeSubject(s);
  const q = buildCardQuestion(s.flashcards,'medium',{id:'o',name:'Old'});
  return {fields:Object.keys(s.flashcards[0]).sort().join(','), opts:q.options.length};
});
console.log('legacy card  ', legacy.fields);
console.log('legacy mcq   ', legacy.opts, 'options');

// ---- WHAT HAPPENS WHEN THE LIVE ONE IS NOT THERE
// The paid path had a backoff loop for 429s; a model running on your own
// machine does not rate-limit you, and that loop went with the rest of it.
// What has to hold now is the fallback: when the live route is unreachable,
// the thing you were doing still finishes, offline, and says so.
const fallback = await p.evaluate(async ()=>{
  await setAiModel('ollama');
  window.fetch = async ()=>{ throw new Error('connection refused'); };
  /* criteria are {text, marks} objects, which is what both real generators
     emit - a bare string reads as empty and silently scores zero */
  const q = {marks:4, prompt:'Explain how mitochondria produce ATP.', subject:'Bio',
             criteria:[{text:'Identifies the mitochondrion as the site', marks:2},
                       {text:'Names oxidative phosphorylation', marks:2}]};
  const marked = await markResponse(q, 'Mitochondria make ATP by oxidative phosphorylation on the inner membrane.');
  /* and an upload chunk, which is the other half */
  const an = localAnalyze('The mitochondrion makes ATP. Ribosomes build proteins.');
  return {awarded: marked && marked.awarded, max: marked && marked.max,
          offline: !!(marked && marked.offline),
          note: String((marked && marked.note) || '').slice(0, 60),
          cards: (an.flashcards||[]).length};
});
console.log('unreachable local model -> still marked:',
            fallback.awarded + '/' + fallback.max, '| offline:', fallback.offline);
console.log('upload still makes cards:', fallback.cards);
if(fallback.awarded == null) console.log('PROBLEM: an unreachable model left the paper unmarked');
if(!fallback.awarded) console.log('PROBLEM: the offline marker gave nothing for an answer that meets its criteria');
if(!fallback.cards) console.log('PROBLEM: an unreachable model left the upload with nothing');

// ---- weak spots
const weak = await p.evaluate(()=>{
  const s={name:'W',flashcards:[
    makeCard('a','1',{topic:'Respiration',seen:6,missed:5}),
    makeCard('b','2',{topic:'Respiration',seen:4,missed:3}),
    makeCard('c','3',{topic:'Organelles',seen:8,missed:1}),
    makeCard('d','4',{topic:'Never asked'}),
  ]};
  return weakTopics(s,5).map(r=>r.topic+' '+r.missed+'/'+r.seen);
});
console.log('weak spots   ', JSON.stringify(weak));

console.log('page errors:', errs.length ? errs : 'none');
await b.close();})();
