// ------------ BootScene: textures ------------
class BootScene extends Phaser.Scene {
  constructor(){ super('boot'); }
  create(){
    const g = this.add.graphics();
    // road (plain dark asphalt)
    g.fillStyle(0x2b2b2b,1).fillRect(0,0,256,256);
    g.generateTexture('road',256,256); g.clear();
    // player bike (green)
    g.fillStyle(0x4caf50,1).fillRoundedRect(0,0,18,36,6);
    g.fillStyle(0x1b5e20,1).fillRect(4,2,10,6);
    g.generateTexture('bike_player',18,36); g.clear();
    // rival bike (red)
    g.fillStyle(0xef5350,1).fillRoundedRect(0,0,18,36,6);
    g.fillStyle(0x7f0000,1).fillRect(4,2,10,6);
    g.generateTexture('bike_rival',18,36); g.clear();
    // coin
    g.fillStyle(0xffd54f,1).fillCircle(8,8,8);
    g.lineStyle(2,0xffb300,1).strokeCircle(8,8,8);
    g.generateTexture('coin',16,16); g.clear();
    // cone obstacle (red)
    g.fillStyle(0xff0000,1);
    g.fillTriangle(10,0, 0,18, 20,18);
    g.generateTexture('cone',20,18); g.clear();
    // oil slick
    g.fillStyle(0x101010,1).fillEllipse(36,18,72,28);
    g.generateTexture('oil',72,36); g.clear();
    // spark
    g.fillStyle(0xffeb3b,1).fillCircle(6,6,6);
    g.generateTexture('spark',12,12); g.destroy();
    this.scene.start('title');
  }
}

// ---------------- TitleScene ----------------
class TitleScene extends Phaser.Scene{
  constructor(){ super('title'); }
  create(){
    this.add.tileSprite(180,320,360,640,'road').setAlpha(0.5);
    this.add.text(180,260,'ROAD CRASH MVP',{fontFamily:'monospace',fontSize:'32px',color:'#fff'}).setOrigin(0.5);
    const startText = this.add.text(180,320,'Press SPACE to start',{fontFamily:'monospace',fontSize:'16px',color:'#ffeb3b'}).setOrigin(0.5);
    this.tweens.add({
      targets: startText,
      alpha: { from: 1, to: 0 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });
    this.input.keyboard.once('keydown-SPACE', ()=> this.scene.start('game'));
  }
}

// ---------------- GameScene ----------------
class GameScene extends Phaser.Scene {
  constructor(){ super('game'); }
  init(){
    this.state={speed:0,maxSpeed:600,accel:400,brake:600,friction:300,steer:280,health:100,dist:0,coins:0,
                spawnRival:0,spawnCoin:0,spawnObs:0};
  }
  create(){
    const w=360,h=640;
    this.road=this.add.tileSprite(w/2,h/2,w,h,'road');
    this.physics.world.setBounds(40,0,w-80,h);
    // player
    this.player=this.physics.add.sprite(w/2,h*0.8,'bike_player').setDepth(5).setCollideWorldBounds(true);
    this.player.body.setSize(14,30).setOffset(2,3);
    // groups
    this.rivals=this.physics.add.group({maxSize:24});
    this.obstacles=this.physics.add.group({maxSize:16});
    this.coins=this.physics.add.group({maxSize:20});
    // input
    this.cursors=this.input.keyboard.createCursorKeys();
    // colliders
    this.physics.add.collider(this.player,this.rivals,()=>this.damagePlayer(6));
    this.physics.add.overlap(this.player,this.coins,(p,c)=>{c.disableBody(true,true);this.state.coins++;});
    this.physics.add.collider(this.player,this.obstacles,(p,o)=>{
      if(o.kind==='oil'){this.applyOilSlip();o.disableBody(true,true);this.damagePlayer(10);}
      else{this.gameOver();}
    });
    // HUD
    this.hud=this.add.text(10,10,'',{fontFamily:'monospace',fontSize:'14px',color:'#fff'}).setDepth(20);
    this.healthBg=this.add.rectangle(w-154,18,140,10,0x333333).setOrigin(0,0.5).setDepth(20);
    this.healthBar=this.add.rectangle(w-154,18,140,10,0x4caf50).setOrigin(0,0.5).setDepth(20);
    // Controls hint
    const instr = this.add.text(180,600,'←/→ arrows to dodge cones & collect coins',{fontFamily:'monospace',fontSize:'14px',color:'#ffeb3b'}).setOrigin(0.5);
    this.tweens.add({ targets: instr, alpha: { from: 1, to: 0 }, duration: 800, delay: 5000 });
  }
  spawnRival(){
    if(this.rivals.countActive(true)>=12)return;
    const r=this.rivals.get(Phaser.Math.Between(70,290),-40,'bike_rival');
    if(!r)return; r.setActive(true).setVisible(true); r.body.setSize(14,30).setOffset(2,3);
    r.setVelocity(0,Phaser.Math.Between(20,80));
  }
  spawnCoin(){
    if(this.coins.countActive(true)>=12)return;
    const c=this.coins.get(Phaser.Math.Between(70,290),-20,'coin');
    if(!c)return; c.setActive(true).setVisible(true); c.body.setCircle(8,0,0); c.setVelocityY(Phaser.Math.Between(80,140));
  }
  spawnObstacle(){
    if(this.obstacles.countActive(true)>=10)return;
    const kind=Math.random()<0.85?'cone':'oil'; // mostly cones
    const key=kind==='cone'?'cone':'oil';
    const o=this.obstacles.get(Phaser.Math.Between(70,290),-30,key);
    if(!o)return; o.setActive(true).setVisible(true); o.kind=kind;
    if(kind==='cone'){o.body.setSize(16,14).setOffset(2,2);o.setVelocityY(Phaser.Math.Between(120,200));}
    else{o.body.setSize(66,26).setOffset(3,5);o.setVelocityY(Phaser.Math.Between(100,160));}
  }
  update(_,dtMs){
    const dt=dtMs/1000;const s=this.state;if(!dt)return;
    // speed
    if(this.cursors.up.isDown)s.speed=Math.min(s.maxSpeed,s.speed+s.accel*dt);
    else if(this.cursors.down.isDown)s.speed=Math.max(0,s.speed-s.brake*dt);
    else s.speed=Math.max(0,s.speed-s.friction*dt);
    // steering
    let vx=0;if(this.cursors.left.isDown)vx-=s.steer;if(this.cursors.right.isDown)vx+=s.steer;
    this.player.setVelocityX(vx);this.player.setAngle(Phaser.Math.Clamp(vx/4,-15,15));
    // road scroll
    this.road.tilePositionY+=s.speed*dt*0.4;if(vx!==0)this.road.tilePositionX+=vx*0.02;
    s.dist+=s.speed*dt*0.02;
    // spawn timers
    s.spawnRival-=dt;s.spawnCoin-=dt;s.spawnObs-=dt;
    if(s.spawnRival<=0){this.spawnRival();s.spawnRival=Phaser.Math.FloatBetween(0.6,1.2);}
    if(s.spawnCoin<=0){this.spawnCoin();s.spawnCoin=Phaser.Math.FloatBetween(1.8,2.6);}
    if(s.spawnObs<=0){this.spawnObstacle();s.spawnObs=Phaser.Math.FloatBetween(0.8,1.3);}
    // cleanup
    this.rivals.children.iterate(r=>{if(r?.active&&r.y>700)r.disableBody(true,true);});
    this.obstacles.children.iterate(o=>{if(o?.active&&o.y>700)o.disableBody(true,true);});
    this.coins.children.iterate(c=>{if(c?.active&&c.y>700)c.disableBody(true,true);});
    // HUD
    this.hud.setText(`SPEED\n${Math.round(s.speed*0.12)} MPH\n\nCOINS ${s.coins}\nDIST ${Math.round(s.dist)} mi`);
    this.healthBar.width=Phaser.Math.Clamp(s.health,0,100)*1.4;
    this.healthBar.fillColor=(s.health>50)?0x4caf50:(s.health>25?0xffc107:0xf44336);
    if(s.health<=0)this.gameOver();
  }
  damagePlayer(n){this.state.health-=n;}
  applyOilSlip(){const slip=(Math.random()<0.5?-1:1)*Phaser.Math.Between(140,220);this.player.setVelocityX(slip);}
  gameOver(){this.scene.start('gameover',{dist:Math.round(this.state.dist),coins:this.state.coins});}
}

// ---------------- GameOverScene ----------------
class GameOverScene extends Phaser.Scene{
  constructor(){super('gameover');}
  init(d){this.d=d;}
  create(){
    this.add.rectangle(180,320,360,640,0x111111,1);
    this.add.text(180,260,'GAME OVER',{fontFamily:'monospace',fontSize:'28px',color:'#fff'}).setOrigin(0.5);
    this.add.text(180,320,`Distance: ${this.d.dist} mi\nCoins: ${this.d.coins}`,
      {fontFamily:'monospace',fontSize:'16px',color:'#ccc',align:'center'}).setOrigin(0.5);
    const retryText = this.add.text(180,380,'Press ENTER to retry',{fontFamily:'monospace',fontSize:'14px',color:'#ffeb3b'}).setOrigin(0.5);
    this.tweens.add({
      targets: retryText,
      alpha: { from: 1, to: 0 },
      duration: 600,
      yoyo: true,
      repeat: -1
    });
    this.input.keyboard.once('keydown-ENTER',()=>this.scene.start('game'));
    this.input.once('pointerdown',()=>this.scene.start('game'));
  }
}

// ---------------- Config ----------------
const config={type:Phaser.WEBGL,width:360,height:640,backgroundColor:'#111',
  render:{pixelArt:true,antialias:false,roundPixels:true},
  physics:{default:'arcade',arcade:{gravity:{y:0},debug:false}},
  scene:[BootScene,TitleScene,GameScene,GameOverScene]};
new Phaser.Game(config);