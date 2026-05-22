const canvas = document.getElementById("granny");
const ctx = canvas.getContext("2d");

const GRANNY_WIDTH = 600;
const GRANNY_HEIGHT = 200;

let scaleRatio = 1;

/* ========= SCREEN ========= */

function getScaleRatio() {
    const screenHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
    const screenWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const scaleX = screenWidth / GRANNY_WIDTH;
    const scaleY = screenHeight / GRANNY_HEIGHT;
    return Math.min(scaleX, scaleY);
}

function setScreen() {
    scaleRatio = getScaleRatio();
    canvas.width = GRANNY_WIDTH * scaleRatio;
    canvas.height = GRANNY_HEIGHT * scaleRatio;
}

setScreen();
window.addEventListener("resize", setScreen);


/* ========= IMAGES ========= */

const grannyImg = new Image();
grannyImg.src = "images/granny.png";

const bgImg = new Image();
bgImg.src = "images/bg daytime.png";

const bazookaImg = new Image();
bazookaImg.src = "images/bazooka.png";

const coinSpin = new Image();
coinSpin.src = "images/coins.png";

const sunflowerImg = new Image();
sunflowerImg.src = "images/sunflower.png";


/* ========= AUDIO ========= */

const music1 = new Audio("music.mp3");
music1.loop = true;
music1.volume = 0.5;

const music2 = new Audio("music_lvl2.mp3");
music2.loop = true;
music2.volume = 0.5;

let music = music1; // active track


/* ========= GAME STATE ========= */

let started = false;
let gameOver = false;
let levelComplete = false;
let distance = 0;
let bestScore = Number(localStorage.getItem("best")) || 0;
let speed = 1;
let bgX1 = 0;
let bgX2 = GRANNY_WIDTH;

let stage = 1;
let collectibles = [];
let collected = 0;
let coinFrame = 0;

const stage1Goal = 20;
const stage2Goal = 15;


/* ========= PLAYER ========= */

const granny = {
    width: 32,
    height: 32,
    x: 120,
    defaultX: 120,
    targetX: 120,
    y: 80,
    velY: 0,
    gravity: 0.35,
    tilt: 0
};

function flap() { granny.velY = -5; }
function moveLeft() { granny.targetX = granny.defaultX - 60; }
function moveRight() { granny.targetX = granny.defaultX + 60; }


/* ========= INPUT ========= */

document.addEventListener("keydown", e => {
    if (levelComplete) return;
    if (!started) {
        started = true;
        music.play();
        return;
    }
    switch (e.code) {
        case "Space":
        case "ArrowUp":    flap();      break;
        case "ArrowLeft":  moveLeft();  break;
        case "ArrowRight": moveRight(); break;
    }
});

canvas.addEventListener("click", () => {
    if (levelComplete) return;
    if (gameOver) { restart(); return; }
    started = true;
    music.play();
    flap();
});


/* ========= BAZOOKAS ========= */

let bazookas = [];

function spawnBazooka() {
    const y = Math.random() * (GRANNY_HEIGHT - 40);
    bazookas.push({ x: GRANNY_WIDTH + 50, y, width: 30, height: 30 });
}


/* ========= COLLECTIBLES ========= */

function spawnCollectible() {
    collectibles.push({
        x: GRANNY_WIDTH + 50,
        y: Math.random() * (GRANNY_HEIGHT - 40),
        width: 32,
        height: 32,
        remove: false
    });
}


/* ========= COLLISION ========= */

function hit(a, b) {
    const padding = 6;
    return (
        a.x + padding < b.x + b.width &&
        a.x + a.width - padding > b.x &&
        a.y + padding < b.y + b.height &&
        a.y + a.height - padding > b.y
    );
}


/* ========= STAGE TRANSITION ========= */

function enterStage2() {
    levelComplete = true;
    music.pause();

    // show LEVEL COMPLETE for 2.5 seconds then switch
    setTimeout(() => {
        stage = 2;
        collected = 0;
        collectibles = [];
        bazookas = [];
        levelComplete = false;

        bgImg.src = "images/bg lvl2.jpg";

        music1.pause();
        music = music2;
        music.currentTime = 0;
        music.play();

        // Stage 2 difficulty boost
        speed = Math.max(speed, 1.8);
    }, 2500);
}


/* ========= UPDATE ========= */

let spawnTimer = 0;

function update() {
    if (!started || gameOver || levelComplete) return;

    coinFrame = (coinFrame + 0.1) % 4;

    distance += 0.1;
    speed += stage === 2 ? 0.0006 : 0.0003; // faster acceleration in stage 2
    if (speed > 4.5) speed = 4.5;

    spawnTimer++;
    let interval = 80 - (speed * 10);
    if (stage === 2) interval *= 0.75; // more bazookas in stage 2
    if (interval < 20) interval = 20;
    if (spawnTimer >= interval) { spawnTimer = 0; spawnBazooka(); }

    // Collectible spawn
    if (Math.random() < 0.012) { spawnCollectible(); }

    /* PLAYER */
    granny.velY += granny.gravity;
    granny.y += granny.velY;
    granny.x += (granny.targetX - granny.x) * 0.12;
    granny.targetX += (granny.defaultX - granny.targetX) * 0.08;

    if (granny.y < 0) granny.y = 0;
    if (granny.y > GRANNY_HEIGHT - granny.height) granny.y = GRANNY_HEIGHT - granny.height;
    if (granny.x < 0) granny.x = 0;
    if (granny.x > GRANNY_WIDTH - granny.width) granny.x = GRANNY_WIDTH - granny.width;

    /* BACKGROUND */
    bgX1 -= speed;
    bgX2 -= speed;
    if (bgX1 <= -GRANNY_WIDTH) bgX1 = bgX2 + GRANNY_WIDTH;
    if (bgX2 <= -GRANNY_WIDTH) bgX2 = bgX1 + GRANNY_WIDTH;

    /* BAZOOKAS */
    bazookas.forEach(b => {
        b.x -= speed * 3;
        if (hit(granny, b)) {
            gameOver = true;
            music.pause();
            if (distance > bestScore) {
                bestScore = Math.floor(distance);
                localStorage.setItem("best", bestScore);
            }
        }
    });
    bazookas = bazookas.filter(b => b.x > -50);

    /* COLLECTIBLES */
    collectibles.forEach(c => {
        c.x -= speed * 2;
        if (hit(granny, c)) {
            collected++;
            c.remove = true;
        }
    });
    collectibles = collectibles.filter(c => !c.remove && c.x > -50);

    /* STAGE COMPLETE CHECK */
    if (stage === 1 && collected >= stage1Goal) {
        enterStage2();
    }

    granny.tilt = granny.velY * 0.06;
}


/* ========= DRAW ========= */

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* BG */
    ctx.drawImage(bgImg, bgX1 * scaleRatio, 0, GRANNY_WIDTH * scaleRatio, GRANNY_HEIGHT * scaleRatio);
    ctx.drawImage(bgImg, bgX2 * scaleRatio, 0, GRANNY_WIDTH * scaleRatio, GRANNY_HEIGHT * scaleRatio);

    /* START SCREEN */
    if (!started) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = `${20 * scaleRatio}px monospace`;
        ctx.fillText("RIP MY GRANNY", canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = `${16 * scaleRatio}px monospace`;
        ctx.fillText("HIT THE HOOKAH TO START", canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = "left";
        return;
    }

    /* BAZOOKAS */
    bazookas.forEach(b => {
        ctx.drawImage(bazookaImg, b.x * scaleRatio, b.y * scaleRatio, b.width * scaleRatio, b.height * scaleRatio);
    });

    /* COLLECTIBLES */
    collectibles.forEach(c => {
        if (stage === 1) {
            ctx.drawImage(
                coinSpin,
                Math.floor(coinFrame) * 32, 0, 32, 32,
                c.x * scaleRatio, c.y * scaleRatio, 32 * scaleRatio, 32 * scaleRatio
            );
        } else {
            ctx.drawImage(sunflowerImg, c.x * scaleRatio, c.y * scaleRatio, 32 * scaleRatio, 32 * scaleRatio);
        }
    });

    /* GRANNY */
    ctx.save();
    ctx.translate((granny.x + granny.width / 2) * scaleRatio, (granny.y + granny.height / 2) * scaleRatio);
    ctx.rotate(granny.tilt);
    ctx.drawImage(grannyImg, -16 * scaleRatio, -16 * scaleRatio, 32 * scaleRatio, 32 * scaleRatio);
    ctx.restore();

    /* UI */
    ctx.fillStyle = "white";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.font = `${14 * scaleRatio}px monospace`;

    const ui1 = `DIST: ${Math.floor(distance)}m`;
    ctx.strokeText(ui1, 10 * scaleRatio, 20 * scaleRatio);
    ctx.fillText(ui1,   10 * scaleRatio, 20 * scaleRatio);

    const ui2 = `SPEED: ${speed.toFixed(1)}x`;
    ctx.strokeText(ui2, 10 * scaleRatio, 38 * scaleRatio);
    ctx.fillText(ui2,   10 * scaleRatio, 38 * scaleRatio);

    const ui3 = `BEST: ${bestScore}`;
    ctx.strokeText(ui3, 10 * scaleRatio, 56 * scaleRatio);
    ctx.fillText(ui3,   10 * scaleRatio, 56 * scaleRatio);

    const goalLabel = stage === 1 ? "COINS" : "FLOWERS";
    const goalCount = stage === 1 ? stage1Goal : stage2Goal;
    const ui4 = `${goalLabel}: ${collected}/${goalCount}`;
    ctx.strokeText(ui4, 10 * scaleRatio, 74 * scaleRatio);
    ctx.fillText(ui4,   10 * scaleRatio, 74 * scaleRatio);

    /* LEVEL COMPLETE SCREEN */
    if (levelComplete) {
        ctx.fillStyle = "rgba(0,0,0,0.75)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "gold";
        ctx.textAlign = "center";
        ctx.font = `${24 * scaleRatio}px monospace`;
        ctx.fillText("⭐ LEVEL COMPLETE ⭐", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "white";
        ctx.font = `${14 * scaleRatio}px monospace`;
        ctx.fillText("Stage 2 incoming...", canvas.width / 2, canvas.height / 2 + 16);
        ctx.textAlign = "left";
        return;
    }

    /* GAME OVER */
    if (gameOver) {
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.textAlign = "center";

        ctx.font = `${22 * scaleRatio}px monospace`;
        ctx.fillText("GRANNY GOT HIT BY A BAZOOKA 💔", canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = `${16 * scaleRatio}px monospace`;
        ctx.fillText(`DIST: ${Math.floor(distance)}m`, canvas.width / 2, canvas.height / 2);
        ctx.fillText(`BEST: ${bestScore}`,             canvas.width / 2, canvas.height / 2 + 28);

        ctx.font = `${14 * scaleRatio}px monospace`;
        ctx.fillText("CLICK TO RESTART", canvas.width / 2, canvas.height / 2 + 60);

        ctx.textAlign = "left";
    }
}


/* ========= RESTART ========= */

function restart() {
    distance = 0;
    speed = 1;
    stage = 1;
    collected = 0;
    collectibles = [];
    bazookas = [];
    gameOver = false;
    levelComplete = false;
    started = false;
    coinFrame = 0;
    granny.y = 80;
    granny.x = granny.defaultX;
    granny.velY = 0;
    granny.targetX = granny.defaultX;

    music2.pause();
    music = music1;
    bgImg.src = "images/bg daytime.png";
    music.currentTime = 0;
    music.play();
}


/* ========= LOOP ========= */

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();