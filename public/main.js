/**
 * RashRoad - Motorcycle Combat Racing Game
 * A high-speed endless road game with melee combat mechanics
 */

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
        this.enemies = [];
        this.obstacles = null;
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
        
        // Lane changing - use keydown events to prevent continuous triggering
        this.isChangingLane = false;
        this.laneChangeCooldown = 0;
        this.leftPressed = false;
        this.rightPressed = false;
        
        // Enemy spawn
        this.enemySpawnTimer = 0;
        this.enemySpawnRate = 120; // frames between spawns
        
        // Obstacles
        this.obstacleSpawnTimer = 0;
        this.obstacleSpawnRate = 150; // frames between spawns
        
        // Oil slip effect
        this.isSlipping = false;
        this.slipTimer = 0;
        this.slipDuration = 48; // 0.8s at 60fps
        
        // Road sway
        this.roadSway = 0;
        this.maxRoadSway = 50;
    }

    create() {
        console.log('GameScene created');
        this.createWorld();
        this.createPlayer();
        this.createControls();
        this.createHUD();
        this.createEnemyPool();
        this.createObstaclePool();
        
        // Start game loop
        this.startGameLoop();
    }

    createWorld() {
        const { width, height } = this.cameras.main;
        
        // Background gradient
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bg.fillRect(0, 0, width, height);
        
        // Road base - make it a tilesprite for sway effect
        this.road = this.add.graphics();
        this.road.fillStyle(0x2a2a2a);
        this.road.fillRect(150, 0, 400, height);
        
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
        
        // Side decorations
        this.createSideDecorations();
    }

    createSideDecorations() {
        const { width, height } = this.cameras.main;
        
        // Left side buildings
        for (let i = 0; i < 5; i++) {
            const building = this.add.rectangle(
                75, 
                i * 150, 
                100, 
                120, 
                0x333333
            );
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
            const building = this.add.rectangle(
                width - 75, 
                i * 150, 
                100, 
                120, 
                0x333333
            );
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
        
        // Player bike body
        this.player = this.add.group();
        
        // Main body
        const body = this.add.rectangle(this.lanes[this.playerLane], height - 80, 30, 50, 0x8a2be2);
        
        // Wheels
        const frontWheel = this.add.circle(this.lanes[this.playerLane], height - 100, 8, 0x333333);
        const rearWheel = this.add.circle(this.lanes[this.playerLane], height - 60, 8, 0x333333);
        
        // Rider
        const rider = this.add.circle(this.lanes[this.playerLane], height - 85, 12, 0xff6b6b);
        
        // Handlebars
        const handlebars = this.add.rectangle(this.lanes[this.playerLane], height - 95, 20, 3, 0xcccccc);
        
        this.player.addMultiple([body, frontWheel, rearWheel, rider, handlebars]);
        
        // Store references
        this.playerBody = body;
        this.playerRider = rider;
        this.playerHandlebars = handlebars;
        this.playerWheels = [frontWheel, rearWheel];
        
        // Physics
        this.physics.add.existing(body);
        body.body.setImmovable(true);
        body.body.setSize(30, 50);
        
        // Attack range indicator (invisible by default)
        this.attackRange = this.add.graphics();
        this.attackRange.setVisible(false);
    }

    createControls() {
        // Create cursor keys once in create()
        this.cursors = this.input.keyboard.createCursorKeys();
        this.punchKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.kickKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
        
        // Use keydown events for lane changing to prevent continuous triggering
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
        console.log('handleLaneChange called with direction:', direction);
        if (this.isChangingLane || this.laneChangeCooldown > 0) {
            console.log('Lane change blocked - isChangingLane:', this.isChangingLane, 'cooldown:', this.laneChangeCooldown);
            return;
        }
        
        const newLane = this.playerLane + direction;
        if (newLane >= 0 && newLane < 4) {
            console.log('Valid lane change to:', newLane);
            this.changeLane(direction);
        } else {
            console.log('Invalid lane change attempted');
        }
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

    createEnemyPool() {
        this.enemyPool = this.physics.add.group({
            maxSize: 10,
            createCallback: (enemy) => {
                enemy.setData('health', 50);
                enemy.setData('speed', 0);
                enemy.setData('lane', 0);
                enemy.setData('aiState', 'normal');
                enemy.setData('aiTimer', 0);
            }
        });
    }

    createObstaclePool() {
        this.obstacles = this.physics.add.group({
            maxSize: 15,
            createCallback: (obstacle) => {
                obstacle.setData('type', 'cone');
            }
        });
    }

    spawnObstacle() {
        if (this.obstacles.countActive(true) >= 8) return;
        
        const obstacle = this.obstacles.get();
        if (!obstacle) return;
        
        // Choose random type
        const types = ['cone', 'barricade', 'oil'];
        const type = types[Phaser.Math.Between(0, 2)];
        
        // Choose lane, avoiding player's current lane
        let lane;
        do {
            lane = Phaser.Math.Between(0, 3);
        } while (lane === this.playerLane && Math.random() < 0.7); // 70% chance to avoid player lane
        
        const x = this.lanes[lane];
        const y = -50;
        
        obstacle.setActive(true);
        obstacle.setVisible(true);
        obstacle.setPosition(x, y);
        obstacle.setData('type', type);
        obstacle.body.setVelocityY(this.gameSpeed * 60);
        
        // Clear previous graphics
        obstacle.clear();
        
        // Draw based on type
        switch (type) {
            case 'cone':
                // Triangle cone
                obstacle.fillStyle(0xff8c00);
                obstacle.fillTriangle(0, -9, -9, 9, 9, 9);
                obstacle.setSize(18, 18);
                break;
                
            case 'barricade':
                // Horizontal block
                obstacle.fillStyle(0xff4444);
                obstacle.fillRect(-40, -8, 80, 16);
                obstacle.setSize(80, 16);
                break;
                
            case 'oil':
                // Dark oval
                obstacle.fillStyle(0x1a1a1a);
                obstacle.fillEllipse(0, 0, 36, 18);
                obstacle.setSize(36, 18);
                break;
        }
        
        // Set proper hitbox
        obstacle.body.setOffset(-obstacle.width/2, -obstacle.height/2);
    }

    spawnEnemy() {
        if (this.enemyPool.countActive(true) >= 6) return;
        
        const enemy = this.enemyPool.get();
        if (!enemy) return;
        
        const lane = Phaser.Math.Between(0, 3);
        const x = this.lanes[lane];
        const y = -50;
        
        // Configure enemy
        enemy.setActive(true);
        enemy.setVisible(true);
        enemy.setPosition(x, y);
        enemy.setSize(25, 45);
        enemy.body.setVelocityY(this.gameSpeed * 60);
        
        // Visual appearance
        enemy.clear();
        enemy.fillStyle(0xff4444);
        enemy.fillRect(-12.5, -22.5, 25, 45);
        
        // Rider
        enemy.fillStyle(0x444444);
        enemy.fillCircle(0, -10, 10);
        
        // Reset data
        enemy.setData('health', 50);
        enemy.setData('speed', Phaser.Math.Between(3, 6));
        enemy.setData('lane', lane);
        enemy.setData('aiState', 'normal');
        enemy.setData('aiTimer', 0);
        
        this.enemies.push(enemy);
    }

    startGameLoop() {
        // Main game timer
        this.time.addEvent({
            delay: 16, // ~60 FPS
            callback: this.updateGame,
            callbackScope: this,
            loop: true
        });
    }

    updateGame() {
        if (this.isGameOver) return; // Early return if game is over
        
        this.handleInput();
        this.updatePlayer();
        this.updateEnemies();
        this.updateObstacles();
        this.updateWorld();
        this.updateHUD();
        this.handleCollisions();
        this.spawnEnemiesTimer();
        this.spawnObstaclesTimer();
        
        // Update distance
        this.distance += this.gameSpeed * 0.1;
        
        // Increase game speed over time
        if (this.distance > 100 && this.gameSpeed < 8) {
            this.gameSpeed += 0.002;
        }
    }

    handleInput() {
        // Reduce cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        if (this.laneChangeCooldown > 0) {
            this.laneChangeCooldown--;
        }
        if (this.slipTimer > 0) {
            this.slipTimer--;
            if (this.slipTimer === 0) {
                this.isSlipping = false;
            }
        }
        
        // Speed control (use isDown for continuous input)
        if (this.cursors.up.isDown) {
            this.playerSpeed = Math.min(this.playerSpeed + this.acceleration, this.maxSpeed);
        } else if (this.cursors.down.isDown) {
            this.playerSpeed = Math.max(this.playerSpeed - this.acceleration * 2, -this.maxSpeed * 0.5);
        } else {
            // Apply friction
            if (this.playerSpeed > 0) {
                this.playerSpeed = Math.max(this.playerSpeed - this.friction, 0);
            } else if (this.playerSpeed < 0) {
                this.playerSpeed = Math.min(this.playerSpeed + this.friction, 0);
            }
        }
        
        // Combat (use isDown for combat keys)
        if ((this.punchKey.isDown || this.kickKey.isDown) && this.attackCooldown === 0) {
            this.performAttack(this.punchKey.isDown ? 'punch' : 'kick');
        }
    }

    changeLane(direction) {
        console.log('changeLane called with direction:', direction);
        
        const newLane = this.playerLane + direction;
        if (newLane >= 0 && newLane < 4) {
            console.log('Valid lane change to:', newLane);
            this.playerLane = newLane;
            this.isChangingLane = true;
            this.laneChangeCooldown = 30; // Increased cooldown
            const targetX = this.lanes[this.playerLane];
            
            // Move player components instantly
            this.playerBody.x = targetX;
            this.playerRider.x = targetX;
            this.playerHandlebars.x = targetX;
            this.playerWheels[0].x = targetX;
            this.playerWheels[1].x = targetX;
            
            // Apply road sway effect
            this.roadSway += direction * 10;
            this.roadSway = Phaser.Math.Clamp(this.roadSway, -this.maxRoadSway, this.maxRoadSway);
            
            // Reset lane changing state after a short delay
            this.time.delayedCall(200, () => {
                this.isChangingLane = false;
            });
            
            console.log('Lane change completed');
        }
    }

    performAttack(type) {
        this.isAttacking = true;
        this.attackCooldown = type === 'punch' ? 30 : 45; // frames
        
        // Visual feedback
        this.showAttackRange(type);
        
        // Check for enemies in range
        this.checkAttackHit(type);
        
        // Reset attack state
        this.time.delayedCall(300, () => {
            this.isAttacking = false;
        });
    }

    showAttackRange(type) {
        this.attackRange.clear();
        this.attackRange.setVisible(true);
        
        const playerX = this.lanes[this.playerLane];
        const playerY = this.cameras.main.height - 80;
        
        // Attack arc
        const range = type === 'punch' ? 40 : 60;
        const arc = type === 'punch' ? Math.PI / 3 : Math.PI / 2;
        
        this.attackRange.fillStyle(0xff0000, 0.3);
        this.attackRange.slice(playerX, playerY - 20, range, -arc/2, arc/2, false);
        this.attackRange.fillPath();
        
        // Hide after animation
        this.time.delayedCall(200, () => {
            this.attackRange.setVisible(false);
        });
    }

    checkAttackHit(type) {
        const playerX = this.lanes[this.playerLane];
        const playerY = this.cameras.main.height - 80;
        const range = type === 'punch' ? 40 : 60;
        const damage = type === 'punch' ? 25 : 40;
        
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            const distance = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
            
            if (distance <= range && enemy.y < playerY + 30 && enemy.y > playerY - 100) {
                this.hitEnemy(enemy, damage);
            }
        });
    }

    hitEnemy(enemy, damage) {
        const currentHealth = enemy.getData('health');
        const newHealth = currentHealth - damage;
        enemy.setData('health', newHealth);
        
        // Visual hit effect
        this.tweens.add({
            targets: enemy,
            scaleX: 1.2,
            scaleY: 1.2,
            duration: 100,
            yoyo: true
        });
        
        // Knockback
        enemy.body.setVelocityX(Phaser.Math.Between(-100, 100));
        
        if (newHealth <= 0) {
            this.knockOffEnemy(enemy);
        }
    }

    knockOffEnemy(enemy) {
        // Spin and slide effect
        this.tweens.add({
            targets: enemy,
            rotation: Math.PI * 4,
            x: enemy.x + Phaser.Math.Between(-200, 200),
            duration: 1000,
            ease: 'Power2'
        });
        
        this.tweens.add({
            targets: enemy,
            alpha: 0,
            duration: 1000,
            onComplete: () => {
                enemy.setActive(false);
                enemy.setVisible(false);
                const index = this.enemies.indexOf(enemy);
                if (index > -1) {
                    this.enemies.splice(index, 1);
                }
            }
        });
    }

    updatePlayer() {
        // Update physics based on player speed
        const speedMultiplier = 1 + (this.playerSpeed / this.maxSpeed);
        this.gameSpeed = Math.max(2, 2 * speedMultiplier);
        
        // Wheel rotation
        this.playerWheels.forEach(wheel => {
            wheel.rotation += this.playerSpeed * 0.1;
        });
        
        // Engine sound simulation (visual only)
        if (this.playerSpeed > 8) {
            this.cameras.main.shake(1, 1);
        }
        
        // Apply oil slip effect
        if (this.isSlipping) {
            const slipForce = Phaser.Math.Between(-30, 30);
            this.playerBody.x += slipForce * 0.1;
            
            // Keep player within road bounds
            this.playerBody.x = Phaser.Math.Clamp(this.playerBody.x, 180, 520);
            
            // Update other player components
            this.playerRider.x = this.playerBody.x;
            this.playerHandlebars.x = this.playerBody.x;
            this.playerWheels[0].x = this.playerBody.x;
            this.playerWheels[1].x = this.playerBody.x;
        }
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            this.updateEnemyAI(enemy);
            
            // Remove enemies that are too far back
            if (enemy.y > this.cameras.main.height + 100) {
                enemy.setActive(false);
                enemy.setVisible(false);
                const index = this.enemies.indexOf(enemy);
                if (index > -1) {
                    this.enemies.splice(index, 1);
                }
            }
        });
    }

    updateObstacles() {
        this.obstacles.children.entries.forEach(obstacle => {
            if (!obstacle.active) return;
            
            // Remove obstacles that are too far back
            if (obstacle.y > this.cameras.main.height + 100) {
                obstacle.setActive(false);
                obstacle.setVisible(false);
            }
        });
    }

    updateEnemyAI(enemy) {
        const aiTimer = enemy.getData('aiTimer') + 1;
        enemy.setData('aiTimer', aiTimer);
        
        const aiState = enemy.getData('aiState');
        const currentLane = enemy.getData('lane');
        
        // Simple AI behavior
        if (aiTimer > 120) { // Every 2 seconds
            enemy.setData('aiTimer', 0);
            
            const playerDistance = Math.abs(enemy.y - (this.cameras.main.height - 80));
            
            if (playerDistance < 150 && Math.random() < 0.3) {
                // Try to ram player
                const targetLane = this.playerLane;
                if (targetLane !== currentLane) {
                    this.moveEnemyToLane(enemy, targetLane);
                }
                enemy.setData('aiState', 'aggressive');
            } else if (Math.random() < 0.2) {
                // Random lane change
                const newLane = Phaser.Math.Between(0, 3);
                if (newLane !== currentLane) {
                    this.moveEnemyToLane(enemy, newLane);
                }
                enemy.setData('aiState', 'normal');
            }
        }
        
        // Adjust speed based on AI state
        const baseSpeed = this.gameSpeed;
        if (aiState === 'aggressive') {
            enemy.body.setVelocityY((baseSpeed + 2) * 60);
        } else {
            enemy.body.setVelocityY((baseSpeed + Phaser.Math.Between(-1, 1)) * 60);
        }
    }

    moveEnemyToLane(enemy, targetLane) {
        const targetX = this.lanes[targetLane];
        enemy.setData('lane', targetLane);
        
        this.tweens.add({
            targets: enemy,
            x: targetX,
            duration: 500,
            ease: 'Power2'
        });
    }

    updateWorld() {
        // Move road lines with sway effect
        this.roadLines.children.entries.forEach(line => {
            line.y += this.gameSpeed;
            line.x = line.getData('originalX') || line.x;
            line.x += this.roadSway * 0.02; // Subtle sway
            
            if (!line.getData('originalX')) {
                line.setData('originalX', line.x);
            }
            
            if (line.y > this.cameras.main.height) {
                line.y = -40;
            }
        });
        
        // Gradually reduce road sway
        this.roadSway *= 0.95;
    }

    updateHUD() {
        // Speed in MPH
        const mph = Math.round((this.gameSpeed + this.playerSpeed) * 8);
        this.hudElements.speedValue.setText(`${mph} MPH`);
        
        // Distance in km
        this.hudElements.distanceValue.setText(`${Math.round(this.distance)} km`);
        
        // Update health bar
        this.updateHealthBar();
    }

    handleCollisions() {
        // Check player collision with enemies
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            const playerX = this.lanes[this.playerLane];
            const playerY = this.cameras.main.height - 80;
            
            const distance = Phaser.Math.Distance.Between(playerX, playerY, enemy.x, enemy.y);
            
            if (distance < 35) {
                this.playerHit(20);
                this.knockOffEnemy(enemy);
            }
        });
        
        // Check player collision with obstacles
        this.obstacles.children.entries.forEach(obstacle => {
            if (!obstacle.active) return;
            
            const playerX = this.lanes[this.playerLane];
            const playerY = this.cameras.main.height - 80;
            
            const distance = Phaser.Math.Distance.Between(playerX, playerY, obstacle.x, obstacle.y);
            
            const type = obstacle.getData('type');
            let hitRange = 20;
            
            if (type === 'barricade') hitRange = 45;
            else if (type === 'oil') hitRange = 25;
            
            if (distance < hitRange) {
                this.handleObstacleCollision(obstacle, type);
            }
        });
    }

    handleObstacleCollision(obstacle, type) {
        obstacle.setActive(false);
        obstacle.setVisible(false);
        
        switch (type) {
            case 'cone':
            case 'barricade':
                // Instant game over
                this.gameOver();
                break;
                
            case 'oil':
                // Apply slip effect and damage
                this.applyOilSlip();
                this.playerHit(10);
                break;
        }
    }

    applyOilSlip() {
        this.isSlipping = true;
        this.slipTimer = this.slipDuration;
        
        // Visual effect
        this.cameras.main.flash(100, 100, 100, 100, false, (camera, progress) => {
            if (progress === 1) {
                // Effect complete
            }
        });
    }

    playerHit(damage = 20) {
        this.health = Math.max(0, this.health - damage);
        
        // Screen flash
        this.cameras.main.flash(200, 255, 0, 0);
        
        // Check game over
        if (this.health <= 0) {
            this.gameOver();
        }
    }

    spawnEnemiesTimer() {
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer >= this.enemySpawnRate) {
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
            
            // Increase spawn rate over time
            this.enemySpawnRate = Math.max(60, this.enemySpawnRate - 0.5);
        }
    }

    spawnObstaclesTimer() {
        this.obstacleSpawnTimer++;
        const adjustedSpawnRate = Math.max(90, this.obstacleSpawnRate - (this.distance * 0.5));
        
        if (this.obstacleSpawnTimer >= adjustedSpawnRate) {
            this.obstacleSpawnTimer = 0;
            
            // Spawn 0-2 obstacles
            const numObstacles = Phaser.Math.Between(0, 2);
            for (let i = 0; i < numObstacles; i++) {
                this.spawnObstacle();
            }
        }
    }

    gameOver() {
        if (this.isGameOver) return; // Prevent multiple calls
        
        console.log('Game Over triggered');
        this.isGameOver = true;
        
        // Disable player controls
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

// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 700,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [TitleScene, GameScene, GameOverScene]
};

// Start the game
const game = new Phaser.Game(config);
