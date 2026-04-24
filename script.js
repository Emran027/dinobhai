/**
 * DINO BHAI: GRAVEYARD PROTOCOL
 * Created by: Md Emran Hossain
 * Company: 90's Dream
 */

console.log("%c DINO BHAI %c 90's Dream %c Created by Md Emran Hossain ", 
            "background:#00f2ff;color:#000;font-weight:bold;padding:4px;", 
            "background:#ff007a;color:#fff;padding:4px;", 
            "background:#333;color:#fff;padding:4px;");

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreValue = document.getElementById('score-value');
const highScoreValue = document.getElementById('high-score-value');
const finalScoreValue = document.getElementById('final-score-value');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-button');
const restartBtn = document.getElementById('restart-button');

// Game Constants
// Responsive Game Constants
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;
const LOGICAL_WIDTH = 1200;
const LOGICAL_HEIGHT = 600;
let scaleFactor = 1;

let GROUND_Y = LOGICAL_HEIGHT - 80;
const GRAVITY = 0.9;
const JUMP_FORCE = -20;
const INITIAL_GAME_SPEED = 5;
const MAX_GAME_SPEED = 18;
const SPEED_INCREMENT = 0.002;

// Asset Configuration
const ASSETS_PATH = './assets/';
const ANIMATIONS = {
    RUN: { prefix: 'Run', frames: 8, speed: 0.2 },
    JUMP: { prefix: 'Jump', frames: 12, speed: 0.15 },
    DEAD: { prefix: 'Dead', frames: 8, speed: 0.1, loop: false },
    IDLE: { prefix: 'Idle', frames: 10, speed: 0.1 }
};

// Obstacle & Decoration Asset Definitions
const DECORATIVE_ASSETS = [
    'Bush (1).png',
    'Bush (2).png',
    'DeadBush.png',
    'Tree.png'
];

const DEADLY_ASSETS = [
    'ArrowSign.png',
    'Crate.png',
    'Sign.png',
    'Skeleton.png',
    'TombStone (1).png',
    'TombStone (2).png'
];

// Game State
let gameActive = false;
let gameSpeed = INITIAL_GAME_SPEED;
let score = 0;
let highScore = localStorage.getItem('dinoBhai_highScore') || 0;
let particles = [];
let deadlyObstacles = [];
let decorativeItems = [];
let nextObstacleTimer = 0;
let nextDecorTimer = 0;
let frameCount = 0;
const images = {};
const decorativeImages = {};
const deadlyImages = {};

// Background Scrolling Variables
const background = new Image();
let bgX1 = 0;
let bgX2 = LOGICAL_WIDTH;
let currentBgSpeed = INITIAL_GAME_SPEED * 0.2;

// Audio Setup
const bgm = new Audio(`${ASSETS_PATH}bgm.mp3`);
const jumpSound = new Audio(`${ASSETS_PATH}jump.mp3`);
const deadSound = new Audio(`${ASSETS_PATH}dead.mp3`);

bgm.loop = true;
bgm.volume = 0.5;
jumpSound.volume = 0.4;
deadSound.volume = 0.6;

/**
 * Preload all assets
 */
async function loadAssets() {
    const promises = [];
    
    // Load character animations
    for (const [key, anim] of Object.entries(ANIMATIONS)) {
        images[key] = [];
        for (let i = 1; i <= anim.frames; i++) {
            const img = new Image();
            img.src = `${ASSETS_PATH}${anim.prefix} (${i}).png`;
            images[key].push(img);
            promises.push(new Promise(resolve => img.onload = resolve));
        }
    }

    // Load background
    background.src = `${ASSETS_PATH}bg.png`;
    promises.push(new Promise(resolve => background.onload = resolve));

    // Load decorative item images
    DECORATIVE_ASSETS.forEach(filename => {
        const img = new Image();
        img.src = `${ASSETS_PATH}${filename}`;
        decorativeImages[filename] = img;
        promises.push(new Promise(resolve => img.onload = resolve));
    });

    // Load deadly obstacle images
    DEADLY_ASSETS.forEach(filename => {
        const img = new Image();
        img.src = `${ASSETS_PATH}${filename}`;
        deadlyImages[filename] = img;
        promises.push(new Promise(resolve => img.onload = resolve));
    });

    highScoreValue.innerText = Math.floor(highScore).toString().padStart(5, '0');
    await Promise.all(promises);
}

// ============================================================
// PARTICLE CLASS
// ============================================================
class Particle {
    constructor(x, y, color, speedX, speedY, life = 1) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.speedX = speedX;
        this.speedY = speedY;
        this.life = life;
        this.decay = Math.random() * 0.02 + 0.01;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// ============================================================
// PLAYER CLASS
// ============================================================
class Player {
    constructor() {
        this.width = 120;
        this.height = 120;
        this.x = 100;
        this.y = GROUND_Y - this.height;
        this.vy = 0;
        this.isJumping = false;
        this.state = 'RUN';
        this.frameIndex = 0;
        this.frameTimer = 0;
    }

    update() {
        this.vy += GRAVITY;
        this.y += this.vy;

        if (this.y > GROUND_Y - this.height) {
            this.y = GROUND_Y - this.height;
            this.vy = 0;
            if (this.isJumping) {
                this.isJumping = false;
                if (gameActive) {
                    this.state = 'RUN';
                    this.createImpactParticles();
                }
            }
        }

        const anim = ANIMATIONS[this.state];
        this.frameTimer += anim.speed;
        if (this.frameTimer >= 1) {
            this.frameTimer = 0;
            this.frameIndex++;
            if (this.frameIndex >= anim.frames) {
                this.frameIndex = anim.loop === false ? anim.frames - 1 : 0;
            }
        }

        // Trail particles while running
        if (gameActive && !this.isJumping) {
            if (Math.random() > 0.5) {
                particles.push(new Particle(this.x + 20, GROUND_Y - 5, '#444', -Math.random() * 5, -Math.random() * 2));
            }
        }
    }

    jump() {
        if (!this.isJumping && gameActive) {
            this.vy = JUMP_FORCE;
            this.isJumping = true;
            this.state = 'JUMP';
            this.frameIndex = 0;
            
            // Play Jump Sound
            jumpSound.currentTime = 0;
            jumpSound.play().catch(() => {});

            for (let i = 0; i < 10; i++) {
                particles.push(new Particle(this.x + 40, this.y + this.height, '#666', (Math.random() - 0.5) * 5, Math.random() * 2));
            }
        }
    }

    createImpactParticles() {
        for (let i = 0; i < 15; i++) {
            particles.push(new Particle(this.x + 40, GROUND_Y, '#333', (Math.random() - 0.5) * 10, -Math.random() * 5));
        }
    }

    die() {
        this.state = 'DEAD';
        this.frameIndex = 0;
        for (let i = 0; i < 50; i++) {
            particles.push(new Particle(this.x + 60, this.y + 60, '#ff0000', (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 2));
        }
    }

    draw() {
        const currentFrame = images[this.state][this.frameIndex];
        if (currentFrame) {
            ctx.drawImage(currentFrame, this.x, this.y, this.width, this.height);
        }
    }

    getHitbox() {
        return {
            x: this.x + 35,
            y: this.y + 25,
            w: this.width - 70,
            h: this.height - 35
        };
    }
}

// ============================================================
// DECORATIVE ITEM CLASS (No collision)
// ============================================================
class DecorativeItem {
    constructor() {
        const filename = DECORATIVE_ASSETS[Math.floor(Math.random() * DECORATIVE_ASSETS.length)];
        this.img = decorativeImages[filename];
        // Use the image's natural dimensions, scaled down for the game
        this.scale = 0.6 + Math.random() * 0.4; // Random scale between 0.6 and 1.0
        this.width = this.img.naturalWidth * this.scale;
        this.height = this.img.naturalHeight * this.scale;
        this.x = LOGICAL_WIDTH + Math.random() * 200;
        this.y = GROUND_Y - this.height;
        this.opacity = 0.6 + Math.random() * 0.4; // Slightly transparent for depth
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.globalAlpha = this.opacity;
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
        ctx.globalAlpha = 1;
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// ============================================================
// DEADLY OBSTACLE CLASS (Triggers Game Over)
// ============================================================
class DeadlyObstacle {
    constructor() {
        const filename = DEADLY_ASSETS[Math.floor(Math.random() * DEADLY_ASSETS.length)];
        this.img = deadlyImages[filename];
        // Use the image's natural dimensions, scaled for gameplay
        this.scale = 0.8 + Math.random() * 0.3; // Scale between 0.8 and 1.1
        this.width = this.img.naturalWidth * this.scale;
        this.height = this.img.naturalHeight * this.scale;
        this.x = LOGICAL_WIDTH;
        this.y = GROUND_Y - this.height;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }

    isOffScreen() {
        return this.x + this.width < 0;
    }

    getHitbox() {
        // Slightly inset hitbox for fairness
        const insetX = this.width * 0.15;
        const insetY = this.height * 0.1;
        return {
            x: this.x + insetX,
            y: this.y + insetY,
            w: this.width - insetX * 2,
            h: this.height - insetY * 2
        };
    }
}

// ============================================================
// GAME FUNCTIONS
// ============================================================
let player;

function init() {
    resizeCanvas();
    player = new Player();
    deadlyObstacles = [];
    decorativeItems = [];
    particles = [];
    score = 0;
    gameSpeed = INITIAL_GAME_SPEED;
    gameActive = false;
    bgX1 = 0;
    bgX2 = LOGICAL_WIDTH;
    nextObstacleTimer = 0;
    nextDecorTimer = 0;
}

function resizeCanvas() {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Determine scale factor based on logical resolution
    // We'll use a "fit" strategy that maintains aspect ratio or stretches
    // For this game, stretching slightly or keeping logic fixed is best
    scaleFactor = Math.min(CANVAS_WIDTH / LOGICAL_WIDTH, CANVAS_HEIGHT / LOGICAL_HEIGHT);
}

window.addEventListener('resize', resizeCanvas);

function spawnDeadlyObstacle() {
    if (nextObstacleTimer <= 0) {
        deadlyObstacles.push(new DeadlyObstacle());
        
        // Calculate dynamic spawn intervals based on current gameSpeed
        const minGapFrames = 55; 
        const maxGapFrames = Math.max(minGapFrames + 20, 160 - (gameSpeed * 5));
        
        nextObstacleTimer = minGapFrames + Math.random() * (maxGapFrames - minGapFrames);
    }
    nextObstacleTimer--;
}

function spawnDecorativeItem() {
    if (nextDecorTimer <= 0) {
        decorativeItems.push(new DecorativeItem());
        nextDecorTimer = 40 + Math.random() * 120; // More spread out than deadly ones
    }
    nextDecorTimer--;
}

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.w &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + rect2.h &&
           rect1.y + rect1.h > rect2.y;
}

function gameOver() {
    gameActive = false;
    player.die();
    
    // Play Death Sound and Pause BGM
    bgm.pause();
    deadSound.currentTime = 0;
    deadSound.play().catch(() => {});
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoBhai_highScore', highScore);
        highScoreValue.innerText = Math.floor(highScore).toString().padStart(5, '0');
    }

    finalScoreValue.innerText = Math.floor(score);
    setTimeout(() => {
        gameOverScreen.classList.add('active');
    }, 1000);
}

function update() {
    // Background scrolling
    if (gameActive) {
        // Progressive Difficulty: Increase gameSpeed up to MAX_GAME_SPEED
        if (gameSpeed < MAX_GAME_SPEED) {
            gameSpeed += SPEED_INCREMENT;
        }
        
        // Sync background speed with game speed (parallax effect)
        currentBgSpeed = gameSpeed * 0.3;
        bgX1 -= currentBgSpeed;
        bgX2 -= currentBgSpeed;
        if (bgX1 <= -LOGICAL_WIDTH) bgX1 = bgX2 + LOGICAL_WIDTH;
        if (bgX2 <= -LOGICAL_WIDTH) bgX2 = bgX1 + LOGICAL_WIDTH;
        score += gameSpeed / 50;
        scoreValue.innerText = Math.floor(score).toString().padStart(5, '0');

        // Spawn decorative items (no collision)
        spawnDecorativeItem();

        // Spawn deadly obstacles (collision checked)
        spawnDeadlyObstacle();

        // Update decorative items
        for (let i = decorativeItems.length - 1; i >= 0; i--) {
            decorativeItems[i].update();
            if (decorativeItems[i].isOffScreen()) {
                decorativeItems.splice(i, 1);
            }
        }

        // Update deadly obstacles & check collision ONLY with these
        for (let i = deadlyObstacles.length - 1; i >= 0; i--) {
            deadlyObstacles[i].update();
            if (deadlyObstacles[i].isOffScreen()) {
                deadlyObstacles.splice(i, 1);
            } else if (checkCollision(player.getHitbox(), deadlyObstacles[i].getHitbox())) {
                gameOver();
            }
        }
    }

    player.update();
    
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    ctx.save();
    
    // Scale everything to fit the screen
    const offsetX = (CANVAS_WIDTH - LOGICAL_WIDTH * scaleFactor) / 2;
    const offsetY = (CANVAS_HEIGHT - LOGICAL_HEIGHT * scaleFactor) / 2;
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFactor, scaleFactor);

    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // LAYER 1: Scrolling Background
    ctx.drawImage(background, bgX1, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
    ctx.drawImage(background, bgX2, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // LAYER 2: Solid Color Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, GROUND_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_Y);

    // LAYER 3: Decorative Items
    decorativeItems.forEach(item => item.draw());

    // LAYER 4: Particles
    particles.forEach(p => p.draw());

    // LAYER 5: Deadly Obstacles
    deadlyObstacles.forEach(obs => obs.draw());

    // LAYER 6: Player (on top)
    player.draw();

    ctx.restore();
    frameCount++;
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Input Handling
function handleInput(e) {
    if (e.type === 'touchstart') e.preventDefault();
    
    if (!gameActive) {
        if (startScreen.classList.contains('active')) startGame();
        else if (gameOverScreen.classList.contains('active')) restartGame();
    } else {
        player.jump();
    }
}

window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        handleInput(e);
    }
});

window.addEventListener('touchstart', handleInput, { passive: false });

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

function startGame() {
    startScreen.classList.remove('active');
    gameActive = true;
    
    // Start Background Music
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
}

function restartGame() {
    gameOverScreen.classList.remove('active');
    init();
    gameActive = true;
    
    // Reset and Play BGM
    bgm.currentTime = 0;
    bgm.play().catch(() => {});
}

// Initialize
loadAssets().then(() => {
    init();
    gameLoop();
});
