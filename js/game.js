// js/game.js

// Phaser configuration with multiple scenes
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 300 },
            debug: false
        }
    },
    scene: [PreloadScene, MenuScene, GameScene],
    pixelArt: true, // For 16-bit style
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

// Preload Scene (Loading Screen)
class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Display loading text
        const loadingText = this.add.text(400, 300, 'Loading...', { fontSize: '32px', fill: '#fff' }).setOrigin(0.5);

        // Load assets (same as before)
        this.load.image('background', 'assets/background.png');
        this.load.image('ground', 'assets/ground.png');
        this.load.spritesheet('nova', 'assets/nova.png', { frameWidth: 32, frameHeight: 32 });
        this.load.image('laser', 'assets/laser.png');
        this.load.image('latency_blob', 'assets/latency_blob.png');
        this.load.image('mainframe', 'assets/mainframe.png');
        this.load.image('ai_shield', 'assets/ai_shield.png');

        // Update loading progress
        this.load.on('progress', (value) => {
            loadingText.setText(`Loading: ${Math.floor(value * 100)}%`);
        });

        this.load.on('complete', () => {
            this.scene.start('MenuScene');
        });
    }
}

// Menu Scene (Main Menu with Instructions and Buttons)
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Background
        this.add.image(400, 300, 'background').setScale(2);

        // Title
        this.add.text(400, 100, 'Nova: Credit Union Invasion', { fontSize: '40px', fill: '#fff' }).setOrigin(0.5);

        // Instructions
        const instructions = `
Controls:
- Arrow keys: Move left/right, up to jump
- Spacebar: Shoot laser

Mission: Defeat alien invaders representing outdated tech!
Collect power-ups to upgrade and win levels.
        `;
        this.add.text(400, 200, instructions, { fontSize: '24px', fill: '#fff', align: 'center', wordWrap: { width: 600 } }).setOrigin(0.5);

        // Play Button
        const playButton = this.add.text(400, 400, 'Play', { fontSize: '32px', fill: '#0f0' }).setOrigin(0.5).setInteractive();
        playButton.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // Exit Button (closes the game or returns to a landing page; for web, simulate exit)
        const exitButton = this.add.text(400, 450, 'Exit', { fontSize: '32px', fill: '#f00' }).setOrigin(0.5).setInteractive();
        exitButton.on('pointerdown', () => {
            // For web game, perhaps redirect or alert; here, just stop scenes
            alert('Thanks for playing! Closing game.');
            this.game.destroy(true);
        });
    }
}

// Game Scene (Main Gameplay)
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Background
        this.add.image(400, 300, 'background').setScale(2);

        // Platforms
        this.platforms = this.physics.add.staticGroup();
        this.platforms.create(400, 568, 'ground').setScale(2).refreshBody();

        // Player (Nova)
        this.player = this.physics.add.sprite(100, 450, 'nova');
        this.player.setBounce(0.2);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms);

        // Animations
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('nova', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [{ key: 'nova', frame: 4 }],
            frameRate: 20
        });
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('nova', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1
        });

        // Enemies group
        this.enemies = this.physics.add.group();
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(this.player, this.enemies, this.hitEnemy, null, this);

        // Power-ups group
        this.powerups = this.physics.add.group();
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Score
        this.score = 0;
        this.currentLevel = 1;
        this.scoreText = this.add.text(16, 16, 'Score: 0 | Level: 1', { fontSize: '32px', fill: '#fff' });

        // Load initial level
        this.loadLevel(1);

        // Menu overlay (hidden initially)
        this.gameOverMenu = this.add.container(400, 300).setVisible(false);
        this.gameOverText = this.add.text(0, -100, 'Game Over!', { fontSize: '40px', fill: '#f00' }).setOrigin(0.5);
        const restartButton = this.add.text(0, 0, 'Restart', { fontSize: '32px', fill: '#0f0' }).setOrigin(0.5).setInteractive();
        restartButton.on('pointerdown', () => {
            this.scene.restart();
        });
        const menuButton = this.add.text(0, 50, 'Main Menu', { fontSize: '32px', fill: '#ff0' }).setOrigin(0.5).setInteractive();
        menuButton.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
        this.gameOverMenu.add([this.gameOverText, restartButton, menuButton]);
    }

    update() {
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-160);
            this.player.anims.play('left', true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(160);
            this.player.anims.play('right', true);
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
        }

        // Shooting
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.fireLaser();
        }

        // Check level progression
        if (this.enemies.countActive(true) === 0) {
            this.currentLevel++;
            if (this.currentLevel > 4) {
                // Game win
                this.add.text(400, 250, 'Victory! Credit Unions Upgraded!', { fontSize: '40px', fill: '#0f0' }).setOrigin(0.5);
                this.physics.pause();
                this.showGameOverMenu('Victory!');
            } else {
                this.loadLevel(this.currentLevel);
            }
        }
    }

    loadLevel(level) {
        this.bossActive = false;
        this.scoreText.setText('Score: ' + this.score + ' | Level: ' + level);
        // Clear existing enemies/powerups
        this.enemies.clear(true, true);
        this.powerups.clear(true, true);

        // Spawn regular enemies
        for (let i = 0; i < level * 3; i++) {
            const enemy = this.enemies.create(Phaser.Math.Between(100, 700), 0, 'latency_blob');
            enemy.setBounce(1);
            enemy.setCollideWorldBounds(true);
            enemy.setVelocity(Phaser.Math.Between(-200, 200), 20);
        }

        // Spawn power-up
        const powerup = this.powerups.create(Phaser.Math.Between(100, 700), 16, 'ai_shield');
        powerup.setBounce(1);
        powerup.setCollideWorldBounds(true);
        powerup.setVelocity(Phaser.Math.Between(-200, 200), 20);

        // Boss (set bossActive if spawning boss)
        if (level % 1 === 0) { // Always for demo
            this.bossActive = true;
            const boss = this.enemies.create(600, 100, 'mainframe');
            boss.setScale(2);
            boss.setVelocityX(-100);
            boss.body.setAllowGravity(false);
        }
    }

    hitEnemy(player, enemy) {
        if (player.invincible) return;
        this.physics.pause();
        player.setTint(0xff0000);
        player.anims.play('turn');
        this.showGameOverMenu('Game Over!');
    }

    collectPowerup(player, powerup) {
        powerup.disableBody(true, true);
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score + ' | Level: ' + this.currentLevel);
        player.invincible = true;
        player.setTint(0x00ff00);
        this.time.delayedCall(5000, () => {
            player.invincible = false;
            player.clearTint();
        });
    }

    fireLaser() {
        const laser = this.physics.add.image(this.player.x, this.player.y, 'laser');
        laser.setVelocityX(500);
        laser.setCollideWorldBounds(true);
        laser.outOfBoundsKill = true;
        this.physics.add.collider(laser, this.enemies, this.hitLaser, null, this);
    }

    hitLaser(laser, enemy) {
        laser.destroy();
        enemy.destroy();
        this.score += 5;
        this.scoreText.setText('Score: ' + this.score + ' | Level: ' + this.currentLevel);
    }

    showGameOverMenu(text) {
        this.gameOverText.setText(text);
        this.gameOverMenu.setVisible(true);
    }
}
