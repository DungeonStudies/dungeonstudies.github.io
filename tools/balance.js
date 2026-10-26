const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:800}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,160)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
const out = await p.evaluate(()=>{
  const rows=[];
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'x'}]; setRealmSilently('s1');
  const FLOORS=[10,30,50,70,90];
  const CLS=['warrior','mage','rogue','cleric','brawler'];
  for(const f of FLOORS){
    const lvl = Math.min(40, 1+Math.floor(f*0.45));
    const monster = generateMonster(f, 0);
    const line = {floor:f, def:monster.def, hp:monster.maxHp, atk:monster.atk, per:{}};
    for(const cls of CLS){
      App.character = migrateCharacter(defaultCharacter());
      App.character.classId = cls;
      App.run = Object.assign(defaultRun(), {active:true, floor:f, difficulty:'medium'});
      App.run.monster = JSON.parse(JSON.stringify(monster));
      App.run.monster.weak=[]; App.run.monster.resist=[];      // no affinity, pure numbers
      let guard=0; while(classProg().level < lvl && guard++<400) grantXp(600);
      for(let pass=0; pass<40; pass++){
        const prog = classProg();
        const next = (CLASSES[cls].tree||[]).find(n=>!prog.allocated[n.id] && canAllocate(n, prog));
        if(!next) break; allocateNode(next.id);
      }
      // best gear the floor would plausibly have handed over
      const rar = f>=70?'legendary':(f>=40?'epic':'rare');
      const w = WEAPON_CATALOG.find(x=>x.classId===cls && x.rarity===rar);
      if(w){ const it = makeWeaponInstance(w); App.character.weapons.push(it); equipMap().weapon = it.id; }
      ARMOR_SLOTS.forEach(s=>{ const a = ARMOR_CATALOG.find(x=>x.slot===s && x.rarity===rar);
        if(a){ const it = makeArmorInstance(a); App.character.armors.push(it); equipMap()[s]=it.id; } });
      const st = combatStats();
      App.run.hp = st.maxHp; App.run.maxHp = st.maxHp;
      // average damage per turn over a realistic rotation: 4 basics then an ultimate
      const set = currentSkillSet().filter(Boolean);
      const basic = set.find(s=>(s.cost||0)===0);
      const ult = set.find(s=>s.ultimate);
      const est = s => s ? damageBreakdown(s, combatStats(), App.run.monster).est : 0;
      // A skill's DoT lands over the following turns and this only counted the
      // hit itself, so the rogue - whose entire kit is open wounds - was being
      // reported at a fraction of its real output. The payload of a stack is
      // maxHp * pct * grip; stacks are capped, so the cycle total is too.
      const grip = dotGrip(App.run.monster);
      const dotOf = s => (s && s.dot) ? App.run.monster.maxHp * s.dot.pct * grip * Math.max(1, s.dot.stacks||1) : 0;
      const capPayload = dotCap() * App.run.monster.maxHp * 0.12 * grip;
      App.run.shatter = 0;
      let cycle = 0, dots = 0;
      for(let i=0;i<4;i++){
        cycle += est(basic); dots += dotOf(basic);
        App.run.shatter = Math.min(SHATTER_MAX,(App.run.shatter||0)+ (isShatterClass()?1:0));
      }
      cycle += est(ult); dots += dotOf(ult);
      cycle += Math.min(dots, capPayload);
      const dpt = cycle/5;
      const ttk = Math.ceil(monster.maxHp / Math.max(1,dpt));
      // how much of its defense actually bites
      const raw = Math.round(st.atk * (basic?basic.mult:1));
      const bite = defenseBite(raw, monsterDef(), 0);
      line.per[cls] = {atk:st.atk, hp:st.maxHp, def:st.def, spd:st.spd, dpt:Math.round(dpt), ttk,
                       wall: Math.round(100*bite/Math.max(1,raw)),
                       uncapped: Math.round(100*Math.min(1, monsterDef()/Math.max(1,raw)))};
    }
    rows.push(line);
  }
  return rows;
});
console.log('  floor  monster            ' + ['warrior','mage','rogue','cleric','brawler'].map(c=>c.slice(0,7).padEnd(9)).join(''));
out.forEach(r=>{
  const head = `  f${String(r.floor).padStart(3)}   hp${String(r.hp).padStart(5)} def${String(r.def).padStart(4)}   `;
  console.log(head + ['warrior','mage','rogue','cleric','brawler'].map(c=>{
    const v=r.per[c]; return (v.ttk+'t').padEnd(9);
  }).join('')  + '   turns-to-kill');
  console.log('  '.padEnd(head.length) + ['warrior','mage','rogue','cleric','brawler'].map(c=>{
    const v=r.per[c]; return (v.dpt+'dpt').padEnd(9);
  }).join('') + '   damage/turn');
  console.log('  '.padEnd(head.length) + ['warrior','mage','rogue','cleric','brawler'].map(c=>{
    const v=r.per[c]; return (v.wall+'%').padEnd(9);
  }).join('') + '   of a basic swing eaten by its armour');
  console.log('');
});
console.log('errors:', errs.length?errs.join('\n'):'none');
await b.close();})();
