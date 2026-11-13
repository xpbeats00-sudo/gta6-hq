// GTA 6 HQ Setup: the page side. The program around it (src/main.rs) does the installing;
// this page asks it to with short messages and is told how far along it is.
'use strict';

const send = (message) => window.ipc && window.ipc.postMessage(message);
const $ = (id) => document.getElementById(id);
const info = window.SETUP || { version: '', walls: [], cards: [], update: false };

// ---- window: drag by the bar, minimise, close
document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && e.target.closest('[data-drag]') && !e.target.closest('button')) send('drag');
});
document.querySelectorAll('[data-send]').forEach((b) => b.addEventListener('click', () => send(b.dataset.send)));
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- live wallpaper: each video plays once, then cross-fades into the next
const layers = [...document.querySelectorAll('.wall')];
let front = 0, playing = 0;
const play = (layer, index) => { layer.src = info.walls[index % info.walls.length]; layer.play().catch(() => {}); };
if (info.walls.length) {
  play(layers[0], 0);
  layers.forEach((layer) => layer.addEventListener('timeupdate', () => {
    if (layer !== layers[front] || !layer.duration || layer.duration - layer.currentTime > 1.6) return;
    const next = layers[1 - front];
    playing += 1;
    play(next, playing);
    next.classList.add('is-on');
    layer.classList.remove('is-on');
    front = 1 - front;
  }));
}

// ---- the sliding cards: each column holds its pictures twice, so the loop has no seam
const fill = (id, pictures) => {
  for (const src of [...pictures, ...pictures]) {
    const card = document.createElement('div');
    card.className = 'card';
    card.appendChild(Object.assign(new Image(), { src, alt: '' }));
    $(id).appendChild(card);
  }
};
const half = Math.ceil(info.cards.length / 2);
fill('rail-a', info.cards.slice(0, half));
fill('rail-b', info.cards.slice(half));

// ---- steps
const show = (step) => document.querySelectorAll('.step').forEach((s) => s.classList.toggle('is-on', s.id === 'step-' + step));
$('version').textContent = info.version ? 'Version ' + info.version : 'GTA 6 HQ';

const TIPS = ['Unpacking Leonida…', 'Laying out Vice City…', 'Filing the Field Manual…', 'Hanging the wallpapers…', 'Folding the map…', 'Nearly there…'];
const RING = 2 * Math.PI * 46;
const progress = (percent) => {
  $('percent').textContent = percent + '%';
  $('ring').style.strokeDashoffset = RING * (1 - percent / 100);
  $('tip').textContent = TIPS[Math.min(TIPS.length - 1, Math.floor(percent / (100 / TIPS.length)))];
};

const install = () => {
  progress(0);
  show('work');
  $('close').disabled = true;
  // An update keeps the last install's choices; a first install uses the tick box.
  send('install:' + (info.update ? 'u' : $('desktop').checked ? '1' : '0'));
};
$('install').addEventListener('click', install);
$('retry').addEventListener('click', install);

// Called by the program.
window.setup = {
  progress,
  done() {
    progress(100);
    $('close').disabled = false;
    // After an update the app simply reopens; a first install shows the finished page.
    if (info.update) { $('work-title').textContent = 'Updated. Opening GTA 6 HQ'; setTimeout(() => send('finish:10'), 1100); }
    else setTimeout(() => show('done'), 500);
  },
  failed(reason) { $('close').disabled = false; $('fail-text').textContent = reason; show('fail'); },
};

// ---- finished: open the app and, if ticked, the Discord invite
const promo = $('promo');
const togglePromo = (e) => { e.preventDefault(); promo.setAttribute('aria-checked', promo.getAttribute('aria-checked') === 'true' ? 'false' : 'true'); };
promo.addEventListener('click', togglePromo);
promo.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') togglePromo(e); });
const finish = (openApp) => send(`finish:${openApp ? 1 : 0}${promo.getAttribute('aria-checked') === 'true' ? 1 : 0}`);
$('open').addEventListener('click', () => finish(true));
$('finish').addEventListener('click', () => finish(false));

// ---- started by the app to update itself: go straight to installing
if (info.update) {
  $('work-title').textContent = 'Updating GTA 6 HQ' + (info.version ? ' to ' + info.version : '');
  install();
}

// ---- the notice
fetch('notice.txt').then((r) => r.text()).then((text) => { $('notice').textContent = text; });
$('about-open').addEventListener('click', () => { $('about').hidden = false; $('about-close').focus(); });
$('about-close').addEventListener('click', () => { $('about').hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('about').hidden = true; });
