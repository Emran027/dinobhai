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
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 520;
const GRAVITY = 0.9;
const JUMP_FORCE = -20;
const INITIAL_GAME_SPEED = 10;
const SPEED_INCREMENT = 0.005;

// Asset Configuration
const ASSETS_PATH = './assets/';
const ANIMATIONS = {
    RUN: { prefix: 'Run', frames: 8, speed: 0.2 },
    JUMP: { prefix: 'Jump', frames: 12, speed: 0.15 },
    DEAD: { prefix: 'Dead', frames: 8, speed: 0.1, loop: false },
    IDLE: { prefix: 'Idle', frames: 10, speed: 0.1 }
};

// Game State
let gameActive = false;
let gameSpeed = INITIAL_GAME_SPEED;
let score = 0;
let highScore = localStorage.getItem('dinoDash_highScore') || 0;
let particles = [];
let obstacles = [];
let nextObstacleTimer = 0;
let frameCount = 0;
const images = {};

// Background Scrolling Variables
const background = new Image();
let bgX1 = 0;
let bgX2 = CANVAS_WIDTH;
const BG_SPEED = 2; // Slower speed for parallax effect

/**
 * Preload Assets
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

    highScoreValue.innerText = Math.floor(highScore).toString().padStart(5, '0');
    await Promise.all(promises);
}

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
            for(let i=0; i<10; i++) {
                particles.push(new Particle(this.x + 40, this.y + this.height, '#666', (Math.random()-0.5)*5, Math.random()*2));
            }
        }
    }

    createImpactParticles() {
        for(let i=0; i<15; i++) {
            particles.push(new Particle(this.x + 40, GROUND_Y, '#333', (Math.random()-0.5)*10, -Math.random()*5));
        }
    }

    die() {
        this.state = 'DEAD';
        this.frameIndex = 0;
        for(let i=0; i<50; i++) {
            particles.push(new Particle(this.x + 60, this.y + 60, '#ff0000', (Math.random()-0.5)*20, (Math.random()-0.5)*20, 2));
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

class Obstacle {
    constructor() {
        const types = [
            { w: 40, h: 80, color: '#333' },
            { w: 80, h: 50, color: '#444' },
            { w: 50, h: 50, color: '#222' }
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        this.width = type.w;
        this.height = type.h;
        this.x = CANVAS_WIDTH;
        this.y = GROUND_Y - this.height;
        this.color = type.color;
    }

    update() {
        this.x -= gameSpeed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    isOffScreen() { return this.x + this.width < 0; }

    getHitbox() {
        return { x: this.x + 2, y: this.y + 2, w: this.width - 4, h: this.height - 4 };
    }
}

let player;

function init() {
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    player = new Player();
    obstacles = [];
    particles = [];
    score = 0;
    gameSpeed = INITIAL_GAME_SPEED;
    gameActive = false;
    bgX1 = 0;
    bgX2 = CANVAS_WIDTH;
}

function spawnObstacle() {
    if (nextObstacleTimer <= 0) {
        obstacles.push(new Obstacle());
        nextObstacleTimer = Math.max(30, 80 - (gameSpeed * 2) + Math.random() * 40);
    }
    nextObstacleTimer--;
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
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoDash_highScore', highScore);
        highScoreValue.innerText = Math.floor(highScore).toString().padStart(5, '0');
    }

    finalScoreValue.innerText = Math.floor(score);
    setTimeout(() => {
        gameOverScreen.classList.add('active');
    }, 1000);
}

function update() {
    // Infinite Background Scrolling Logic
    if (gameActive) {
        bgX1 -= BG_SPEED;
        bgX2 -= BG_SPEED;

        // Reset positions for seamless loop
        if (bgX1 <= -CANVAS_WIDTH) bgX1 = bgX2 + CANVAS_WIDTH;
        if (bgX2 <= -CANVAS_WIDTH) bgX2 = bgX1 + CANVAS_WIDTH;

        gameSpeed += SPEED_INCREMENT;
        score += gameSpeed / 50;
        scoreValue.innerText = Math.floor(score).toString().padStart(5, '0');

        spawnObstacle();

        obstacles.forEach((obs, index) => {
            obs.update();
            if (obs.isOffScreen()) {
                obstacles.splice(index, 1);
            }
            if (checkCollision(player.getHitbox(), obs.getHitbox())) {
                gameOver();
            }
        });
    }

    player.update();
    
    particles.forEach((p, i) => {
        p.update();
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Draw Scrolling Background (Side-by-side)
    ctx.drawImage(background, bgX1, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.drawImage(background, bgX2, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. Draw Solid Color Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // 3. Draw Entities (Obstacles, Particles, Player)
    particles.forEach(p => p.draw());
    obstacles.forEach(obs => obs.draw());
    player.draw();

    frameCount++;
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Input
window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        if (!gameActive && startScreen.classList.contains('active')) startGame();
        else if (gameActive) player.jump();
        else if (!gameActive && gameOverScreen.classList.contains('active')) restartGame();
    }
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

function startGame() {
    startScreen.classList.remove('active');
    gameActive = true;
}

function restartGame() {
    gameOverScreen.classList.remove('active');
    init();
    gameActive = true;
}

loadAssets().then(() => {
    init();
    gameLoop();
});
