const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const finalScoreEl = document.getElementById("finalScore");
const startOverlay = document.getElementById("startOverlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const W = canvas.width;
const H = canvas.height;
const groundY = 438;

let running = false;
let gameOver = false;
let score = 0;
let best = Number(localStorage.getItem("jumpDodgeBest") || 0);
let speed = 6;
let spawnTimer = 0;
let lastTime = 0;
let animationId = 0;

bestEl.textContent = best;

const player = {
  x: 130, y: groundY - 58, w: 46, h: 58,
  vy: 0, jumpPower: -15.5, gravity: 0.72,
  grounded: true
};

let obstacles = [];
let clouds = [
  {x: 120, y: 100, s: 1},
  {x: 500, y: 70, s: .8},
  {x: 820, y: 145, s: 1.15}
];

function reset() {
  score = 0;
  speed = 6;
  spawnTimer = 55;
  obstacles = [];
  player.y = groundY - player.h;
  player.vy = 0;
  player.grounded = true;
  scoreEl.textContent = "0";
}

function startGame() {
  cancelAnimationFrame(animationId);
  reset();
  running = true;
  gameOver = false;
  startOverlay.classList.add("hidden");
  gameOverOverlay.classList.add("hidden");
  lastTime = performance.now();
  animationId = requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  gameOver = true;
  finalScoreEl.textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem("jumpDodgeBest", best);
    bestEl.textContent = best;
  }
  gameOverOverlay.classList.remove("hidden");
}

function jump() {
  if (!running) return;
  if (player.grounded) {
    player.vy = player.jumpPower;
    player.grounded = false;
  }
}

function spawnObstacle() {
  const tall = Math.random() > 0.5;
  const h = tall ? 68 + Math.random() * 35 : 48 + Math.random() * 25;
  const w = tall ? 38 + Math.random() * 15 : 50 + Math.random() * 28;
  obstacles.push({
    x: W + 30,
    y: groundY - h,
    w, h,
    passed: false,
    type: tall ? 1 : 0
  });
}

function update(dt) {
  const step = dt / 16.67;

  // Gradually increase difficulty.
  speed += 0.0025 * step;
  score += 0.11 * step;
  scoreEl.textContent = Math.floor(score);

  player.vy += player.gravity * step;
  player.y += player.vy * step;

  if (player.y >= groundY - player.h) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.grounded = true;
  }

  spawnTimer -= step;
  if (spawnTimer <= 0) {
    spawnObstacle();
    const minimum = Math.max(55, 105 - speed * 5);
    spawnTimer = minimum + Math.random() * 65;
  }

  obstacles.forEach(o => {
    o.x -= speed * step;
    if (!o.passed && o.x + o.w < player.x) {
      o.passed = true;
      score += 5;
    }
  });
  obstacles = obstacles.filter(o => o.x + o.w > -50);

  clouds.forEach(c => {
    c.x -= 0.35 * step * c.s;
    if (c.x < -150) c.x = W + 100;
  });

  // Slightly forgiving hitbox.
  const px = player.x + 7, py = player.y + 5;
  const pw = player.w - 14, ph = player.h - 8;

  for (const o of obstacles) {
    if (px < o.x + o.w - 5 &&
        px + pw > o.x + 5 &&
        py < o.y + o.h &&
        py + ph > o.y + 5) {
      endGame();
      return;
    }
  }
}

function drawSky() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#8fd0ff");
  gradient.addColorStop(1, "#f4fbff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  // Sun
  ctx.beginPath();
  ctx.arc(790, 105, 42, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,235,145,.9)";
  ctx.fill();

  clouds.forEach(c => drawCloud(c.x, c.y, c.s));

  // Distant hills
  ctx.fillStyle = "#b5d9c0";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= W; x += 60) {
    ctx.lineTo(x, groundY - 42 - Math.sin(x * .012) * 28);
  }
  ctx.lineTo(W, groundY);
  ctx.closePath();
  ctx.fill();
}

function drawCloud(x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = "rgba(255,255,255,.8)";
  ctx.beginPath();
  ctx.arc(0, 12, 22, 0, Math.PI * 2);
  ctx.arc(28, 4, 29, 0, Math.PI * 2);
  ctx.arc(58, 14, 20, 0, Math.PI * 2);
  ctx.fillRect(0, 12, 58, 20);
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  ctx.fillStyle = "#6f9f65";
  ctx.fillRect(0, groundY, W, H - groundY);

  ctx.fillStyle = "#53794c";
  for (let x = 0; x < W; x += 38) {
    ctx.fillRect((x - (performance.now() / 18 * speed / 6) % 38), groundY + 22, 17, 4);
  }

  ctx.fillStyle = "#496c43";
  ctx.fillRect(0, groundY, W, 7);
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);

  // shadow
  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,.15)";
  ctx.beginPath();
  ctx.ellipse(player.x + player.w/2, groundY + 5, 31, 7, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.save();
  ctx.translate(player.x, player.y);
  const bob = player.grounded ? Math.sin(performance.now()/100) * 1.5 : 0;
  ctx.translate(0, bob);

  // body
  ctx.fillStyle = "#172033";
  roundRect(3, 10, 40, 42, 11);
  ctx.fill();

  // face
  ctx.fillStyle = "#ffd6a0";
  roundRect(9, 2, 28, 27, 9);
  ctx.fill();

  // eye
  ctx.fillStyle = "#172033";
  ctx.beginPath();
  ctx.arc(29, 13, 2.5, 0, Math.PI*2);
  ctx.fill();

  // legs
  ctx.fillRect(8, 48, 9, 10);
  ctx.fillRect(29, 48, 9, 10);

  // arm
  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(7, 25);
  ctx.lineTo(-2, 36);
  ctx.stroke();

  ctx.restore();
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x, o.y);

  ctx.fillStyle = o.type ? "#a94b4b" : "#8d5947";
  roundRect(0, 0, o.w, o.h, 7);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.fillRect(8, 8, 5, o.h - 16);
  ctx.fillRect(o.w - 13, 8, 5, o.h - 16);

  ctx.fillStyle = "rgba(0,0,0,.14)";
  ctx.fillRect(0, o.h - 8, o.w, 8);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawSky();
  drawGround();
  obstacles.forEach(drawObstacle);
  drawPlayer();
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  update(dt);
  draw();
  if (running) animationId = requestAnimationFrame(loop);
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x+w, y, x+w, y+h, radius);
  ctx.arcTo(x+w, y+h, x, y+h, radius);
  ctx.arcTo(x, y+h, x, y, radius);
  ctx.arcTo(x, y, x+w, y, radius);
  ctx.closePath();
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

window.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (!running && !gameOver) startGame();
    else jump();
  }
  if (e.key.toLowerCase() === "r" && gameOver) startGame();
});

canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  if (!running) {
    if (gameOver) startGame();
    else startGame();
  } else {
    jump();
  }
});

draw();
