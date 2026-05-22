const canvas = document.getElementById("granny");
const ctx = canvas.getContext("2d");

// --- 1. USE A REAL ASPECT RATIO ---
const GAME_W = 960;  // was 600
const GAME_H = 540;  // was 200 - now 16:9

let scaleRatio = 1;

function getScaleRatio() {
    const screenHeight = Math.min(window.innerHeight, document.documentElement.clientHeight);
    const screenWidth = Math.min(window.innerWidth, document.documentElement.clientWidth);
    return Math.min(screenWidth / GAME_W, screenHeight / GAME_H);
}

function setScreen() {
    scaleRatio = getScaleRatio();
    canvas.width = GAME_W * scaleRatio;
    canvas.height = GAME_H * scaleRatio;
    canvas.style.display = 'block';
    canvas.style.margin = '0 auto';
    // crisp pixel art
    ctx.imageSmoothingEnabled = false;
}
setScreen();
window.addEventListener("resize", setScreen);

/* ========= IMAGES ========= */
const grannyImg = new Image(); grannyImg.src = "images/granny.png";
const bgImg = new Image(); bgImg.src = "images/bg daytime.png";
const bazookaImg = new Image(); bazookaImg.src = "images/bazooka.png";
const coinSpin = new Image(); coinSpin.src = "images/coins.png";
const sunflowerImg = new Image(); sunflowerImg.src = "images/sunflower.png";

/* ========= AUDIO ========= */
const music1 = new Audio("music.mp3"); music1.loop = true; music1.volume = 0.5;
const music2 = new Audio("music_lvl2.mp3"); music2.loop = true; music2.volume = 0.5;
let music = music1;

/* ========= GAME STATE ========= */
let started = false, gameOver = false, levelComplete = false;
let distance = 0, bestScore = Number(localStorage.getItem("best")) || 0;
let speed = 1;
let bgX1 = 0, bgX2 = GAME_W;
let stage = 1, collectibles = [], collected = 0;

const stage1Goal = 20, stage2Goal = 15;

/* ========= PLAYER - BIGGER ========= */
const granny = {
    width: 64,   // was 32
    height: 64,  // was 32
    x: 150,
    defaultX: 150,
    targetX: 150,
    y: 200,
    velY: 0,
    gravity: 0.35,
    tilt: 0
};

function flap() { granny.velY = -6; }
function moveLeft() { granny.targetX = granny.defaultX - 80; }
function moveRight() { granny.targetX = granny.defaultX + 80; }

/* ========= INPUT ========= */
document.addEventListener("keydown", e => {
    if (levelComplete) return;
    if (!started) { started = true; music.play(); return; }
    if (e.code === "Space" || e.code === "ArrowUp") flap();
    if (e.code === "ArrowLeft") moveLeft();
    if (e.code === "ArrowRight") moveRight();
});
canvas.addEventListener("click", () => {
    if (levelComplete) return;
    if (gameOver) { restart(); return; }
    started = true; music.play(); flap();
});

/* ========= SPAWN ========= */
let bazookas = [];
function spawnBazooka() {
    bazookas.push({ x: GAME_W + 50, y: Math.random() * (GAME_H - 60), width: 48, height: 48 });
}
function spawnCollectible() {
    collectibles.push({ x: GAME_W + 50, y: Math.random() * (GAME_H - 50), width: 40, height: 40, remove: false });
}
function hit(a,b){ const p=4; return a.x+p<b.x+b.width && a.x+a.width-p>b.x && a.y+p<b.y+b.height && a.y+a.height-p>b.y; }

/* ========= UPDATE ========= */
let spawnTimer = 0;
function update() {
    if (!started || gameOver || levelComplete) return;
    distance += 0.1;
    speed += stage === 2 ? 0.0006 : 0.0003;
    if (speed > 4.5) speed = 4.5;

    spawnTimer++;
    let interval = 80 - (speed * 10);
    if (stage === 2) interval *= 0.75;
    if (spawnTimer > Math.max(20, interval)) { spawnTimer = 0; spawnBazooka(); }
    if (Math.random() < 0.012) spawnCollectible();

    granny.velY += granny.gravity;
    granny.y += granny.velY;
    granny.x += (granny.targetX - granny.x) * 0.12;
    granny.targetX += (granny.defaultX - granny.targetX) * 0.08;
    granny.y = Math.max(0, Math.min(GAME_H - granny.height, granny.y));

    // --- 2. SEAMLESS BACKGROUND ---
    bgX1 -= speed; bgX2 -= speed;
    if (bgX1 <= -GAME_W) bgX1 = bgX2 + GAME_W - 1; // -1 overlap kills the line
    if (bgX2 <= -GAME_W) bgX2 = bgX1 + GAME_W - 1;

    bazookas.forEach(b => { b.x -= speed * 3; if (hit(granny,b)) { gameOver=true; music.pause(); bestScore=Math.max(bestScore,Math.floor(distance)); localStorage.setItem("best",bestScore);} });
    bazookas = bazookas.filter(b => b.x > -60);

    collectibles.forEach(c => { c.x -= speed * 2; if (hit(granny,c)) { collected++; c.remove=true; } });
    collectibles = collectibles.filter(c => !c.remove && c.x > -50);

    if (stage === 1 && collected >= stage1Goal) enterStage2();
    granny.tilt = granny.velY * 0.05;
}

/* ========= DRAW ========= */
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // background - use floor to avoid sub-pixel gaps
    ctx.drawImage(bgImg, Math.floor(bgX1*scaleRatio),0, GAME_W*scaleRatio, GAME_H*scaleRatio);
    ctx.drawImage(bgImg, Math.floor(bgX2*scaleRatio),0, GAME_W*scaleRatio, GAME_H*scaleRatio);

    if (!started) {
        ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle="white"; ctx.textAlign="center";
        ctx.font=`${28*scaleRatio}px monospace`;
        ctx.fillText("RIP MY GRANNY", canvas.width/2, canvas.height/2 - 20);
        ctx.font=`${18*scaleRatio}px monospace`;
        ctx.fillText("CLICK OR SPACE TO START", canvas.width/2, canvas.height/2 + 30);
        return;
    }

    bazookas.forEach(b => ctx.drawImage(bazookaImg, b.x*scaleRatio, b.y*scaleRatio, b.width*scaleRatio, b.height*scaleRatio));

    // --- 3. DRAW WHOLE COIN, NOT SPRITE SLICE ---
    collectibles.forEach(c => {
        const img = stage === 1 ? coinSpin : sunflowerImg;
        ctx.drawImage(img, c.x*scaleRatio, c.y*scaleRatio, c.width*scaleRatio, c.height*scaleRatio);
    });

    // --- 4. BIGGER GRANNY ---
    ctx.save();
    ctx.translate((granny.x+granny.width/2)*scaleRatio, (granny.y+granny.height/2)*scaleRatio);
    ctx.rotate(granny.tilt);
    ctx.drawImage(grannyImg, -granny.width/2*scaleRatio, -granny.height/2*scaleRatio, granny.width*scaleRatio, granny.height*scaleRatio);
    ctx.restore();

    // UI - moved in 20px so it doesn't get cut
    ctx.fillStyle="white"; ctx.strokeStyle="black"; ctx.lineWidth=3; ctx.font=`${18*scaleRatio}px monospace`;
    ["DIST: "+Math.floor(distance)+"m","SPEED: "+speed.toFixed(1)+"x","BEST: "+bestScore,`${stage===1?"COINS":"FLOWERS"}: ${collected}/${stage===1?stage1Goal:stage2Goal}`]
      .forEach((t,i)=>{ const y=(25+i*28)*scaleRatio; ctx.strokeText(t,20*scaleRatio,y); ctx.fillText(t,20*scaleRatio,y); });

    if (levelComplete || gameOver) {
        ctx.fillStyle = levelComplete ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.92)";
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = levelComplete ? "gold" : "black";
        ctx.textAlign="center";
        ctx.font=`${28*scaleRatio}px monospace`;
        ctx.fillText(levelComplete ? "⭐ LEVEL COMPLETE ⭐" : "GRANNY GOT HIT 💔", canvas.width/2, canvas.height/2 - 20);
    }
}

/* ========= STAGE & RESTART ========= */
function enterStage2(){ levelComplete=true; music.pause(); setTimeout(()=>{ stage=2; collected=0; collectibles=[]; bazookas=[]; levelComplete=false; bgImg.src="images/bg lvl2.jpg"; music1.pause(); music=music2; music.currentTime=0; music.play(); speed=Math.max(speed,1.8); },2500); }
function restart(){ distance=0; speed=1; stage=1; collected=0; collectibles=[]; bazookas=[]; gameOver=false; levelComplete=false; started=false; granny.y=200; granny.velY=0; music2.pause(); music=music1; bgImg.src="images/bg daytime.png"; music.currentTime=0; music.play(); }

/* ========= LOOP - WAIT FOR IMAGES ========= */
let images = [grannyImg,bgImg,bazookaImg,coinSpin,sunflowerImg];
let loaded = 0; images.forEach(i=>i.onload=()=>{if(++loaded===images.length) loop();});
function loop(){ update(); draw(); requestAnimationFrame(loop); }