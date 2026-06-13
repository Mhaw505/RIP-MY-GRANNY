const canvas = document.getElementById("granny");
const ctx = canvas.getContext("2d");

/* ========= VIRTUAL WORLD (landscape, matches your bg image) ========= */
const V_W = 800;
const V_H = 342;

/* ========= GAME STATE ========= */
let started   = false;
let gameOver  = false;
let distance  = 0;
let bestScore = Number(localStorage.getItem("best")) || 0;
let speed     = 1;
let bgX1      = 0;
let bgX2      = V_W;
let coinFrame = 0;

let collectibles = [];
let collected    = 0;
const GOAL       = 20;

let bazookas   = [];
let spawnTimer = 0;

// Approx top of the grass/ground in the background image (virtual px)
const GROUND_Y = V_H - 22;
const granny = {
    width: 32, height: 32,
    x: 120, defaultX: 120, targetX: 120,
    y: V_H / 2 - 16,
    velY: 0, gravity: 0.35, tilt: 0
};

let scaleRatio = 1;
let offsetX = 0;
let offsetY = 0;

// The portion of the virtual world actually visible on screen (in virtual units)
let viewLeft = 0, viewRight = V_W, viewTop = 0, viewBottom = V_H, viewW = V_W, viewH = V_H;

/* ========= SCREEN ========= */
function setScreen() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width  = window.innerWidth  + "px";
    canvas.style.height = window.innerHeight + "px";

    const scaleX = canvas.width  / V_W;
    const scaleY = canvas.height / V_H;
    scaleRatio = Math.max(scaleX, scaleY); // fill screen, no black bars

    offsetX = (canvas.width  - V_W * scaleRatio) / 2;
    offsetY = (canvas.height - V_H * scaleRatio) / 2;

    // Compute the visible virtual-world window so gameplay stays on-screen
    viewLeft   = -offsetX / scaleRatio;
    viewRight  = (canvas.width  - offsetX) / scaleRatio;
    viewTop    = -offsetY / scaleRatio;
    viewBottom = (canvas.height - offsetY) / scaleRatio;
    viewW = viewRight - viewLeft;
    viewH = viewBottom - viewTop;

    // Keep granny anchored relative to the visible left edge, not the fixed world
    granny.defaultX = viewLeft + viewW * (viewW > viewH ? 0.14 : 0.08);
    granny.targetX  = granny.defaultX;
    granny.x = granny.defaultX;
    if (!started) {
        granny.y = (viewTop + viewBottom) / 2 - granny.height / 2;
    }
}

setScreen();
window.addEventListener("resize", setScreen);

/* ========= COORD HELPERS ========= */
function vx(x) { return offsetX + x * scaleRatio; }
function vy(y) { return offsetY + y * scaleRatio; }
function vs(s) { return s * scaleRatio; }

// Text/UI scale based on actual screen size (not the world cover-scale),
// so HUD and overlay text stay readable and on-screen on any device.
function uiScale() {
    let s = Math.min(canvas.width, canvas.height) / 380;
    return Math.max(0.7, Math.min(s, 1.6));
}
function ui(px) { return px * uiScale(); }

/* ========= IMAGES ========= */
const grannyImg  = new Image(); grannyImg.src  = "images/granny.png";
const bgImg      = new Image(); bgImg.src      = "images/bg_daytime.png";
const bazookaImg = new Image(); bazookaImg.src = "images/bazooka.png";
const coinSpin   = new Image(); coinSpin.src   = "images/coins.png";

/* ========= AUDIO ========= */
const music = new Audio("music.mp3");
music.loop = true; music.volume = 0.5;

function flap()      { granny.velY = -5; }

/* ========= INPUT — KEYBOARD ========= */
document.addEventListener("keydown", e => {
    if (!started) { started = true; music.play(); return; }
    if (gameOver) return;
    switch (e.code) {
        case "Space":
        case "ArrowUp":    flap();      break;
    }
});

/* ========= INPUT — TOUCH ========= */
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    if (!started) { started = true; music.play(); return; }
    if (gameOver) { restart(); return; }
}, { passive: false });

canvas.addEventListener("touchend", e => {
    e.preventDefault();
    if (!started || gameOver) return;
    flap();
}, { passive: false });

/* ========= INPUT — MOUSE ========= */
canvas.addEventListener("click", () => {
    if (gameOver) { restart(); return; }
    if (!started) { started = true; music.play(); return; }
    flap();
});

/* ========= SPAWN ========= */
function spawnBazooka() {
    const maxY = Math.min(viewBottom, GROUND_Y) - 30;
    bazookas.push({ x: viewRight + 50, y: viewTop + Math.random() * (maxY - viewTop), width: 30, height: 30 });
}
function spawnCollectible() {
    const maxY = Math.min(viewBottom, GROUND_Y) - 20;
    collectibles.push({ x: viewRight + 50, y: viewTop + Math.random() * (maxY - viewTop), width: 20, height: 20, remove: false });
}

/* ========= COLLISION ========= */
function hit(a, b) {
    const p = 6;
    return (
        a.x + p < b.x + b.width  &&
        a.x + a.width  - p > b.x &&
        a.y + p < b.y + b.height &&
        a.y + a.height - p > b.y
    );
}

/* ========= UPDATE ========= */
function update() {
    if (!started || gameOver) return;

    coinFrame = (coinFrame + 0.08) % 6;
    distance += 0.1;
    speed = Math.min(speed + 0.0003, 4.5);

    spawnTimer++;
    const interval = Math.max(20, 80 - speed * 10);
    if (spawnTimer >= interval) { spawnTimer = 0; spawnBazooka(); }
    if (Math.random() < 0.008) spawnCollectible();

    granny.velY   += granny.gravity;
    granny.y      += granny.velY;

    granny.y = Math.max(viewTop, Math.min(granny.y, viewBottom - granny.height));
    granny.x = Math.max(viewLeft, Math.min(granny.x, viewRight - granny.width));

    // Hitting the ground ends the game
    if (granny.y + granny.height >= GROUND_Y) {
        granny.y = GROUND_Y - granny.height;
        gameOver = true; music.pause();
        if (distance > bestScore) { bestScore = Math.floor(distance); localStorage.setItem("best", bestScore); }
    }

    bgX1 -= speed;
    bgX2 -= speed;
    if (bgX1 <= -V_W) bgX1 = bgX2 + V_W;
    if (bgX2 <= -V_W) bgX2 = bgX1 + V_W;

    bazookas.forEach(b => {
        b.x -= speed * 3;
        if (hit(granny, b)) {
            gameOver = true; music.pause();
            if (distance > bestScore) { bestScore = Math.floor(distance); localStorage.setItem("best", bestScore); }
        }
    });
    bazookas = bazookas.filter(b => b.x > -50);

    collectibles.forEach(c => {
        c.x -= speed * 2;
        if (hit(granny, c)) { collected++; c.remove = true; }
    });
    collectibles = collectibles.filter(c => !c.remove && c.x > -50);

    if (collected >= GOAL && !gameOver) {
        gameOver = true; music.pause();
        if (distance > bestScore) { bestScore = Math.floor(distance); localStorage.setItem("best", bestScore); }
    }

    granny.tilt = granny.velY * 0.06;
}

/* ========= DRAW ========= */
function draw() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // No clip — let bg fill entire screen edge to edge
    ctx.drawImage(bgImg, vx(bgX1), vy(0), vs(V_W), vs(V_H));
    ctx.drawImage(bgImg, vx(bgX2), vy(0), vs(V_W), vs(V_H));

    if (!started) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = `bold ${ui(20)}px monospace`;
        ctx.fillText("GRANNY RUN", canvas.width/2, canvas.height/2 - ui(30));
        ctx.font = `${ui(13)}px monospace`;
        ctx.fillText("TAP / CLICK TO FLAP", canvas.width/2, canvas.height/2 + ui(5));
        ctx.textAlign = "left";
        ctx.restore();
        return;
    }

    bazookas.forEach(b =>
        ctx.drawImage(bazookaImg, vx(b.x), vy(b.y), vs(b.width), vs(b.height))
    );

    collectibles.forEach(c => {
        const fw = coinSpin.width / 6;
        ctx.drawImage(coinSpin, Math.floor(coinFrame)*fw, 0, fw, coinSpin.height,
            vx(c.x), vy(c.y), vs(20), vs(20));
    });

    ctx.save();
    ctx.translate(vx(granny.x + granny.width/2), vy(granny.y + granny.height/2));
    ctx.rotate(granny.tilt);
    ctx.drawImage(grannyImg, -vs(16), -vs(16), vs(32), vs(32));
    ctx.restore();

    /* HUD */
    ctx.fillStyle = "white"; ctx.strokeStyle = "black";
    ctx.lineWidth = ui(3); ctx.font = `bold ${ui(13)}px monospace`;
    [`DIST: ${Math.floor(distance)}m`, `SPEED: ${speed.toFixed(1)}x`,
     `BEST: ${bestScore}`, `COINS: ${collected}/${GOAL}`
    ].forEach((t, i) => {
        const tx = ui(10), ty = ui(20) + i * ui(20);
        ctx.strokeText(t, tx, ty); ctx.fillText(t, tx, ty);
    });

    /* WIN */
    if (collected >= GOAL) {
        ctx.fillStyle = "rgba(0,0,0,0.78)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center"; ctx.fillStyle = "gold";
        ctx.font = `bold ${ui(24)}px monospace`;
        ctx.fillText("YOU WIN!", canvas.width/2, canvas.height/2 - ui(20));
        ctx.fillStyle = "white"; ctx.font = `${ui(14)}px monospace`;
        ctx.fillText(`DIST: ${Math.floor(distance)}m`, canvas.width/2, canvas.height/2 + ui(15));
        ctx.fillText("TAP TO PLAY AGAIN", canvas.width/2, canvas.height/2 + ui(38));
        ctx.textAlign = "left"; ctx.restore(); return;
    }

    /* GAME OVER */
    if (gameOver) {
        ctx.fillStyle = "rgba(255,255,255,0.93)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black"; ctx.textAlign = "center";
        ctx.font = `bold ${ui(18)}px monospace`;
        ctx.fillText("GRANNY GOT HIT", canvas.width/2, canvas.height/2 - ui(40));
        ctx.font = `${ui(15)}px monospace`;
        ctx.fillText(`DIST: ${Math.floor(distance)}m`, canvas.width/2, canvas.height/2);
        ctx.fillText(`BEST: ${bestScore}`, canvas.width/2, canvas.height/2 + ui(25));
        ctx.font = `${ui(13)}px monospace`;
        ctx.fillText("TAP TO RESTART", canvas.width/2, canvas.height/2 + ui(55));
        ctx.textAlign = "left";
    }

    ctx.restore();
}

/* ========= RESTART ========= */
function restart() {
    distance = 0; speed = 1; collected = 0;
    collectibles = []; bazookas = []; gameOver = false;
    started = false; spawnTimer = 0; coinFrame = 0;
    bgX1 = 0; bgX2 = V_W;
    granny.y = (viewTop + viewBottom) / 2 - 16; granny.x = granny.defaultX;
    granny.velY = 0; granny.targetX = granny.defaultX;
    music.currentTime = 0; music.play();
}

/* ========= LOOP ========= */
(function loop() { update(); draw(); requestAnimationFrame(loop); })();