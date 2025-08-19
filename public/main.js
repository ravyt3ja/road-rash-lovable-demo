/**
 * RashRoad - Motorcycle Combat Racing Game (Performance Optimized)
 * A high-speed endless road game with melee combat mechanics
 */

// Boot Scene for texture generation and caching
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // Generate all graphics once and cache as textures
        this.generateTextures();
        
        // Move to title scene
        this.scene.start('TitleScene');
    }

    generateTextures() {
        // Road texture
        const roadGraphics = this.add.graphics();
        roadGraphics.fillStyle(0x2a2a2a);
        roadGraphics.fillRect(0, 0, 256, 256);
        roadGraphics.generateTexture('road', 256, 256);
        roadGraphics.destroy();

        // Bike texture
        const bikeGraphics = this.add.graphics();
        bikeGraphics.fillStyle(0x8a2be2);
        bikeGraphics.fillRect(0, 0, 30, 50);
        bikeGraphics.generateTexture('bike_player', 30, 50);
        bikeGraphics.destroy();

        // Rival bike texture
        const rivalGraphics = this.add.graphics();
        rivalGraphics.fillStyle(0xff4444);
        rivalGraphics.fillRect(0, 0, 25, 45);
        rivalGraphics.generateTexture('bike_rival', 25, 45);
        rivalGraphics.destroy();

        // Cone texture
        const coneGraphics = this.add.graphics();
        coneGraphics.fillStyle(0xff8c00);
        coneGraphics.fillTriangle(9, 0, 0, 18, 18, 18);
        coneGraphics.generateTexture('cone', 18, 18);
        coneGraphics.destroy();

        // Barricade texture
        const barricadeGraphics = this.add.graphics();
        barricadeGraphics.fillStyle(0xff4444);
        barricadeGraphics.fillRect(0, 0, 80, 16);
        barricadeGraphics.generateTexture('barricade', 80, 16);
        barricadeGraphics.destroy();

        // Oil texture
        const oilGraphics = this.add.graphics();
        oilGraphics.fillStyle(0x1a1a1a);
        oilGraphics.fillEllipse(18, 9, 36, 18);
        oilGraphics.generateTexture('oil', 36, 18);
        oilGraphics.destroy();
    }
}

class TitleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TitleScene' });
        this.spacePressed = false;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
        
        // Title
        this.add.text(width / 2, height / 2 - 100, 'RASHROAD', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            fill: '#8a2be2',
            stroke: '#fff',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(width / 2, height / 2 - 50, 'MOTORCYCLE COMBAT RACING', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fill: '#00bfff'
        }).setOrigin(0.5);
        
        // Controls
        const controls = [
            'CONTROLS:',
            'UP/DOWN - Accelerate/Brake',
            'LEFT/RIGHT - Steer',
            'Z - Punch | X - Kick',
            '',
            'Avoid cones and barricades!',
            'Oil makes you slip!'
        ];
        
        controls.forEach((text, index) => {
            this.add.text(width / 2, height / 2 + 20 + (index * 25), text, {
                fontSize: '16px',
                fontFamily: 'Arial',
                fill: index === 0 ? '#ffff00' : '#ffffff',
                fontStyle: index === 0 ? 'bold' : 'normal'
            }).setOrigin(0.5);
        });
        
        // Start prompt
        const startText = this.add.text(width / 2, height - 50, 'Press SPACE to Start', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fill: '#00ff00'
        }).setOrigin(0.5);
        
        // Blinking effect
        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
        
        // Input - use keydown event to prevent repeated triggers
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.spacePressed) {
                console.log('SPACE pressed, starting GameScene...');
                this.spacePressed = true;
                this.scene.start('GameScene');
            }
        });
    }
}

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
        this.initializeGameState();
    }

    initializeGameState() {
        // Game state
        this.player = null;
        this.gameSpeed = 2;
        this.playerSpeed = 0;
        this.maxSpeed = 12;
        this.acceleration = 0.3;
        this.friction = 0.1;
        this.distance = 0;
        this.health = 100;
        this.isGameOver = false;
        
        // Controls
        this.cursors = null;
        this.punchKey = null;
        this.kickKey = null;
        
        // HUD
        this.hudElements = {};
        
        // Lane settings
        this.lanes = [200, 300, 400, 500]; // X positions for 4 lanes
        this.playerLane = 1; // Start in lane 1 (300px)
        
        // Combat
        this.isAttacking = false;
        this.attackCooldown = 0;
        
        // Lane changing
        this.isChangingLane = false;
        this.laneChangeCooldown = 0;
        this.leftPressed = false;
        this.rightPressed = false;
        
        // Spawn timers
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 120;
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnRate = 150;
        
        // Oil slip effect
        this.isSlipping = false;
        this.slipTimer = 0;
        this.slipDuration = 48;
        
        // Road sway
        this.roadSway = 0;
        this.maxRoadSway = 50;
        this.roadTileSprite = null;

        // Cached arrays for optimization
        this.activeRivals = [];
        this.activeObstacles = [];
    }

    create() {
        console.log('GameScene create() called');
        this.createWorld();
        this.createPlayer();
        console.log('Player created at:', this.player.x, this.player.y);
        this.createControls();
        this.createHUD();
        this.createPools();
        this.setupCollisions();
        this.startGameLoop();
        console.log('GameScene setup complete');
    }

    createWorld() {
        const { width, height } = this.cameras.main;
        
        // Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);
        
        // Road base as tileSprite for sway effect
        this.roadTileSprite = this.add.tileSprite(350, height/2, 400, height, 'road');
        
        // Road lines (lane markers)
        this.roadLines = this.add.group();
        for (let i = 0; i < 10; i++) {
            for (let lane = 1; lane < 4; lane++) {
                const line = this.add.rectangle(
                    150 + (lane * 100), 
                    i * 80, 
                    4, 40, 
                    0xffff00
                );
                this.roadLines.add(line);
            }
        }
        
        // Road edges
        this.leftEdge = this.add.graphics();
        this.leftEdge.fillStyle(0xffffff);
        this.leftEdge.fillRect(145, 0, 10, height);
        
        this.rightEdge = this.add.graphics();
        this.rightEdge.fillStyle(0xffffff);
        this.rightEdge.fillRect(545, 0, 10, height);
        
        this.createSideDecorations();
    }

    createSideDecorations() {
        const { width, height } = this.cameras.main;
        
        // Left side buildings
        for (let i = 0; i < 5; i++) {
            const building = this.add.rectangle(75, i * 150, 100, 120, 0x333333);
            building.setStrokeStyle(2, 0x666666);
            
            // Windows
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 2; k++) {
                    this.add.rectangle(
                        building.x - 30 + (k * 30),
                        building.y - 40 + (j * 25),
                        8, 12,
                        Math.random() > 0.7 ? 0xffff00 : 0x111111
                    );
                }
            }
        }
        
        // Right side buildings
        for (let i = 0; i < 5; i++) {
            const building = this.add.rectangle(width - 75, i * 150, 100, 120, 0x333333);
            building.setStrokeStyle(2, 0x666666);
            
            // Windows
            for (let j = 0; j < 3; j++) {
                for (let k = 0; k < 2; k++) {
                    this.add.rectangle(
                        building.x - 30 + (k * 30),
                        building.y - 40 + (j * 25),
                        8, 12,
                        Math.random() > 0.7 ? 0xffff00 : 0x111111
                    );
                }
            }
        }
    }

    createPlayer() {
        const { height } = this.cameras.main;
        console.log('Creating player at lane:', this.playerLane, 'position:', this.lanes[this.playerLane]);
        
        // Player using cached texture
        this.player = this.physics.add.sprite(this.lanes[this.playerLane], height - 80, 'bike_player');
        this.player.setImmovable(true);
        this.player.body.setSize(30, 50);
        this.player.setDepth(10); // Ensure player is above background
        
        console.log('Player sprite created:', this.player);
        console.log('Player texture:', this.player.texture.key);
        console.log('Player visible:', this.player.visible);
        
        // Additional visual elements
        this.playerRider = this.add.circle(this.lanes[this.playerLane], height - 85, 12, 0xff6b6b);
        this.playerRider.setDepth(11);
        this.playerWheels = [
            this.add.circle(this.lanes[this.playerLane], height - 100, 8, 0x333333),
            this.add.circle(this.lanes[this.playerLane], height - 60, 8, 0x333333)
        ];
        this.playerWheels.forEach(wheel => wheel.setDepth(9));
        
        // Attack range indicator
        this.attackRange = this.add.graphics();
        this.attackRange.setVisible(false);
    }

    createControls() {
        // Create cursor keys once in create()
        this.cursors = this.input.keyboard.createCursorKeys();
        this.punchKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.kickKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        
        // Use keydown events for lane changing
        this.input.keyboard.on('keydown-LEFT', () => {
            if (!this.leftPressed && !this.isGameOver) {
                this.leftPressed = true;
                this.handleLaneChange(-1);
            }
        });
        
        this.input.keyboard.on('keyup-LEFT', () => {
            this.leftPressed = false;
        });
        
        this.input.keyboard.on('keydown-RIGHT', () => {
            if (!this.rightPressed && !this.isGameOver) {
                this.rightPressed = true;
                this.handleLaneChange(1);
            }
        });
        
        this.input.keyboard.on('keyup-RIGHT', () => {
            this.rightPressed = false;
        });
    }

    handleLaneChange(direction) {
        if (this.isChangingLane || this.laneChangeCooldown > 0) return;
        
        const newLane = this.playerLane + direction;
        if (newLane >= 0 && newLane < 4) {
            this.changeLane(direction);
        }
    }

    changeLane(direction) {
        this.isChangingLane = true;
        this.playerLane += direction;
        this.laneChangeCooldown = 20;
        
        const targetX = this.lanes[this.playerLane];
        
        // Instant lane change for performance
        this.player.x = targetX;
        this.playerRider.x = targetX;
        this.playerWheels.forEach(wheel => wheel.x = targetX);
        
        this.isChangingLane = false;
    }

    createHUD() {
        const { width } = this.cameras.main;
        
        // HUD background
        const hudBg = this.add.graphics();
        hudBg.fillStyle(0x000000, 0.7);
        hudBg.fillRect(0, 0, width, 80);
        hudBg.setScrollFactor(0);
        
        // Speed
        this.hudElements.speedLabel = this.add.text(20, 20, 'SPEED', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffff00'
        }).setScrollFactor(0);
        
        this.hudElements.speedValue = this.add.text(20, 40, '0 MPH', {
            fontSize: '20px',
            fontFamily: 'Arial Bold',
            fill: '#00ff00'
        }).setScrollFactor(0);
        
        // Health
        this.hudElements.healthLabel = this.add.text(150, 20, 'HEALTH', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffff00'
        }).setScrollFactor(0);
        
        this.hudElements.healthBar = this.add.graphics().setScrollFactor(0);
        this.updateHealthBar();
        
        // Distance
        this.hudElements.distanceLabel = this.add.text(width - 150, 20, 'DISTANCE', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fill: '#ffff00'
        }).setScrollFactor(0);
        
        this.hudElements.distanceValue = this.add.text(width - 150, 40, '0 km', {
            fontSize: '20px',
            fontFamily: 'Arial Bold',
            fill: '#00bfff'
        }).setScrollFactor(0);
    }

    updateHealthBar() {
        this.hudElements.healthBar.clear();
        
        // Background
        this.hudElements.healthBar.fillStyle(0x660000);
        this.hudElements.healthBar.fillRect(150, 40, 100, 15);
        
        // Health bar
        const healthWidth = (this.health / 100) * 100;
        const healthColor = this.health > 60 ? 0x00ff00 : this.health > 30 ? 0xffff00 : 0xff0000;
        this.hudElements.healthBar.fillStyle(healthColor);
        this.hudElements.healthBar.fillRect(150, 40, healthWidth, 15);
        
        // Border
        this.hudElements.healthBar.lineStyle(2, 0xffffff);
        this.hudElements.healthBar.strokeRect(150, 40, 100, 15);
    }

    createPools() {
        // Object pooling for rivals
        this.rivals = this.physics.add.group({ 
            defaultKey: 'bike_rival', 
            maxSize: 12, 
            runChildUpdate: false 
        });
        
        // Object pooling for obstacles  
        this.obstacles = this.physics.add.group({ 
            maxSize: 10, 
            runChildUpdate: false 
        });
    }

    setupCollisions() {
        // Single collider registration for performance
        this.physics.add.overlap(this.player, this.rivals, this.handleRivalCollision, null, this);
        this.physics.add.overlap(this.player, this.obstacles, this.handleObstacleCollision, null, this);
    }

    spawnEnemy() {
        // Lazy spawn - cap concurrent entities
        if (this.rivals.countActive(true) >= 6) return;
        
        const enemy = this.rivals.get();
        if (!enemy) return;
        
        const lane = Phaser.Math.Between(0, 3);
        const x = this.lanes[lane];
        const y = -50;
        
        enemy.enableBody(true, x, y, true, true);
        enemy.setSize(25, 45);
        enemy.body.setVelocityY(this.gameSpeed * 60);
        
        // Set data
        enemy.setData('health', 50);
        enemy.setData('speed', Phaser.Math.Between(3, 6));
        enemy.setData('lane', lane);
    }

    spawnObstacle() {
        // Lazy spawn - cap concurrent entities
        if (this.obstacles.countActive(true) >= 6) return;
        
        const obstacle = this.obstacles.get();
        if (!obstacle) return;
        
        // Choose random type
        const types = ['cone', 'barricade', 'oil'];
        const type = types[Phaser.Math.Between(0, 2)];
        
        // Choose lane, avoiding player's current lane
        let lane;
        do {
            lane = Phaser.Math.Between(0, 3);
        } while (lane === this.playerLane && Math.random() < 0.7);
        
        const x = this.lanes[lane];
        const y = -50;
        
        obstacle.enableBody(true, x, y, true, true);
        obstacle.setTexture(type);
        obstacle.setData('type', type);
        obstacle.body.setVelocityY(this.gameSpeed * 60);
        
        // Set proper hitbox based on type
        switch (type) {
            case 'cone':
                obstacle.setSize(18, 18);
                break;
            case 'barricade':
                obstacle.setSize(80, 16);
                break;
            case 'oil':
                obstacle.setSize(36, 18);
                break;
        }
    }

    handleRivalCollision(player, rival) {
        this.playerHit(15);
        rival.disableBody(true, true); // Pool instead of destroy
    }

    handleObstacleCollision(player, obstacle) {
        const type = obstacle.getData('type');
        
        switch (type) {
            case 'cone':
            case 'barricade':
                this.gameOver();
                break;
            case 'oil':
                this.applyOilSlip();
                this.playerHit(10);
                obstacle.disableBody(true, true);
                break;
        }
    }

    applyOilSlip() {
        this.isSlipping = true;
        this.slipTimer = this.slipDuration;
        
        this.cameras.main.flash(100, 100, 100, 100);
    }

    playerHit(damage = 20) {
        this.health = Math.max(0, this.health - damage);
        this.cameras.main.flash(200, 255, 0, 0);
        
        if (this.health <= 0) {
            this.gameOver();
        }
    }

    updateMovement() {
        if (this.isGameOver) return;
        
        // Handle acceleration/deceleration
        if (this.cursors.up.isDown) {
            this.playerSpeed = Math.min(this.maxSpeed, this.playerSpeed + this.acceleration);
        } else if (this.cursors.down.isDown) {
            this.playerSpeed = Math.max(0, this.playerSpeed - this.acceleration * 2);
        } else {
            this.playerSpeed = Math.max(0, this.playerSpeed - this.friction);
        }
        
        // Update game speed based on player speed
        this.gameSpeed = 2 + (this.playerSpeed * 0.5);
        
        // Update road sway only when turning
        if (this.leftPressed || this.rightPressed) {
            const swayAmount = this.leftPressed ? -3 : 3;
            this.roadSway = Phaser.Math.Clamp(this.roadSway + swayAmount, -this.maxRoadSway, this.maxRoadSway);
            this.roadTileSprite.tilePositionX = this.roadSway;
        } else {
            // Gradually return to center
            this.roadSway *= 0.95;
            this.roadTileSprite.tilePositionX = this.roadSway;
        }
        
        // Update distance
        this.distance += this.gameSpeed * 0.01;
    }

    updateEntities() {
        // Cache active entities for performance
        this.activeRivals = this.rivals.getChildren().filter(rival => rival.active);
        this.activeObstacles = this.obstacles.getChildren().filter(obstacle => obstacle.active);
        
        // Use for loops instead of callbacks for better performance
        for (let i = this.activeRivals.length - 1; i >= 0; i--) {
            const rival = this.activeRivals[i];
            
            // Cull off-screen updates
            if (rival.y > 700 || rival.y < -80) {
                rival.disableBody(true, true);
                continue;
            }
            
            rival.y += this.gameSpeed * 2;
        }
        
        for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
            const obstacle = this.activeObstacles[i];
            
            // Cull off-screen updates  
            if (obstacle.y > 700 || obstacle.y < -80) {
                obstacle.disableBody(true, true);
                continue;
            }
            
            obstacle.y += this.gameSpeed * 2;
        }
        
        // Update road lines
        this.roadLines.children.entries.forEach(line => {
            line.y += this.gameSpeed * 2;
            if (line.y > 700) {
                line.y -= 800;
            }
        });
    }

    updateCooldowns() {
        if (this.laneChangeCooldown > 0) {
            this.laneChangeCooldown--;
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        if (this.isSlipping && this.slipTimer > 0) {
            this.slipTimer--;
            if (this.slipTimer <= 0) {
                this.isSlipping = false;
            }
        }
    }

    updateSpawning() {
        // Enemy spawning
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer >= this.enemySpawnRate) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
            this.enemySpawnRate = Math.max(60, this.enemySpawnRate - 0.5);
        }
        
        // Obstacle spawning
        this.obstacleSpawnTimer++;
        const adjustedSpawnRate = Math.max(90, this.obstacleSpawnRate - (this.distance * 0.5));
        
        if (this.obstacleSpawnTimer >= adjustedSpawnRate) {
            this.obstacleSpawnTimer = 0;
            
            const numObstacles = Phaser.Math.Between(0, 2);
            for (let i = 0; i < numObstacles; i++) {
                this.spawnObstacle();
            }
        }
    }

    updateHUD() {
        // Update speed display
        const speedMPH = Math.round(this.playerSpeed * 10);
        this.hudElements.speedValue.setText(`${speedMPH} MPH`);
        
        // Update distance
        this.hudElements.distanceValue.setText(`${Math.round(this.distance)} km`);
        
        // Update health bar
        this.updateHealthBar();
    }

    update() {
        if (this.isGameOver) return;
        
        this.updateMovement();
        this.updateEntities();
        this.updateCooldowns();
        this.updateSpawning();
        this.updateHUD();
    }

    startGameLoop() {
        // Game is now running
    }

    gameOver() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        this.physics.pause();
        
        // Save best distance
        const bestDistance = localStorage.getItem('rashroad-best') || 0;
        if (this.distance > bestDistance) {
            localStorage.setItem('rashroad-best', Math.round(this.distance));
        }
        
        // Show game over screen after delay
        this.time.delayedCall(300, () => {
            this.scene.start('GameOverScene', { 
                distance: Math.round(this.distance),
                bestDistance: Math.max(bestDistance, Math.round(this.distance))
            });
        });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalDistance = data.distance || 0;
        this.bestDistance = data.bestDistance || 0;
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        
        // Game Over title
        this.add.text(width / 2, height / 2 - 100, 'GAME OVER', {
            fontSize: '48px',
            fontFamily: 'Arial Black',
            fill: '#ff0000'
        }).setOrigin(0.5);
        
        // Distance
        this.add.text(width / 2, height / 2 - 30, `Distance: ${this.finalDistance} km`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Best distance
        this.add.text(width / 2, height / 2 + 10, `Best: ${this.bestDistance} km`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            fill: '#ffff00'
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(width / 2, height / 2 + 60, 'Press R to Restart or SPACE for Title', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fill: '#00ff00'
        }).setOrigin(0.5);
        
        // Input
        this.input.keyboard.on('keydown-R', () => {
            this.scene.start('GameScene');
        });
        
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('TitleScene');
        });
    }
}

// Optimized Game Configuration
const config = {
    type: Phaser.WEBGL,               // Force WebGL for performance
    powerPreference: 'high-performance',
    width: 360,                       // Lower internal resolution
    height: 640,
    zoom: 1.3333,                     // Scale up visually to ~480×853
    parent: 'game-container',
    backgroundColor: '#111',
    render: { 
        pixelArt: true, 
        antialias: false, 
        roundPixels: true 
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            fps: 60,                  // Fixed stable step
            useTree: true,            // Spatial index for fewer collision checks
            debug: false
        }
    },
    fps: { 
        target: 60, 
        min: 30, 
        forceSetTimeOut: false 
    },
    scene: [BootScene, TitleScene, GameScene, GameOverScene]
};

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting game...');
    
    // Hide loading screen
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
    
    // Verify game container exists
    const container = document.getElementById('game-container');
    if (!container) {
        console.error('Game container not found!');
        return;
    }
    
    console.log('Starting Phaser game...');
    // Start the game
    const game = new Phaser.Game(config);
    
    console.log('Game created:', game);
});