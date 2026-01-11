//@ts-check
/// <reference path="./types.js" />

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

// Game state
/** @type {GameState} */
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    paused: false,
    gameOver: false
};

// Player
/** @type {Player} */
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 30,
    speed: 3,
    dx: 0
};

// Bullets
/** @type {Bullet[]} */
let bullets = [];
const bulletSpeed = 5;
const bulletWidth = 4;
const bulletHeight = 15;

// Aliens
/** @type {Alien[]} */
let aliens = [];
const alienRows = 5;
const alienCols = 11;
const alienWidth = 40;
const alienHeight = 30;
const alienPadding = 10;
let alienSpeed = 0.5;
let alienDirection = 1;
let alienDropDistance = 20;

// Alien bullets
/** @type {Bullet[]} */
let alienBullets = [];
const alienShootChance = 0.0003;

// Keyboard state
/** @type {Record<string, boolean>} */
const keys = {};

// Background image
const backgroundImage = new Image();
backgroundImage.src = 'images/game_background.jpg';

// Player image
const playerImage = new Image();
playerImage.src = 'images/player.png';

// Initialize aliens
function createAliens() {
    aliens = [];
    for (let row = 0; row < alienRows; row++) {
        for (let col = 0; col < alienCols; col++) {
            aliens.push({
                x: col * (alienWidth + alienPadding) + 50,
                y: row * (alienHeight + alienPadding) + 50,
                width: alienWidth,
                height: alienHeight,
                alive: true,
                type: row < 1 ? 3 : row < 3 ? 2 : 1 // Different point values
            });
        }
    }
}

// Draw player
function drawPlayer() {
    if (playerImage.complete) {
        ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    } else {
        // Fallback to rectangle if image not loaded
        ctx.fillStyle = '#0f0';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

/**
 * Draw alien
 * @param {Alien} alien
 */
function drawAlien(alien) {
    if (!alien.alive) return;

    ctx.fillStyle = alien.type === 3 ? '#f00' : alien.type === 2 ? '#ff0' : '#0ff';

    // Simple alien shape
    ctx.fillRect(alien.x + 5, alien.y, 30, 20);
    ctx.fillRect(alien.x, alien.y + 10, 40, 15);
    ctx.fillRect(alien.x + 10, alien.y + 25, 5, 5);
    ctx.fillRect(alien.x + 25, alien.y + 25, 5, 5);
}

/**
 * Draw bullet
 * @param {Bullet} bullet
 */
function drawBullet(bullet) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
}

/**
 * Draw alien bullet
 * @param {Bullet} bullet
 */
function drawAlienBullet(bullet) {
    ctx.fillStyle = '#f00';
    ctx.fillRect(bullet.x, bullet.y, bulletWidth, bulletHeight);
}

// Update player position
function updatePlayer() {
    player.x += player.dx;

    // Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

// Update bullets
function updateBullets() {
    bullets = bullets.filter(bullet => {
        bullet.y -= bulletSpeed;
        return bullet.y > 0;
    });

    alienBullets = alienBullets.filter(bullet => {
        bullet.y += bulletSpeed - 2;
        return bullet.y < canvas.height;
    });
}

// Update aliens
function updateAliens() {
    let hitEdge = false;

    // Speed up as aliens are destroyed
    const aliveCount = aliens.filter(a => a.alive).length;
    const totalAliens = alienRows * alienCols;
    const speedMultiplier = 1 + ((totalAliens - aliveCount) / totalAliens) * 3;
    const currentSpeed = alienSpeed * speedMultiplier;

    aliens.forEach(alien => {
        if (!alien.alive) return;

        alien.x += currentSpeed * alienDirection;

        if (alien.x <= 0 || alien.x + alien.width >= canvas.width) {
            hitEdge = true;
        }

        // Alien shooting
        if (Math.random() < alienShootChance) {
            alienBullets.push({
                x: alien.x + alien.width / 2,
                y: alien.y + alien.height
            });
        }
    });

    if (hitEdge) {
        alienDirection *= -1;
        aliens.forEach(alien => {
            if (alien.alive) alien.y += alienDropDistance;
        });
    }
}

// Check collisions
function checkCollisions() {
    // Player bullets vs aliens
    bullets.forEach((bullet, bulletIndex) => {
        aliens.forEach(alien => {
            if (alien.alive &&
                bullet.x < alien.x + alien.width &&
                bullet.x + bulletWidth > alien.x &&
                bullet.y < alien.y + alien.height &&
                bullet.y + bulletHeight > alien.y) {

                alien.alive = false;
                bullets.splice(bulletIndex, 1);
                gameState.score += alien.type * 10;
                updateScore();
            }
        });
    });

    // Alien bullets vs player
    alienBullets.forEach((bullet, index) => {
        if (bullet.x < player.x + player.width &&
            bullet.x + bulletWidth > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bulletHeight > player.y) {

            alienBullets.splice(index, 1);
            loseLife();
        }
    });

    // Check if aliens reached bottom
    aliens.forEach(alien => {
        if (alien.alive && alien.y + alien.height >= player.y) {
            endGame();
        }
    });

    // Check if all aliens defeated
    if (aliens.every(alien => !alien.alive)) {
        nextLevel();
    }
}

// Shoot bullet
function shoot() {
    bullets.push({
        x: player.x + player.width / 2 - bulletWidth / 2,
        y: player.y
    });
}

// Lose a life
function loseLife() {
    gameState.lives--;
    updateLives();

    if (gameState.lives <= 0) {
        endGame();
    } else {
        player.x = canvas.width / 2 - 25;
    }
}

// Next level
function nextLevel() {
    gameState.level++;
    alienSpeed += 0.3;
    updateLevel();
    createAliens();
}

// Update UI
function updateScore() {
    const scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.textContent = gameState.score.toString();
}

function updateLives() {
    const livesElement = document.getElementById('lives');
    if (livesElement) livesElement.textContent = gameState.lives.toString();
}

function updateLevel() {
    const levelElement = document.getElementById('level');
    if (levelElement) levelElement.textContent = gameState.level.toString();
}

// End game
function endGame() {
    gameState.gameOver = true;
    const finalScoreElement = document.getElementById('finalScore');
    const gameOverElement = document.getElementById('gameOver');
    if (finalScoreElement) finalScoreElement.textContent = gameState.score.toString();
    if (gameOverElement) gameOverElement.style.display = 'block';
}

// Restart game
function restartGame() {
    gameState = {
        score: 0,
        lives: 3,
        level: 1,
        paused: false,
        gameOver: false
    };

    player.x = canvas.width / 2 - 25;
    bullets = [];
    alienBullets = [];
    alienSpeed = 0.5;

    createAliens();
    updateScore();
    updateLives();
    updateLevel();

    const gameOverElement = document.getElementById('gameOver');
    if (gameOverElement) gameOverElement.style.display = 'none';
    gameLoop();
}

// Draw everything
function draw() {
    // Draw background image (or clear if not loaded)
    if (backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    drawPlayer();

    aliens.forEach(drawAlien);
    bullets.forEach(drawBullet);
    alienBullets.forEach(drawAlienBullet);

    if (gameState.paused) {
        ctx.fillStyle = '#0f0';
        ctx.font = '48px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
    }
}

// Game loop
function gameLoop() {
    if (gameState.gameOver) return;

    if (!gameState.paused) {
        updatePlayer();
        updateBullets();
        updateAliens();
        checkCollisions();
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    console.log(JSON.stringify(keys))
    keys[e.key] = true;

    if (e.key === 'ArrowLeft') {
        player.dx = -player.speed;
    } else if (e.key === 'ArrowRight') {
        player.dx = player.speed;
    } else if (e.key === ' ') {
        e.preventDefault();
        if (!gameState.paused && !gameState.gameOver) {
            shoot();
        }
    } else if (e.key === 'p' || e.key === 'P') {
        gameState.paused = !gameState.paused;
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        player.dx = 0;
    }
});

// Start game
createAliens();
gameLoop();
