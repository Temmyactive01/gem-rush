import * as THREE from 'three';

// ---------- Talking to start.ng (connect page) ----------
const START_NG = 'https://start.ng';
let frame;
function connectFrame() {
  frame ??= new Promise((resolve, reject) => {
    const el = document.createElement('iframe');
    el.src = `${START_NG}/connect`;
    el.hidden = true;
    el.onload = () => resolve(el);
    el.onerror = reject;
    document.body.append(el);
  });
  return frame;
}
async function askStartNg(message, replyType, timeoutMs = 4000) {
  const el = await connectFrame();
  return new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    const done = (reply) => { clearTimeout(timer); removeEventListener('message', onMessage); resolve(reply); };
    const timer = setTimeout(() => done(null), timeoutMs);
    function onMessage(e) {
      if (e.origin !== START_NG || e.source !== el.contentWindow) return;
      if (e.data?.type === replyType && e.data.requestId === requestId) done(e.data);
    }
    addEventListener('message', onMessage);
    el.contentWindow.postMessage({ ...message, requestId }, START_NG);
  });
}

// ---------- Who is playing ----------
const DEFAULT_STYLE = { body: 'male', primaryColor: '#4b7bec', secondaryColor: '#2b2f4a', skinColor: '#8d5524',
  hairColor: '#17120f', hair: 'short', hat: 'none', accessory: 'none' };
let signedIn = false;
let style = DEFAULT_STYLE;

async function loadPlayer() {
  const reply = await askStartNg({ type: 'startng:whoami' }, 'startng:user');
  const player = reply?.user ?? reply?.guest;
  signedIn = !!reply?.user;
  if (player) {
    style = { ...DEFAULT_STYLE, ...(player.style || {}) };
    if (player.face) document.getElementById('player-face').src = player.face;
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-account').textContent = reply.user?.account ? `@${reply.user.account}` : 'Not signed in';
    document.getElementById('player-sign-in').hidden = signedIn;
    document.getElementById('player-card').hidden = false;
  } else {
    document.getElementById('player-name').textContent = 'Guest';
    document.getElementById('player-sign-in').hidden = false;
    document.getElementById('player-card').hidden = false;
  }
  buildCharacter();
}
document.getElementById('player-sign-in').onclick = () => {
  location.href = `https://start.ng/?return_to=${encodeURIComponent(location.origin + location.pathname)}`;
};
// The player may sign in or out on start.ng in another tab, so ask again when they come back.
addEventListener('visibilitychange', () => { if (!document.hidden && !running) loadPlayer(); });

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9ad1ff');
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 9, 9);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight('#ffffff', '#6a7a55', 1.1));
const sun = new THREE.DirectionalLight('#ffffff', 1.4);
sun.position.set(5, 10, 4);
scene.add(sun);
const ARENA = 10;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2, ARENA * 2), new THREE.MeshLambertMaterial({ color: '#7dbb5c' }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

// ---------- Character, drawn from the start.ng style ----------
const hero = new THREE.Group();
scene.add(hero);
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c, x, y, z, parent) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
};
let legL, legR, armL, armR;

function buildCharacter() {
  hero.clear();
  const s = style;
  const female = s.body === 'female';
  // legs (secondaryColor: trousers or skirt)
  legL = new THREE.Group(); legR = new THREE.Group();
  legL.position.set(-0.18, 0.6, 0); legR.position.set(0.18, 0.6, 0);
  box(0.28, 0.6, 0.28, s.secondaryColor, 0, -0.3, 0, legL);
  box(0.28, 0.6, 0.28, s.secondaryColor, 0, -0.3, 0, legR);
  hero.add(legL, legR);
  if (female) box(0.8, 0.3, 0.5, s.secondaryColor, 0, 0.65, 0, hero); // skirt
  // body (primaryColor: top)
  box(female ? 0.6 : 0.75, 0.7, 0.4, s.primaryColor, 0, 0.95, 0, hero);
  // arms
  armL = new THREE.Group(); armR = new THREE.Group();
  armL.position.set(-0.46, 1.25, 0); armR.position.set(0.46, 1.25, 0);
  box(0.2, 0.6, 0.2, s.skinColor, 0, -0.25, 0, armL);
  box(0.2, 0.6, 0.2, s.skinColor, 0, -0.25, 0, armR);
  hero.add(armL, armR);
  // head
  box(0.55, 0.55, 0.55, s.skinColor, 0, 1.6, 0, hero);
  box(0.07, 0.07, 0.02, '#111', -0.12, 1.65, 0.28, hero);
  box(0.07, 0.07, 0.02, '#111', 0.12, 1.65, 0.28, hero);
  // hair
  const hc = s.hairColor;
  switch (s.hair) {
    case 'bald': break;
    case 'afro': box(0.85, 0.5, 0.85, hc, 0, 1.95, -0.02, hero); break;
    case 'braids':
      box(0.6, 0.18, 0.6, hc, 0, 1.92, 0, hero);
      box(0.1, 0.5, 0.1, hc, -0.3, 1.5, -0.1, hero); box(0.1, 0.5, 0.1, hc, 0.3, 1.5, -0.1, hero);
      box(0.1, 0.5, 0.1, hc, 0, 1.5, -0.3, hero); break;
    case 'bun': box(0.6, 0.15, 0.6, hc, 0, 1.9, 0, hero); box(0.25, 0.25, 0.25, hc, 0, 2.1, -0.05, hero); break;
    case 'ponytail': box(0.6, 0.15, 0.6, hc, 0, 1.9, 0, hero); box(0.16, 0.5, 0.16, hc, 0, 1.6, -0.35, hero); break;
    case 'dreads':
      box(0.6, 0.15, 0.6, hc, 0, 1.9, 0, hero);
      [-0.28, -0.1, 0.1, 0.28].forEach((x) => box(0.09, 0.55, 0.09, hc, x, 1.55, -0.3, hero)); break;
    default: box(0.6, 0.15, 0.6, hc, 0, 1.92, 0, hero); // short
  }
  // hat
  switch (s.hat) {
    case 'cap': box(0.62, 0.15, 0.62, s.primaryColor, 0, 2.0, 0, hero); box(0.5, 0.05, 0.3, s.primaryColor, 0, 1.95, 0.4, hero); break;
    case 'beanie': box(0.62, 0.25, 0.62, s.secondaryColor, 0, 2.0, 0, hero); break;
    case 'tophat': box(0.8, 0.06, 0.8, '#222', 0, 1.97, 0, hero); box(0.5, 0.5, 0.5, '#222', 0, 2.25, 0, hero); break;
    case 'crown': box(0.6, 0.15, 0.6, '#f5c518', 0, 2.02, 0, hero);
      [-0.2, 0, 0.2].forEach((x) => box(0.1, 0.15, 0.1, '#f5c518', x, 2.15, 0, hero)); break;
  }
  // accessory
  switch (s.accessory) {
    case 'glasses': box(0.5, 0.1, 0.03, '#222', 0, 1.66, 0.3, hero); break;
    case 'earrings': box(0.06, 0.12, 0.06, '#f5c518', -0.3, 1.5, 0, hero); box(0.06, 0.12, 0.06, '#f5c518', 0.3, 1.5, 0, hero); break;
    case 'beard': box(0.4, 0.2, 0.1, hc, 0, 1.4, 0.28, hero); break;
    case 'scarf': box(0.7, 0.14, 0.5, s.secondaryColor, 0, 1.3, 0, hero); break;
    case 'backpack': box(0.5, 0.6, 0.25, s.secondaryColor, 0, 1.0, -0.32, hero); break;
  }
}

// ---------- Gems ----------
const gemGeo = new THREE.OctahedronGeometry(0.35);
const gems = [];
function spawnGem() {
  const g = new THREE.Mesh(gemGeo, new THREE.MeshLambertMaterial({ color: '#ff4d8d', emissive: '#6a0030' }));
  g.position.set((Math.random() * 2 - 1) * (ARENA - 1), 0.6, (Math.random() * 2 - 1) * (ARENA - 1));
  scene.add(g);
  gems.push(g);
}

// ---------- Controls ----------
const keys = {};
addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
let drag = null;
addEventListener('pointerdown', (e) => { if (e.target.tagName === 'CANVAS') drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
});
addEventListener('pointerup', () => { drag = null; });

// ---------- Game loop ----------
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const msgEl = document.getElementById('msg');
let running = false, score = 0, timeLeft = 30, last = performance.now(), t = 0;

function startGame() {
  score = 0; timeLeft = 30; running = true;
  hero.position.set(0, 0, 0);
  gems.splice(0).forEach((g) => scene.remove(g));
  for (let i = 0; i < 6; i++) spawnGem();
  msgEl.hidden = true;
  scoreEl.textContent = 'Gems: 0';
}
document.getElementById('start').onclick = startGame;

async function endGame() {
  running = false;
  msgEl.hidden = false;
  msgEl.querySelector('h2').textContent = `Time's up! ${score} gems`;
  msgEl.querySelector('div').textContent = signedIn ? 'Saving your score…' : 'Sign in with start.ng (top left) to save your score.';
  document.getElementById('start').textContent = 'Play again';
  if (signedIn) {
    const saved = await askStartNg({ type: 'startng:score', stats: { gems: score } }, 'startng:scoreSaved');
    msgEl.querySelector('div').textContent = saved?.ok
      ? (saved.result.improved ? `New best! You are #${saved.result.rank}.` : `Not your best. You are #${saved.result.rank}.`)
      : (saved?.error || 'Could not save your score.');
  }
  const board = await askStartNg({ type: 'startng:leaderboard', limit: 5 }, 'startng:leaderboardData');
  const list = document.getElementById('board');
  if (board?.ok && board.entries?.length) {
    list.replaceChildren(...board.entries.map((e) => {
      const li = document.createElement('li');
      li.textContent = `${e.name}: ${e.stats?.gems ?? e.score} gems`;
      return li;
    }));
    list.hidden = false;
  }
}

function frameLoop(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now; t += dt;
  let mx = 0, mz = 0;
  if (running) {
    if (keys['arrowleft'] || keys['a']) mx -= 1;
    if (keys['arrowright'] || keys['d']) mx += 1;
    if (keys['arrowup'] || keys['w']) mz -= 1;
    if (keys['arrowdown'] || keys['s']) mz += 1;
    if (drag?.dx !== undefined) { mx += Math.max(-1, Math.min(1, drag.dx / 60)); mz += Math.max(-1, Math.min(1, drag.dy / 60)); }
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    hero.position.x = Math.max(-ARENA + 0.5, Math.min(ARENA - 0.5, hero.position.x + mx * 7 * dt));
    hero.position.z = Math.max(-ARENA + 0.5, Math.min(ARENA - 0.5, hero.position.z + mz * 7 * dt));
    if (len > 0.05) hero.rotation.y = Math.atan2(mx, mz);
    timeLeft -= dt;
    timeEl.textContent = `Time: ${Math.max(0, Math.ceil(timeLeft))}`;
    for (let i = gems.length - 1; i >= 0; i--) {
      if (gems[i].position.distanceTo(new THREE.Vector3(hero.position.x, 0.6, hero.position.z)) < 0.9) {
        scene.remove(gems[i]); gems.splice(i, 1);
        score++; scoreEl.textContent = `Gems: ${score}`;
        spawnGem();
      }
    }
    if (timeLeft <= 0) endGame();
  }
  const swing = Math.hypot(mx, mz) > 0.05 ? Math.sin(t * 12) * 0.7 : 0;
  if (legL) { legL.rotation.x = swing; legR.rotation.x = -swing; armL.rotation.x = -swing; armR.rotation.x = swing; }
  gems.forEach((g, i) => { g.rotation.y += dt * 2; g.position.y = 0.6 + Math.sin(t * 3 + i) * 0.1; });
  camera.position.set(hero.position.x, 6, hero.position.z + 6.5);
  camera.lookAt(hero.position.x, 0.8, hero.position.z);
  renderer.render(scene, camera);
  requestAnimationFrame(frameLoop);
}

buildCharacter();
requestAnimationFrame(frameLoop);
loadPlayer();
