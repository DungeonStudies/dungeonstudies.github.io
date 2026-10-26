const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage({viewport:{width:1000,height:800}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(async()=>{
    const bad=[], rows=[];
    // one monster of each movement kind, plus a boss
    const picks=[['pounce',2],['maul',3],['caster/hurl',21],['slam',13],['swoop',11],['boss',10],['boss',90]];
    for(const [label, floor] of picks){
      App.topTab='play'; App.character.classId='warrior'; setRealm('math'); startRun();
      App.run.floor=floor; App.run.monster=generateMonster(floor,0);
      App.run.hp=99999; App.run.maxHp=99999;
      App.dungeonView='battle'; App.currentPhase='postattack'; render();
      await new Promise(r=>setTimeout(r,120));
      const m=App.run.monster;
      const box=getBattleEls().monsterSprite;
      const mat=()=>{ const t=getComputedStyle(box).transform;
        if(!t||t==='none') return {x:0,y:0,a:1};
        const n=t.slice(t.indexOf('(')+1,-1).split(',').map(Number);
        return {x:n[4]||0, y:n[5]||0, a:n[0]}; };
      const base=mat();
      let maxX=0,maxY=0,sawFx=false,clips=new Set();
      const scene=getBattleEls().scene;
      const t=setInterval(()=>{
        const q=mat();
        maxX=Math.max(maxX,Math.abs(q.x-base.x)); maxY=Math.max(maxY,Math.abs(q.y-base.y));
        if(scene.querySelector('.fx')) sawFx=true;
        const n=box.querySelector('.spr'); const cm=n&&n.className.match(/spr-cre-(\w+)/); if(cm) clips.add(cm[1]);
      },20);
      await monsterAttackIntro(getBattleEls(), false);
      clearInterval(t);
      await new Promise(r=>setTimeout(r,80));
      const end=mat();
      const rest=Math.max(Math.abs(end.x-base.x),Math.abs(end.y-base.y),Math.abs(end.a-base.a)*40);
      const left=['advancing','streak','turned','blinkout'].filter(c=>box.classList.contains(c));
      rows.push([label+' f'+floor, m.name, monsterMoveKind(m), Math.round(maxX)+'px', Math.round(maxY)+'px', [...clips].join(',')]);
      const rooted = monsterMoveKind(m)==='hurl';   // a caster throws, it does not close
      if(!rooted && maxX<14) bad.push(m.name+' ('+monsterMoveKind(m)+') never crossed the room: '+Math.round(maxX)+'px');
      if(rooted && maxX<6) bad.push(m.name+' (hurl) did not even rock into the throw: '+Math.round(maxX)+'px');
      if(rooted && maxX>60) bad.push(m.name+' (hurl) closed to melee instead of throwing: '+Math.round(maxX)+'px');
      if(!sawFx) bad.push(m.name+' ('+monsterMoveKind(m)+') drew no impact');
      if(!clips.has('atk')) bad.push(m.name+' never played its attack frames, saw ['+[...clips]+']');
      if(rest>2) bad.push(m.name+' ended '+Math.round(rest)+'px off its mark (boss scale lost?)');
      if(left.length) bad.push(m.name+' left classes '+left.join(','));
    }
    return {bad, rows};
  });
  console.log('case            monster                  move      travelX  travelY  clips');
  r.rows.forEach(x=>console.log(x[0].padEnd(16), x[1].padEnd(24), x[2].padEnd(9), x[3].padEnd(8), x[4].padEnd(8), x[5]));
  console.log('\nfailures:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  console.log('errors:', errs.length?errs:'none');
  await b.close();
  process.exit(r.bad.length||errs.length?1:0);
})();
