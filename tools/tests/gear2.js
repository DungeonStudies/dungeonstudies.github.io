const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1000,height:850}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+String(e).slice(0,200)));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
await p.evaluate(()=>{ window.sleep = ()=>Promise.resolve(); });
const out = await p.evaluate(()=>{
  const bad=[], notes=[];
  App.subjects=[{id:'s1',name:'T',icon:'📘',notes:'x'}]; setRealmSilently('s1');
  const ch = App.character;

  // 1. one weapon type per class, and the lock holds both ways
  const types = Object.keys(WEAPON_TYPES);
  if(types.length !== 5) bad.push('there are '+types.length+' weapon types');
  const claimed = types.map(t=>WEAPON_TYPES[t].classId).sort().join(',');
  if(claimed !== 'brawler,cleric,mage,rogue,warrior') bad.push('weapon types cover '+claimed);
  WEAPON_CATALOG.forEach(w=>{
    if(!w.wtype) bad.push(w.lineId+' has no weapon type');
    else if(WEAPON_TYPES[w.wtype].classId !== w.classId) bad.push(w.lineId+' is a '+w.wtype);
  });
  Object.keys(CLASSES).forEach(c=>{
    WEAPON_CATALOG.forEach(w=>{
      const should = w.classId === c;
      if(canEquipWeapon(makeWeaponInstance(w), c) !== should)
        bad.push(CLASSES[c].name+' equip check wrong for '+w.name);
    });
  });

  // 2. every class's loadout is its own, and an item has exactly one wearer
  ch.weapons = []; ch.armors = []; ch.loadouts = {};
  const giveAll = ()=>{ WEAPON_CATALOG.filter(w=>w.rarity==='legendary').forEach(w=>{
      const it = makeWeaponInstance(w); ch.weapons.push(it); }); };
  giveAll();
  const helm = makeArmorInstance(ARMOR_CATALOG.find(a=>a.slot==='head' && a.rarity==='epic'));
  ch.armors.push(helm);
  ch.classId='warrior'; equipItem('head', helm.id);
  if(loadoutFor('warrior').head !== helm.id) bad.push('warrior did not get the helm');
  ch.classId='rogue';
  if(loadoutFor('rogue').head === helm.id) bad.push('the rogue is wearing the warrior’s helm');
  equipItem('head', helm.id);
  if(loadoutFor('warrior').head === helm.id) bad.push('one helm, two heads');
  if(loadoutFor('rogue').head !== helm.id) bad.push('the rogue did not get it');
  if(wornBy(helm.id) !== 'rogue') bad.push('wornBy says '+wornBy(helm.id));

  // 3. a legendary in the right hands changes the numbers; in the wrong hands it is not equippable
  const eq = (cls, lineId)=>{
    ch.classId = cls;
    const it = ch.weapons.find(w=>w.lineId===lineId);
    equipItem('weapon', it.id);
    return it;
  };
  const mon = f => { App.run = Object.assign(defaultRun(), {active:true, floor:f, difficulty:'medium'});
    App.run.monster = generateMonster(f, 0); const st=combatStats();
    App.run.hp=st.maxHp; App.run.maxHp=st.maxHp; return App.run.monster; };

  // brawler: Ninth Heaven reaches full shatter in three
  ch.classId='brawler'; mon(60);
  ch.loadouts.brawler = emptyLoadout();
  App.run.shatter = 3;
  const plainPierce = shatterPierceNext();
  eq('brawler','w_brawler_legendary');
  App.run.shatter = 3;
  const ninth = shatterPierceNext();
  notes.push('brawler   shatter at 3 stacks: '+Math.round(plainPierce*100)+'% -> '+Math.round(ninth*100)+'% with Ninth Heaven');
  if(!(ninth === 1 && plainPierce < 1)) bad.push('ninth heaven: '+plainPierce+' -> '+ninth);

  // rogue: Nightfall makes room for a fourth wound and pays more
  ch.classId='rogue'; ch.loadouts.rogue = emptyLoadout(); mon(60);
  const cap0 = dotCap(), v0 = venomPerStack();
  eq('rogue','w_rogue_legendary');
  notes.push('rogue     wounds '+cap0+' -> '+dotCap()+', venomcraft '+Math.round(v0*100)+'% -> '+Math.round(venomPerStack()*100)+'% a stack');
  if(dotCap() !== cap0+1) bad.push('nightfall did not add a wound slot');
  if(!(venomPerStack() > v0)) bad.push('nightfall did not raise venomcraft');

  // warrior: Dragonfang doubles the floor bonus, and the chain says so
  ch.classId='warrior'; ch.loadouts.warrior = emptyLoadout(); mon(60);
  const r0 = bulwarkRage();
  eq('warrior','w_warrior_legendary');
  const r1 = bulwarkRage();
  App.run.hp = Math.round(combatStats().maxHp*0.2);
  const sk = currentSkillSet().filter(Boolean)[0];
  const bd = damageBreakdown(sk, combatStats(), App.run.monster);
  notes.push('warrior   bulwark rage '+Math.round(r0*100)+'% -> '+Math.round(r1*100)+'%, chain says "'+(bd.parts.find(x=>/Dragonfang|Bulwark/.test(x.label))||{}).label+'"');
  if(r1 !== 0.60) bad.push('dragonfang rage is '+r1);
  if(!bd.parts.some(x=>x.label==='Dragonfang')) bad.push('dragonfang is not named in the chain');

  // cleric: Aureate doubles holy against the undead only
  ch.classId='cleric'; ch.loadouts.cleric = emptyLoadout();
  const undead = {family:'Undead'}, beast = {family:'Beast'};
  const before = weakMultFor('holy', undead);
  eq('cleric','w_cleric_legendary');
  notes.push('cleric    holy vs undead ×'+before+' -> ×'+weakMultFor('holy', undead)+' (vs beast stays ×'+weakMultFor('holy', beast)+')');
  if(weakMultFor('holy', undead) !== 2) bad.push('aureate vs undead is '+weakMultFor('holy', undead));
  if(weakMultFor('holy', beast) !== WEAK_MULT) bad.push('aureate leaked onto non-undead');
  if(weakMultFor('fire', undead) !== WEAK_MULT) bad.push('aureate leaked onto fire');

  // mage: Infernal Ruin lengthens a burn
  ch.classId='mage'; ch.loadouts.mage = emptyLoadout(); mon(60);
  if(hasWeaponPassive('infernalruin')) bad.push('mage has the passive with no weapon');
  eq('mage','w_mage_legendary');
  if(!hasWeaponPassive('infernalruin')) bad.push('mage legendary carries no passive');
  App.run.dots = [];
  const fb = SKILLS.mage_fireball;
  notes.push('mage      fireball burn '+fb.dot.turns+' turns -> '+(fb.dot.turns+2)+' with Infernal Ruin');

  // and a non-legendary carries nothing
  const epic = WEAPON_CATALOG.find(w=>w.classId==='mage' && w.rarity==='epic');
  const ei = makeWeaponInstance(epic); ch.weapons.push(ei); equipItem('weapon', ei.id);
  if(weaponPassive()) bad.push('an epic weapon carries a legendary passive');

  // 4. an old single-loadout save moves across
  const old = defaultCharacter();
  old.classId = 'cleric';
  old.equipped = {weapon:'w1', head:'h1', chest:null, gloves:null, boots:null, artifact1:'phoenix', artifact2:null};
  const mig = migrateCharacter(old);
  if(mig.equipped) bad.push('the old equipped map survived');
  if(!mig.loadouts || !mig.loadouts.cleric) bad.push('no cleric loadout after migration');
  else if(mig.loadouts.cleric.weapon !== 'w1' || mig.loadouts.cleric.head !== 'h1' || mig.loadouts.cleric.artifact1 !== 'phoenix')
    bad.push('migration lost gear: '+JSON.stringify(mig.loadouts.cleric));
  if(mig.loadouts.warrior && mig.loadouts.warrior.weapon === 'w1') bad.push('migration gave it to the warrior too');

  // 5. boots can actually be equipped now (they were missing from the picker)
  App.character = migrateCharacter(defaultCharacter());
  App.character.classId = 'warrior';
  const boots = makeArmorInstance(ARMOR_CATALOG.find(a=>a.slot==='boots' && a.rarity==='rare'));
  App.character.armors.push(boots);
  App.slotPicker = {slot:'boots'};
  const picker = renderSlotPicker();
  if(picker.textContent.indexOf(boots.name) < 0) bad.push('boots still cannot be equipped: "'+picker.textContent.trim().slice(0,80)+'"');
  App.slotPicker = null;
  return {bad, notes};
});
out.notes.forEach(n=>console.log('  '+n));
console.log('problems:', out.bad.length ? '\n  '+out.bad.slice(0,20).join('\n  ') : 'none');
console.log('page errors:', errs.length?errs.join('\n'):'none');
await b.close();
process.exit(out.bad.length||errs.length?1:0);
})();
