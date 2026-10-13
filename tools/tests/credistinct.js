const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--headless=new']});
  const p=await b.newPage();
  await p.goto('file:///home/user/Study-dungeon/index.html');
  await p.waitForTimeout(400);
  const r = await p.evaluate(()=>{
    const bad=[], rows=[];
    // how many pixels actually change between one frame and the next
    const diff=(a,b)=>{ let n=0; for(let y=0;y<a.length;y++) for(let x=0;x<a[y].length;x++) if(a[y][x]!==b[y][x]) n++; return n; };
    for(const name of Object.keys(CRE_SHEET)){
      const sh=CRE_SHEET[name];
      const fr=i=>sh.px[i];
      const atk=sh.clips.atk, mv=sh.clips.move, idle=sh.clips.idle;
      const a01=diff(fr(atk[0]),fr(atk[1])), a12=diff(fr(atk[1]),fr(atk[2])), a02=diff(fr(atk[0]),fr(atk[2]));
      const m01=diff(fr(mv[0]),fr(mv[1]));
      let idleMax=0; for(let i=1;i<idle.length;i++) idleMax=Math.max(idleMax,diff(fr(idle[0]),fr(idle[i])));
      rows.push([name, a01, a12, a02, m01, idleMax]);
      if(a01<25) bad.push(name+': attack gather->strike only moves '+a01+'px');
      if(a12<25) bad.push(name+': attack strike->follow only moves '+a12+'px');
      if(a02<15) bad.push(name+': attack gather and follow are near-identical ('+a02+'px)');
      if(m01<10) bad.push(name+': the two travel frames are near-identical ('+m01+'px)');
      if(idleMax<8) bad.push(name+': the idle barely moves ('+idleMax+'px)');
    }
    return {bad, rows};
  });
  console.log('creature      gather→strike  strike→follow  gather→follow  travel  idle');
  r.rows.forEach(x=>console.log(x[0].padEnd(14)+String(x[1]).padStart(8)+String(x[2]).padStart(14)+String(x[3]).padStart(15)+String(x[4]).padStart(8)+String(x[5]).padStart(6)));
  console.log('\nproblems:', r.bad.length?'\n  '+r.bad.join('\n  '):'none');
  await b.close();
  process.exit(r.bad.length?1:0);
})();
