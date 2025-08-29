// js/game.js

// Phaser configuration
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
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    pixelArt: true, // For 16-bit style
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);

let player;
let platforms;
let enemies;
let powerups;
let cursors;
let score = 0;
let scoreText;
let currentLevel = 1;
let bossActive = false;

// Preload assets (use your own pixel art PNGs; placeholders here assume assets in 'assets/' folder)
function preload() {
    this.load.image('background', 'assets/background.png'); // Placeholder: cosmic credit union bg
    this.load.image('ground', 'assets/ground.png'); // Platform tile
    this.load.spritesheet('nova', 'assets/nova.png', { frameWidth: 32, frameHeight: 32 }); // Nova spritesheet
    this.load.image('laser', 'assets/laser.png'); // Projectile
    this.load.image('latency_blob', 'assets/latency_blob.png'); // Enemy
    this.load.image('mainframe', 'assets/mainframe.png'); // Boss
    this.load.image('ai_shield', 'assets/ai_shield.png'); // Power-up
    // Add more for other enemies/bosses/power-ups
}

function create() {
    // Background
    this.add.image(400, 300, 'background').setScale(2);

    // Platforms
    platforms = this.physics.add.staticGroup();
    platforms.create(400, 568, 'ground').setScale(2).refreshBody();
    // Add more platforms for levels

    // Player (Nova)
    player = this.physics.add.sprite(100, 450, 'nova');
    player.setBounce(0.2);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    // Animations
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('nova', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'turn',
        frames: [ { key: 'nova', frame: 4 } ],
        frameRate: 20
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('nova', { start: 5, end: 8 }),
        frameRate: 10,
        repeat: -1
    });

    // Enemies group
    enemies = this.physics.add.group();
    this.physics.add.collider(enemies, platforms);
    this.physics.add.collider(player, enemies, hitEnemy, null, this);

    // Power-ups group
    powerups = this.physics.add.group();
    this.physics.add.overlap(player, powerups, collectPowerup, null, this);

    // Input
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); // For shooting

    // Score
    scoreText = this.add.text(16, 16, 'Score: 0 | Level: 1', { fontSize: '32px', fill: '#fff' });

    // Start level 1
    loadLevel(this, 1);
}

function update() {
    if (cursors.left.isDown) {
        player.setVelocityX(-160);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(160);
        player.anims.play('right', true);
    } else {
        player.setVelocityX(0);
        player.anims.play('turn');
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(-330);
    }

    // Shooting
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))) {
        fireLaser(this);
    }

    // Check level progression
    if (enemies.countActive(true) === 0 && !bossActive) {
        currentLevel++;
        if (currentLevel > 4) {
            // Game win - add end screen
            this.add.text(300, 250, 'Victory! Credit Unions Upgraded!', { fontSize: '40px', fill: '#0f0' });
            this.physics.pause();
        } else {
            loadLevel(this, currentLevel);
        }
    }
}

// Load level function
function loadLevel(scene, level) {
    scoreText.setText('Score: ' + score + ' | Level: ' + level);
    // Clear existing enemies/powerups
    enemies.clear(true, true);
    powerups.clear(true, true);
    bossActive = false;

    // Spawn regular enemies
    for (let i = 0; i < level * 3; i++) {
        const enemy = enemies.create(Phaser.Math.Between(100, 700), 0, 'latency_blob');
        enemy.setBounce(1);
        enemy.setCollideWorldBounds(true);
        enemy.setVelocity(Phaser.Math.Between(-200, 200), 20);
    }

    // Spawn power-up
    const powerup = powerups.create(Phaser.Math.Between(100, 700), 16, 'ai_shield');
    powerup.setBounce(1);
    powerup.setCollideWorldBounds(true);
    powerup.setVelocity(Phaser.Math.Between(-200, 200), 20);

    // Boss every level (simplified; expand for specific bosses)
    if (level % 1 === 0) { // Always for demo
        bossActive = true;
        const boss = enemies.create(600, 100, 'mainframe');
        boss.setScale(2);
        boss.setVelocityX(-100);
        boss.body.setAllowGravity(false); // Floating boss
    }
}

// Hit enemy
function hitEnemy(player, enemy) {
    if (player.invincible) return; // From power-up
    this.physics.pause();
    player.setTint(0xff0000);
    player.anims.play('turn');
    // Game over - restart or menu
    this.add.text(300, 250, 'Game Over! Try Again.', { fontSize: '40px', fill: '#f00' });
}

// Collect power-up
function collectPowerup(player, powerup) {
    powerup.disableBody(true, true);
    score += 10;
    scoreText.setText('Score: ' + score + ' | Level: ' + currentLevel);
    // Apply effect (e.g., invincible)
    player.invincible = true;
    player.setTint(0x00ff00);
    setTimeout(() => {
        player.invincible = false;
        player.clearTint();
    }, 5000);
}

// Fire laser
function fireLaser(scene) {
    const laser = scene.physics.add.image(player.x, player.y, 'laser');
    laser.setVelocityX(500); // Shoot right
    laser.setCollideWorldBounds(true);
    laser.outOfBoundsKill = true;
    scene.physics.add.collider(laser, enemies, hitLaser, null, scene);
}

// Laser hit enemy
function hitLaser(laser, enemy) {
    laser.destroy();
    enemy.destroy();
    score += 5;
    scoreText.setText('Score: ' + score + ' | Level: ' + currentLevel);
}
