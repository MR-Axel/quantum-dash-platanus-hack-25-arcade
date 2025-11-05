// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=40,STICK_W=4,WALL_SPACING=280,PORTAL_W=100,WALL_THICK=8;
let sc=0,m=0,p1,p2,walls=[],cam,g,spd=2.5,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd,txts={},baseSpeed=4;

const P1_COLOR=0x00ccff; // Cyan for P1
const P2_COLOR=0xff9900; // Orange for P2

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#000',scene:{create,update}};
new Phaser.Game(cfg);

function create(){
  this.g=this.add.graphics();
  cam=this.cameras.main;
  snd=this.sound.context;
  g=this.g;

  txts.title=this.add.text(W/2,H/2-120,'QUANTUM DASH',{fontSize:'56px',color:'#0ff',fontFamily:'monospace',fontStyle:'bold'}).setOrigin(0.5);
  txts.sub=this.add.text(W/2,H/2-40,'Portal Runner',{fontSize:'24px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt1=this.add.text(W/2,H/2+40,'Press 1 for ONE PLAYER',{fontSize:'28px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.opt2=this.add.text(W/2,H/2+80,'Press 2 for TWO PLAYERS',{fontSize:'28px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint1=this.add.text(W/2,H/2+140,'Go through COLORED portal!',{fontSize:'18px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint2=this.add.text(W/2,H/2+165,'2P: Each color for each player!',{fontSize:'16px',color:'#aaa',fontFamily:'monospace'}).setOrigin(0.5);
  txts.hint3=this.add.text(W/2,H/2+190,'Hit wall = DEATH!',{fontSize:'18px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.ctrl=this.add.text(W/2,H-40,'P1: ← → | P2: A D',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1sc=this.add.text(20,20,'',{fontSize:'20px',color:'#0af',fontFamily:'monospace'}).setOrigin(0);
  txts.p2sc=this.add.text(W-150,20,'',{fontSize:'20px',color:'#f90',fontFamily:'monospace'}).setOrigin(0);
  txts.timer=this.add.text(W/2,20,'',{fontSize:'24px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);
  txts.help=this.add.text(W/2,50,'',{fontSize:'16px',color:'#ff0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.menu=this.add.text(W/2,H-20,'T: Menu',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
  txts.go=this.add.text(W/2,H/2-80,'GAME OVER',{fontSize:'52px',color:'#f55',fontFamily:'monospace'}).setOrigin(0.5);
  txts.win=this.add.text(W/2,H/2-10,'',{fontSize:'40px',color:'#0f0',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p1end=this.add.text(W/2,H/2+40,'',{fontSize:'26px',color:'#0af',fontFamily:'monospace'}).setOrigin(0.5);
  txts.p2end=this.add.text(W/2,H/2+75,'',{fontSize:'26px',color:'#f90',fontFamily:'monospace'}).setOrigin(0.5);
  txts.restart=this.add.text(W/2,H/2+130,'SPACE: Back to Menu',{fontSize:'22px',color:'#fff',fontFamily:'monospace'}).setOrigin(0.5);

  this.input.keyboard.on('keydown-ONE',()=>{if(sc===0)start(this,0)});
  this.input.keyboard.on('keydown-TWO',()=>{if(sc===0)start(this,1)});
  this.input.keyboard.on('keydown-SPACE',()=>{if(sc===2){sc=0;walls=[];t=0;spd=2.5;baseSpeed=4;nextId=0;showMenu();}});
  this.input.keyboard.on('keydown-T',()=>{if(sc===1){sc=0;walls=[];t=0;spd=2.5;baseSpeed=4;nextId=0;showMenu();}});

  showMenu();
}

function start(s,mode){
  m=mode;sc=1;t=0;spd=2.5;baseSpeed=4;walls=[];nextId=0;
  const x1=m===1?W/3:W/2;
  const x2=2*W/3;
  p1={x:x1,vx:0,y:H-80,path:[],alive:1,sc:0};
  if(m===1)p2={x:x2,vx:0,y:H-80,path:[],alive:1,sc:0};
  else p2=null;

  // First wall
  spawnWall();

  hideAll();
  showGame();
}

function update(_,dt){
  if(sc===0)return;
  if(sc===2)return;

  t+=dt*0.001;

  // Progressive difficulty - SLOWER acceleration
  if(t>10)spd=2.5+t*0.08;
  if(spd>6)spd=6;

  // Player speed also increases SLOWER
  if(t>10)baseSpeed=4+t*0.05;
  if(baseSpeed>7)baseSpeed=7;

  // Reduce wall spacing as game progresses SLOWER
  const currentSpacing=Math.max(220,WALL_SPACING-t*2);

  if(walls.length===0||walls[walls.length-1].y>currentSpacing)spawnWall();

  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=spd;

    // Move portals laterally
    for(let pt of walls[i].portals){
      if(pt.vx){
        pt.x+=pt.vx;
        // Bounce at edges
        if(pt.x<50||pt.x>W-pt.w-50){
          pt.vx*=-1;
        }
      }
    }

    if(walls[i].y>H+50)walls.splice(i,1);
  }

  const k=this.input.keyboard;
  if(p1&&p1.alive){
    if(k.addKey('LEFT').isDown)p1.vx=-baseSpeed;
    else if(k.addKey('RIGHT').isDown)p1.vx=baseSpeed;
    else p1.vx*=0.85;
  }

  if(p2&&p2.alive){
    if(k.addKey('A').isDown)p2.vx=-baseSpeed;
    else if(k.addKey('D').isDown)p2.vx=baseSpeed;
    else p2.vx*=0.85;
  }

  upd(p1,1);
  if(p2)upd(p2,2);

  // Player collision (2P push mechanic) - STRONGER
  if(m===1&&p1.alive&&p2.alive){
    const dist=Math.abs(p1.x-p2.x);
    if(dist<STICK_W+4){
      const pushForce=3.5; // Increased from 1.5
      if(p1.x<p2.x){
        p1.x-=pushForce;
        p2.x+=pushForce;
      }else{
        p1.x+=pushForce;
        p2.x-=pushForce;
      }
    }
  }

  // Check game over conditions
  if(m===0){
    // 1P: Just check if dead
    if(!p1.alive){
      sc=2;
      tone(150,400);
      showEnd();
    }
  }else{
    // 2P: If one dies, other wins
    if(!p1.alive||!p2.alive){
      sc=2;
      tone(150,400);
      showEnd();
    }
  }

  draw();

  if(m===0){
    // 1P: Show score
    if(p1)txts.p1sc.setText(`Score: ${p1.sc}`);
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
  }else{
    // 2P: Show status for each
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
    if(p1)txts.p1sc.setText(`P1: ${p1.alive?'ALIVE':'DEAD'}`);
    if(p2)txts.p2sc.setText(`P2: ${p2.alive?'ALIVE':'DEAD'}`);
  }
}

function spawnWall(){
  // Calculate portal size based on time (shrinks progressively)
  let portalSize=PORTAL_W;
  if(t>30){
    // After 30s, start shrinking
    const shrinkFactor=Math.min((t-30)*0.8,PORTAL_W-20); // Never smaller than 20px
    portalSize=Math.max(20,PORTAL_W-shrinkFactor);
  }

  // Decide if portals should move (20% chance after 15s)
  const shouldMove=t>15&&Math.random()<0.2;
  const moveSpeed=shouldMove?(Math.random()*1.5+0.5)*(Math.random()<0.5?1:-1):0;

  if(m===0){
    // 1P: Single portal in random position
    const minX=60;
    const maxX=W-portalSize-60;
    const portalX=minX+Math.random()*(maxX-minX);
    const prevSafe=walls.length>0?walls.find(w=>w.safe):null;
    const col=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];

    walls.push({
      y:-50,
      portals:[{x:portalX,w:portalSize,col,forP1:1,forP2:0,vx:moveSpeed}],
      id:nextId,
      p1hit:0,
      p2hit:0
    });
  }else{
    // 2P: Variable spacing
    const minX=80;
    const maxX=W-portalSize-80;

    const spacingMode=Math.random();
    let p1X,p2X;

    if(spacingMode<0.3){
      // 30% chance: Same position (both must pass through same portal)
      p1X=minX+Math.random()*(maxX-minX);
      p2X=p1X;
    }else if(spacingMode<0.6){
      // 30% chance: Close together
      p1X=minX+Math.random()*(maxX-minX);
      const offset=(Math.random()*40+10)*(Math.random()<0.5?1:-1);
      p2X=Math.max(minX,Math.min(maxX,p1X+offset));
    }else{
      // 40% chance: Far apart
      do{
        p1X=minX+Math.random()*(maxX-minX);
        p2X=minX+Math.random()*(maxX-minX);
      }while(Math.abs(p1X-p2X)<portalSize+60);
    }

    walls.push({
      y:-50,
      portals:[
        {x:p1X,w:portalSize,col:P1_COLOR,forP1:1,forP2:0,vx:moveSpeed},
        {x:p2X,w:portalSize,col:P2_COLOR,forP1:0,forP2:1,vx:moveSpeed}
      ],
      id:nextId,
      p1hit:0,
      p2hit:0
    });
  }
  nextId++;
}

function upd(p,playerNum){
  if(!p||!p.alive)return;

  p.x+=p.vx;
  if(p.x<10)p.x=10;
  if(p.x>W-10)p.x=W-10;

  for(let w of walls){
    // Check which player hit this wall
    const alreadyHit=playerNum===1?w.p1hit:w.p2hit;

    if(Math.abs(w.y-p.y)<25&&!alreadyHit){
      let hitCorrectPortal=0;
      let hitWrongPortal=0;

      // Check each portal
      for(let pt of w.portals){
        if(p.x>pt.x&&p.x<pt.x+pt.w){
          // Player is in this portal
          if((playerNum===1&&pt.forP1)||(playerNum===2&&pt.forP2)){
            hitCorrectPortal=1;
          }else{
            hitWrongPortal=1;
          }
          break;
        }
      }

      if(hitCorrectPortal){
        // Passed through correct portal
        if(playerNum===1)w.p1hit=1;
        else w.p2hit=1;

        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.sc+=100;
          tone(700,100);
        }
      }else{
        // Hit wall or wrong portal
        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.alive=0;
          cam.shake(400,0.015);
          tone(120,300);
        }
      }
    }

    // In 2P: Check if wall passed both players
    if(m===1&&w.y>H-60){
      // Check if each player went through their portal
      if(!w.p1hit&&p1.alive){
        p1.alive=0;
        cam.shake(400,0.015);
        tone(120,300);
      }
      if(!w.p2hit&&p2.alive){
        p2.alive=0;
        cam.shake(400,0.015);
        tone(120,300);
      }
    }
  }
}

function draw(){
  g.clear();

  // Draw walls with portal gaps
  for(let w of walls){
    const wallCol=0x666666;

    // Sort portals by x position for drawing wall segments
    const sortedPortals=[...w.portals].sort((a,b)=>a.x-b.x);

    // Draw wall before first portal
    if(sortedPortals[0].x>0){
      g.fillStyle(wallCol);
      g.fillRect(0,w.y-WALL_THICK/2,sortedPortals[0].x,WALL_THICK);
    }

    // Draw portals and wall segments between them
    for(let i=0;i<sortedPortals.length;i++){
      const portal=sortedPortals[i];

      // Draw portal gap with colored outline
      g.lineStyle(4,portal.col);
      g.strokeRect(portal.x,w.y-WALL_THICK/2-4,portal.w,WALL_THICK+8);

      // Portal inner glow
      g.fillStyle(portal.col,0.3);
      g.fillRect(portal.x,w.y-WALL_THICK/2,portal.w,WALL_THICK);

      // Portal indicator dot (white for 1P, no dot for 2P)
      if(m===0){
        g.fillStyle(0xffffff);
        g.fillCircle(portal.x+portal.w/2,w.y,6);
      }

      // Movement indicator (arrow)
      if(portal.vx){
        g.fillStyle(0xffffff,0.6);
        const arrowSize=4;
        const cx=portal.x+portal.w/2;
        const cy=w.y;
        if(portal.vx>0){
          // Right arrow
          g.fillTriangle(cx+8,cy,cx+8+arrowSize,cy+arrowSize,cx+8+arrowSize,cy-arrowSize);
        }else{
          // Left arrow
          g.fillTriangle(cx-8,cy,cx-8-arrowSize,cy+arrowSize,cx-8-arrowSize,cy-arrowSize);
        }
      }

      // Wall segment between portals
      if(i<sortedPortals.length-1){
        const nextPortal=sortedPortals[i+1];
        const segStart=portal.x+portal.w;
        const segWidth=nextPortal.x-segStart;
        if(segWidth>0){
          g.fillStyle(wallCol);
          g.fillRect(segStart,w.y-WALL_THICK/2,segWidth,WALL_THICK);
        }
      }
    }

    // Draw wall after last portal
    const lastPortal=sortedPortals[sortedPortals.length-1];
    const endX=lastPortal.x+lastPortal.w;
    if(endX<W){
      g.fillStyle(wallCol);
      g.fillRect(endX,w.y-WALL_THICK/2,W-endX,WALL_THICK);
    }
  }

  // Player 1 (simple stick - THINNER)
  if(p1){
    const col=p1.alive?P1_COLOR:0x444;
    g.lineStyle(STICK_W,col);
    g.lineBetween(p1.x,p1.y,p1.x,p1.y-STICK_H);
  }

  // Player 2
  if(p2){
    const col=p2.alive?P2_COLOR:0x444;
    g.lineStyle(STICK_W,col);
    g.lineBetween(p2.x,p2.y,p2.x,p2.y-STICK_H);
  }
}

function showMenu(){
  hideAll();
  g.clear();
  txts.title.setVisible(1);
  txts.sub.setVisible(1);
  txts.opt1.setVisible(1);
  txts.opt2.setVisible(1);
  txts.hint1.setVisible(1);
  txts.hint2.setVisible(1);
  txts.hint3.setVisible(1);
  txts.ctrl.setVisible(1);
}

function showGame(){
  hideAll();
  if(m===0){
    txts.p1sc.setVisible(1);
    txts.help.setVisible(1).setText('WHITE DOT = SAFE!');
  }else{
    txts.p1sc.setVisible(1);
    txts.p2sc.setVisible(1);
    txts.help.setVisible(1).setText('MATCH YOUR COLOR!');
  }
  txts.timer.setVisible(1);
  txts.menu.setVisible(1);
}

function showEnd(){
  hideAll();

  g.fillStyle(0x000000,0.85);
  g.fillRect(0,0,W,H);

  txts.go.setVisible(1);
  txts.restart.setVisible(1);

  if(m===0){
    // 1P: Show score and time
    txts.p1end.setVisible(1).setText(`Score: ${p1.sc} pts | Time: ${t.toFixed(1)}s`);
  }else{
    // 2P: Show who won based on who survived
    txts.timer.setVisible(1);

    if(p1.alive&&!p2.alive){
      txts.win.setVisible(1).setText('P1 WINS!');
      txts.p1end.setVisible(1).setText('P1: Survived');
      txts.p2end.setVisible(1).setText('P2: Died');
    }else if(p2.alive&&!p1.alive){
      txts.win.setVisible(1).setText('P2 WINS!');
      txts.p1end.setVisible(1).setText('P1: Died');
      txts.p2end.setVisible(1).setText('P2: Survived');
    }else{
      // Both died at same time
      txts.win.setVisible(1).setText('DRAW!');
      txts.p1end.setVisible(1).setText('P1: Died');
      txts.p2end.setVisible(1).setText('P2: Died');
    }
  }
}

function hideAll(){
  for(let k in txts)txts[k].setVisible(0);
}

function tone(f,d){
  if(!snd)return;
  const o=snd.createOscillator(),gn=snd.createGain();
  o.connect(gn);gn.connect(snd.destination);
  o.frequency.value=f;o.type='square';
  gn.gain.setValueAtTime(0.06,snd.currentTime);
  gn.gain.exponentialRampToValueAtTime(0.01,snd.currentTime+d/1000);
  o.start();o.stop(snd.currentTime+d/1000);
}
