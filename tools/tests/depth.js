const {chromium}=require('playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
const p=await b.newPage({viewport:{width:1100,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
await p.goto('file:///home/user/Study-dungeon/index.html');
await p.waitForFunction(()=>typeof App!=='undefined');
const out = await p.evaluate(()=>{
  const bad=[];
  // 1. gear and kit scale with depth, and nothing wears armour up top
  const rows=[];
  [1,5,11,12,18,20,40,60,80,100].forEach(f=>{
    const m = generateMonster(f, 0);
    rows.push({f, gear:(m.gear||[]).length, kit:(m.kit||[]).length,
               cun:+(m.cunning||0).toFixed(2), wit:+(m.wits||0).toFixed(2), def:m.def, spd:m.spd});
  });
  if(rows[0].gear || rows[0].kit) bad.push('floor 1 is geared/kitted');
  if(rows.find(r=>r.f===11).kit) bad.push('kit before the skill floor');
  if(!rows.find(r=>r.f===12).kit.length && rows.find(r=>r.f===12).kit!==0){}
  if(rows.find(r=>r.f===12).kit === 0) bad.push('no kit at the skill floor');
  if(rows.find(r=>r.f===18).gear === 0) bad.push('no gear at the gear floor');
  // the final boss is deliberately the one thing down there that wears none
  if(rows.find(r=>r.f===100).gear !== 0) bad.push('the last boss is wearing looted plate');
  if(rows.find(r=>r.f===80).gear < 4) bad.push('floor 80 underdressed');
  for(let i=1;i<rows.length;i++) if(rows[i].cun < rows[i-1].cun) bad.push('cunning went backwards at '+rows[i].f);

  // 2. armour is actually visible: the steel keys reach the SVG
  const plain = creatureArt('skeleton','#fff',{still:true});
  const clad  = creatureArt('skeleton','#fff',{still:true, gear:['helm','plate','bracer','greave']});
  if(plain === clad) bad.push('gear did not change the sprite');
  if(clad.indexOf('#aeb8c9') < 0) bad.push('no steel in the clad sprite');
  // and the silhouette is untouched: same number of drawn cells
  // compare the grids themselves: gear must repaint cells, never add or drop one
  const sh = creSheet('skeleton');
  const idA = sh.clips.idle[0];
  const gA = pxFromRows(sh.px[idA], CRE_W, CRE_H);
  const gB = pxFromRows(sh.px[idA], CRE_W, CRE_H);
  creGear(gB, ['helm','plate','bracer','greave']);
  let filledA = 0, filledB = 0, steel = 0;
  for(let y=0;y<CRE_H;y++) for(let x=0;x<CRE_W;x++){
    if(gA[y][x] !== '.') filledA++;
    if(gB[y][x] !== '.') filledB++;
    if('MmvV'.indexOf(gB[y][x]) >= 0) steel++;
  }
  if(filledA !== filledB) bad.push('gear changed the silhouette: '+filledA+' vs '+filledB);
  if(steel < 20) bad.push('barely any steel got painted: '+steel);

  // 3. every skill is legal and does what it says
  const ran = {};
  App.run = Object.assign(defaultRun(), {active:true, floor:80, hp:200, energy:5, difficulty:'medium'});
  App.run.monster = generateMonster(80, 0);
  const m = App.run.monster;
  const st = combatStats();
  Object.keys(MON_SKILLS).forEach(id=>{
    const s = MON_SKILLS[id];
    App.run.monsterBuffs=[]; App.run.buffs=[]; App.run.playerBleed={turnsLeft:0,perTurn:0};
    App.run.energy = st.energyMax; m.hp = Math.round(m.maxHp*0.3); m.braced=0; m.mended=false;
    if(!s.ok(m, st)){ bad.push(id+' is never legal'); return; }
    const sc = s.score(m, st); if(typeof sc !== 'number' || isNaN(sc)) bad.push(id+' scores NaN');
    const note = s.run(m, st);
    ran[id] = note;
    if(id === 'brace' && !(m.braced > 0)) bad.push('brace did not stick');
  });

  // 4. Brace halves the hit, and the button says so
  App.run.monsterBuffs=[]; App.run.buffs=[]; m.hp=m.maxHp;
  const sk = Object.values(SKILLS).find(s=>s.id==='warrior_slash') || Object.values(SKILLS)[0];
  App.character.classId='warrior';
  App.character.strength = 400;            // enough attack that nothing clamps to 1
  const st2 = combatStats();
  m.braced = 0; const a = damageBreakdown(sk, st2, m).est;
  m.braced = 1; const bfd = damageBreakdown(sk, st2, m); const bv = bfd.est;
  if(!(bv < a)) bad.push('braced estimate is not lower: '+a+' -> '+bv);
  if(!bfd.parts.some(x=>x.label==='Braced')) bad.push('braced not named in the breakdown');

  // 5. the mage no longer pierces
  App.character.classId='mage';
  const fb = SKILLS.mage_fireball;
  if(fb.defPierce) bad.push('mage ultimate still pierces');
  const mb = damageBreakdown(fb, combatStats(), m);
  if(mb.parts.some(x=>/pierce/i.test(x.label))) bad.push('pierce still in the mage breakdown');

  // 6. armour slots
  if(ARMOR_SLOTS.join() !== 'head,chest,gloves,boots') bad.push('slots are '+ARMOR_SLOTS.join());
  if(ARMOR_CATALOG.some(a=>a.slot==='legs')) bad.push('legs still in the catalog');
  const bootLine = ARMOR_CATALOG.filter(a=>a.slot==='boots');
  if(!bootLine.every(a=>a.spd>0)) bad.push('some boots carry no speed');
  if(!bootLine.every(a=>a.def>0)) bad.push('some boots carry no armour');
  if(ARMOR_CATALOG.filter(a=>a.slot==='gloves').length !== 4) bad.push('gloves line incomplete');
  if(armorArt('gloves','rare') === armorArt('chest','rare')) {} else {}
  if(!armorArt('gloves','rare')) bad.push('no gloves art');

  // 7. an old save with greaves migrates
  const old = defaultCharacter();
  old.equipped = {weapon:null, head:null, chest:null, legs:'a_legs_rare', boots:null, artifact1:null, artifact2:null};
  old.armors = [{id:'a_legs_rare', lineId:'a_legs_rare', slot:'legs', name:'Iron Greaves', def:5, rarity:'rare'}];
  const mig = migrateCharacter(old);
  if(mig.equipped) bad.push('the old shared equipped map survived');
  const lo = loadoutFor(mig.classId, mig);
  if(lo.legs !== undefined) bad.push('legs slot survived migration');
  if(lo.gloves !== 'a_legs_rare') bad.push('greaves did not move to the gloves slot');
  if(mig.armors[0].slot !== 'gloves') bad.push('greaves item kept its old slot');
  if(mig.armors[0].name !== 'Iron Gauntlets') bad.push('greaves kept its old name: '+mig.armors[0].name);

  return {rows, bad, ran};
});
console.log(out.rows.map(r=>`  f${String(r.f).padStart(3)} gear ${r.gear} kit ${r.kit} cunning ${r.cun} wits ${r.wit} def ${r.def} spd ${r.spd}`).join('\n'));
console.log('skills:'); Object.keys(out.ran).forEach(k=>console.log('  '+k+': '+out.ran[k]));
console.log('problems:', out.bad.length ? '\n  '+out.bad.join('\n  ') : 'none');
console.log('page errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
process.exit(out.bad.length || errs.length ? 1 : 0);
})();
