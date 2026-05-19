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
bgImg.src = "images/bg daytime.jpeg";

const bazookaImg = new Image();
bazookaImg.src = "images/bazooka.png";


/* ========= AUDIO ========= */

const music = new Audio("music.mp3");
music.loop = true;
music.volume = 0.5;


/* ========= GAME STATE ========= */

let started = false;
let gameOver = false;
let distance = 0;
let bestScore = Number(localStorage.getItem("best")) || 0;
let speed = 1;
let bgX1 = 0;
let bgX2 = GRANNY_WIDTH;


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


/* ========= COLLISION ========= */

function hit(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}


/* ========= UPDATE ========= */

let spawnTimer = 0;

function update() {
    if (!started || gameOver) return;

    distance += 0.1;
    speed += 0.0003;
    if (speed > 3.5) speed = 3.5;

    spawnTimer++;
    let interval = 80 - (speed * 10);
    if (interval < 25) interval = 25;
    if (spawnTimer >= interval) { spawnTimer = 0; spawnBazooka(); }

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
    bazookas = [];
    gameOver = false;
    started = false;
    granny.y = 80;
    granny.x = granny.defaultX;
    granny.velY = 0;
    granny.targetX = granny.defaultX;
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