async (page) => {
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const expect=(v,msg)=>{if(!v)throw Error(msg);};
  await page.goto('http://127.0.0.1:4175');await page.waitForFunction(()=>window.__gameTest);
  const layouts=[];
  for(const [width,height] of [[320,568],[375,667],[390,844],[844,390]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>__gameTest.start(0));
    const bounds=await page.locator('[data-control]').evaluateAll(buttons=>buttons.map(b=>{const r=b.getBoundingClientRect();return {name:b.dataset.control,x:r.x,y:r.y,w:r.width,h:r.height};}));
    expect(bounds.length===5,'missing touch button');
    for(const r of bounds){expect(r.w>=44&&r.h>=44,'button too small');expect(r.x>=0&&r.y>=0&&r.x+r.w<=width&&r.y+r.h<=height,`${r.name} clipped at ${width}`);}
    for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){
      const a=bounds[i],b=bounds[j];expect(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),`${a.name} overlaps ${b.name}`);
    }
    layouts.push(`${width}x${height}`);await page.screenshot({path:`output/playwright/combat-layout-${width}.png`});
  }
  await page.setViewportSize({width:390,height:844});
  const cdp=await page.context().newCDPSession(page);
  const point=async(name,id)=>{const r=await page.locator(`[data-control=${name}]`).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2,id};};
  const attack=await point('attack',3),right=await point('right',1),jump=await point('jump',2);
  await page.evaluate(()=>{__gameTest.start(0);const g=__gameTest.game;g.player.x=100;g.level.enemies=[{x:150,y:486,w:36,h:34,vx:0,min:150,max:150,alive:true}];});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[attack]});
  await page.waitForFunction(()=>!__gameTest.game.level.enemies[0].alive);
  await page.screenshot({path:'output/playwright/punch-impact.png'});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.evaluate(()=>__gameTest.start(0));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[right,jump,attack]});
  await page.waitForTimeout(130);
  expect(await page.evaluate(()=>__gameTest.input.right&&__gameTest.input.jump&&__gameTest.input.attack&&__gameTest.game.player.x>95&&__gameTest.game.player.y<460&&__gameTest.animation.state==='punch'),'running jumping punch failed');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  expect(await page.evaluate(()=>Object.values(__gameTest.input).every(v=>!v)),'released input stuck');
  await page.evaluate(()=>{__gameTest.start(5);const g=__gameTest.game;g.player.x=600;Object.assign(g.boss,{x:650,state:'stunned',timer:5,invulnerable:0});});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[attack]});
  await page.waitForFunction(()=>__gameTest.game.boss.hp===5);
  expect(await page.evaluate(()=>__gameTest.game.player.y===466),'punch incorrectly bounces the hero');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.setViewportSize({width:844,height:390});
  const markers=[];
  for(const [index,attackName] of ['slam','throw','charge'].entries()){
    await page.evaluate(index=>{__gameTest.start(5);const g=__gameTest.game;g.player.x=560;g.player.invulnerable=100;g.boss.x=850;g.boss.attackIndex=index;g.boss.timer=0;},index);
    await page.waitForFunction(()=>__gameTest.game.boss.state==='warn');
    await page.waitForTimeout(160);
    const plan=await page.evaluate(()=>__gameTest.game.boss.plan);expect(plan.attack===attackName,'wrong marker plan');
    await page.screenshot({path:`output/playwright/accurate-${attackName}-marker.png`});markers.push(attackName);
  }
  expect(errors.length===0,errors.join('\n'));
  return {layouts,enemyPunch:true,bossPunch:true,threeFingerMovingJumpPunch:true,markers,errors};
}
