// Quantum Dash - Portal Runner
const W=800,H=600,STICK_H=40,STICK_W=4,WALL_SPACING=280,PORTAL_W=100,WALL_THICK=8,MIN_PORTAL=40,MAX_PORTAL=W-120,TROLL_PROB=0.025,TROLL_DIST=150;
let sc=0,m=0,p1,p2,walls=[],cam,g,spd=2,t=0,colors=[0x00ffff,0xff00ff,0xffff00,0xff0000,0x00ff00],nextId=0,snd,txts={},baseSpeed=3.5;

const P1_COLOR=0x00ccff; // Cyan for P1
const P2_COLOR=0xff9900; // Orange for P2
const UNIFIED_COLOR=0x9933ff; // Violet for unified portal

const cfg={type:Phaser.AUTO,width:W,height:H,backgroundColor:'#000',scene:{create,update}};
new Phaser.Game(cfg);

function blendColor(c1,c2,f){
  const r1=(c1>>16)&0xff,g1=(c1>>8)&0xff,b1=c1&0xff;
  const r2=(c2>>16)&0xff,g2=(c2>>8)&0xff,b2=c2&0xff;
  const r=Math.round(r1+(r2-r1)*f);
  const g=Math.round(g1+(g2-g1)*f);
  const b=Math.round(b1+(b2-b1)*f);
  return(r<<16)|(g<<8)|b;
}

function getPortalSize(time){
  // Full-width joke portals only after 40s (5% chance)
  if(time>40&&Math.random()<0.05)return MAX_PORTAL;

  // Small portals only after 30s (25% chance when available)
  if(time>30&&Math.random()<0.25){
    return MIN_PORTAL+Math.random()*(PORTAL_W-MIN_PORTAL)*0.7;
  }

  // Standard size (default)
  return PORTAL_W;
}

function getHelpMsg(time,mode){
  if(time<20){
    return mode===0?'Go through colored stripes!':'MATCH YOUR COLOR!';
  }else if(time<30){
    return mode===0?'Watch out! Portals can move!':'Moving portals incoming!';
  }else if(time<40){
    return mode===0?'Tiny portals appear!':'Small targets ahead!';
  }else if(time<50){
    return mode===0?'Some portals play tricks...':'Troll portals active!';
  }else{
    return mode===0?'Chaos mode! Anything goes!':'SURVIVE THE MADNESS!';
  }
}

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
  txts.ctrl=this.add.text(W/2,H-40,'P1: ← → ↑ ↓ | P2: A D W S',{fontSize:'16px',color:'#888',fontFamily:'monospace'}).setOrigin(0.5);
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
  this.input.keyboard.on('keydown-SPACE',()=>{if(sc===2){sc=0;walls=[];t=0;spd=2;baseSpeed=3.5;nextId=0;showMenu();}});
  this.input.keyboard.on('keydown-T',()=>{if(sc===1){sc=0;walls=[];t=0;spd=2;baseSpeed=3.5;nextId=0;showMenu();}});

  showMenu();
}

function start(s,mode){
  m=mode;sc=1;t=0;spd=2;baseSpeed=3.5;walls=[];nextId=0;
  const x1=m===1?W/3:W/2;
  const x2=2*W/3;
  p1={x:x1,vx:0,y:H-80,vy:0,path:[],alive:1,sc:0};
  if(m===1)p2={x:x2,vx:0,y:H-80,vy:0,path:[],alive:1,sc:0};
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

  // Progressive difficulty - VERY SLOW acceleration
  if(t>20){
    // Start acceleration after 20s, very gradual
    spd=2+Math.min((t-20)*0.03,3); // Max speed 5 (instead of 6)
    baseSpeed=3.5+Math.min((t-20)*0.02,2.5); // Max speed 6 (instead of 7)
  }

  // Variable wall spacing - calculate minimum safe distance
  const minSpacing=(baseSpeed+spd)*45; // Reaction time ~45 frames
  const maxSpacing=minSpacing*2.5;
  const currentSpacing=minSpacing+Math.random()*(maxSpacing-minSpacing);

  if(walls.length===0||walls[walls.length-1].y>currentSpacing)spawnWall();

  for(let i=walls.length-1;i>=0;i--){
    walls[i].y+=spd;

    const w=walls[i];

    // Move portals laterally and troll behavior
    for(let pt of w.portals){
      if(pt.vx){
        pt.x+=pt.vx;
        // Bounce at edges
        if(pt.x<50||pt.x>W-pt.w-50){
          pt.vx*=-1;
        }
      }

      // Troll portal: moves away when player approaches (but stays reachable)
      if(pt.troll&&!pt.trollActive){
        const distY=Math.abs(w.y-p1.y);
        const distX=Math.abs(pt.x+pt.w/2-p1.x);
        if(distY<TROLL_DIST&&distX<80){
          pt.trollActive=1;
          // Move to nearby position (not too far)
          const direction=(p1.x<pt.x?1:-1);
          const moveDistance=80+Math.random()*60; // 80-140px away
          const targetX=pt.x+direction*moveDistance;
          // Ensure it stays within bounds
          pt.targetX=Math.max(60,Math.min(W-pt.w-60,targetX));
          pt.vx=direction*baseSpeed*1.5; // Moderate speed
          tone(800,80); // Troll sound
        }
      }
      // Stop troll portal when it reaches target
      if(pt.trollActive&&pt.targetX){
        if((pt.vx>0&&pt.x>=pt.targetX)||(pt.vx<0&&pt.x<=pt.targetX)){
          pt.x=pt.targetX;
          pt.vx=0;
          pt.targetX=null;
        }
      }
    }

    // Portal collision and merging (2P only)
    if(m===1&&w.portals.length===2&&!w.portals[0].unified){
      const p1p=w.portals[0];
      const p2p=w.portals[1];

      // Check overlap
      const overlap=Math.max(0,Math.min(p1p.x+p1p.w,p2p.x+p2p.w)-Math.max(p1p.x,p2p.x));

      if(overlap>0){
        // Portals are overlapping
        const collisionType=Math.random();

        if(collisionType<0.5){
          // Bounce off each other
          if(p1p.vx&&p2p.vx){
            p1p.vx*=-1;
            p2p.vx*=-1;
          }
        }else{
          // Merge - blend colors to violet in overlapping area
          // Calculate blending factor based on overlap
          const blendFactor=Math.min(overlap/p1p.w,1);

          // Gradually turn violet
          if(blendFactor>0.3){
            p1p.col=blendColor(P1_COLOR,UNIFIED_COLOR,blendFactor);
            p2p.col=blendColor(P2_COLOR,UNIFIED_COLOR,blendFactor);
          }
        }
      }else if(overlap===0){
        // Reset colors when separated
        if(p1p.col!==P1_COLOR)p1p.col=P1_COLOR;
        if(p2p.col!==P2_COLOR)p2p.col=P2_COLOR;
      }
    }

    if(w.y>H+50)walls.splice(i,1);
  }

  const k=this.input.keyboard;
  if(p1&&p1.alive){
    if(k.addKey('LEFT').isDown)p1.vx=-baseSpeed;
    else if(k.addKey('RIGHT').isDown)p1.vx=baseSpeed;
    else p1.vx*=0.85;

    if(k.addKey('UP').isDown)p1.vy=-baseSpeed;
    else if(k.addKey('DOWN').isDown)p1.vy=baseSpeed;
    else p1.vy*=0.85;
  }

  if(p2&&p2.alive){
    if(k.addKey('A').isDown)p2.vx=-baseSpeed;
    else if(k.addKey('D').isDown)p2.vx=baseSpeed;
    else p2.vx*=0.85;

    if(k.addKey('W').isDown)p2.vy=-baseSpeed;
    else if(k.addKey('S').isDown)p2.vy=baseSpeed;
    else p2.vy*=0.85;
  }

  upd(p1,1);
  if(p2)upd(p2,2);

  // Player collision (2P push mechanic)
  if(m===1&&p1.alive&&p2.alive){
    const dist=Math.abs(p1.x-p2.x);
    if(dist<STICK_W+4){
      const pushForce=3.5;
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
    if(!p1.alive){
      sc=2;
      tone(150,400);
      showEnd();
    }
  }else{
    if(!p1.alive||!p2.alive){
      sc=2;
      tone(150,400);
      showEnd();
    }
  }

  draw();

  // Update help message dynamically
  txts.help.setText(getHelpMsg(t,m));

  if(m===0){
    if(p1)txts.p1sc.setText(`Score: ${p1.sc}`);
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
  }else{
    txts.timer.setText(`Time: ${t.toFixed(1)}s`);
    if(p1)txts.p1sc.setText(`P1: ${p1.alive?'ALIVE':'DEAD'}`);
    if(p2)txts.p2sc.setText(`P2: ${p2.alive?'ALIVE':'DEAD'}`);
  }
}

function spawnWall(){
  // Variable portal size system based on time
  let portalSize=getPortalSize(t);

  // Apply progressive shrinking after 40s (only to standard portals)
  if(t>40&&portalSize===PORTAL_W){
    const shrinkFactor=Math.min((t-40)*0.6,PORTAL_W-20);
    portalSize=Math.max(20,PORTAL_W-shrinkFactor);
  }

  // Decide if portals should move - starts at 20s, increase probability over time
  const moveProb=t>20?Math.min(0.15+(t-20)*0.005,0.4):0;
  const shouldMove=Math.random()<moveProb;
  const moveSpeed=shouldMove?(Math.random()*1.2+0.4)*(Math.random()<0.5?1:-1):0;

  // Troll portal only after 40s and only for standard-size portals (not small, not joke)
  const isTroll=t>40&&portalSize===PORTAL_W&&Math.random()<TROLL_PROB;

  if(m===0){
    // 1P: Single portal in random position
    const minX=60;
    const maxX=W-portalSize-60;
    const portalX=minX+Math.random()*(maxX-minX);
    const prevSafe=walls.length>0?walls.find(w=>w.safe):null;
    const col=prevSafe?prevSafe.col:colors[Math.floor(Math.random()*colors.length)];

    walls.push({
      y:-50,
      portals:[{x:portalX,w:portalSize,col,forP1:1,forP2:0,vx:moveSpeed,troll:isTroll,trollActive:0}],
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
      // 30% chance: Same position - unified violet portal
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

    // If portals are in same position, create unified violet portal
    if(p1X===p2X){
      walls.push({
        y:-50,
        portals:[{x:p1X,w:portalSize,col:UNIFIED_COLOR,forP1:1,forP2:1,vx:moveSpeed,unified:1,troll:isTroll,trollActive:0}],
        id:nextId,
        p1hit:0,
        p2hit:0
      });
    }else{
      walls.push({
        y:-50,
        portals:[
          {x:p1X,w:portalSize,col:P1_COLOR,forP1:1,forP2:0,vx:moveSpeed,unified:0,troll:isTroll,trollActive:0},
          {x:p2X,w:portalSize,col:P2_COLOR,forP1:0,forP2:1,vx:moveSpeed,unified:0,troll:isTroll,trollActive:0}
        ],
        id:nextId,
        p1hit:0,
        p2hit:0
      });
    }
  }
  nextId++;
}

function upd(p,playerNum){
  if(!p||!p.alive)return;

  p.x+=p.vx;
  p.y+=p.vy;
  if(p.x<10)p.x=10;
  if(p.x>W-10)p.x=W-10;
  if(p.y<60)p.y=60;
  if(p.y>H-40)p.y=H-40;

  for(let w of walls){
    const alreadyHit=playerNum===1?w.p1hit:w.p2hit;

    if(Math.abs(w.y-p.y)<25&&!alreadyHit){
      let hitCorrectPortal=0;

      for(let pt of w.portals){
        if(p.x>pt.x&&p.x<pt.x+pt.w){
          if((playerNum===1&&pt.forP1)||(playerNum===2&&pt.forP2)){
            hitCorrectPortal=1;
          }
          break;
        }
      }

      if(hitCorrectPortal){
        if(playerNum===1)w.p1hit=1;
        else w.p2hit=1;

        if(p.path.indexOf(w.id)===-1){
          p.path.push(w.id);
          p.sc+=100;
          tone(700,100);
        }
      }else{
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
    const sortedPortals=[...w.portals].sort((a,b)=>a.x-b.x);

    // Check if full-width portal (joke mode)
    const isFullWidth=sortedPortals[0].w>=MAX_PORTAL;

    if(isFullWidth){
      // Just draw the full-width portal stripe
      g.fillStyle(sortedPortals[0].col);
      g.fillRect(60,w.y-WALL_THICK/2,W-120,WALL_THICK);
    }else{
      // Normal portal rendering
      // Draw wall before first portal
      if(sortedPortals[0].x>0){
        g.fillStyle(wallCol);
        g.fillRect(0,w.y-WALL_THICK/2,sortedPortals[0].x,WALL_THICK);
      }

      // Draw portals and wall segments between them
      for(let i=0;i<sortedPortals.length;i++){
        const portal=sortedPortals[i];

        // Draw portal as colored stripe (same thickness as wall)
        g.fillStyle(portal.col);
        g.fillRect(portal.x,w.y-WALL_THICK/2,portal.w,WALL_THICK);

        // Movement indicator (arrow)
        if(portal.vx){
          g.fillStyle(0xffffff,0.7);
          const arrowSize=5;
          const cx=portal.x+portal.w/2;
          const cy=w.y;
          if(portal.vx>0){
            // Right arrow
            g.fillTriangle(cx+10,cy,cx+10+arrowSize,cy+arrowSize,cx+10+arrowSize,cy-arrowSize);
          }else{
            // Left arrow
            g.fillTriangle(cx-10,cy,cx-10-arrowSize,cy+arrowSize,cx-10-arrowSize,cy-arrowSize);
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
  }

  // Player 1 (simple stick)
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
    txts.help.setVisible(1);
  }else{
    txts.p1sc.setVisible(1);
    txts.p2sc.setVisible(1);
    txts.help.setVisible(1);
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
    txts.p1end.setVisible(1).setText(`Score: ${p1.sc} pts | Time: ${t.toFixed(1)}s`);
  }else{
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
