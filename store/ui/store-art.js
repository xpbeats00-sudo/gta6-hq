// Artwork for the Microsoft Store edition. That edition ships none of the game's pictures or
// clips, so every picture in it is drawn here: the Home scene and one postcard per entry.
// Loaded only in that edition (scripts/package_store.py adds it to the page).

(function () {
  const { LINES, palm, hash, rng } = window.postcardParts;

  // Sky colours, top to horizon, and the tint of the lines drawn over them.
  const SKIES = {
    dusk: ['#24124f', '#8a2f8f', '#f0647a'],
    night: ['#101a48', '#3d2a8c', '#b04bc4'],
    ember: ['#34103f', '#b23266', '#ff9259'],
    reef: ['#0c2540', '#1c6a7c', '#63d1b4'],
  };
  const SKY_FOR = { keys: ['reef'], swamp: ['reef', 'night'], port: ['night', 'dusk'], refinery: ['ember'], mountain: ['night', 'ember'] };
  const SOLID = new Set(['city', 'refinery', 'mountain']);

  window.postcard = function postcard(seedText, kind) {
    const seed = hash(seedText);
    const rand = rng(seed);
    const id = `pc${seed.toString(36)}`;
    const choices = SKY_FOR[kind] || ['dusk', 'ember', 'night'];
    const [top, mid, low] = SKIES[choices[seed % choices.length]];
    const sky = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${top}"/><stop offset=".62" stop-color="${mid}"/><stop offset="1" stop-color="${low}"/>
      </linearGradient></defs><rect width="400" height="300" fill="url(#${id})"/>`;

    if (kind === 'portrait') {
      // People are not drawn. Each gets their initials on their own sky.
      const initials = String(seedText).split(/[^a-z0-9]+/i).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
      return `<svg class="own-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Initials ${initials}">
        ${sky}
        <circle cx="200" cy="150" r="92" fill="#ffd98a" fill-opacity=".16"/>
        <text x="200" y="186" text-anchor="middle" fill="#fff" fill-opacity=".94" font-family="Bahnschrift, 'Arial Narrow', Arial, sans-serif"
          font-size="104" font-weight="700" letter-spacing="6">${initials}</text>
      </svg>`;
    }

    const sunX = 90 + rand() * 220;
    const lines = (LINES[kind] || LINES.city)(rand);
    return `<svg class="own-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${sky}
      <circle cx="${sunX.toFixed(0)}" cy="196" r="58" fill="#ffe2a0" fill-opacity=".85"/>
      <circle cx="${sunX.toFixed(0)}" cy="196" r="96" fill="#ffe2a0" fill-opacity=".12"/>
      <g fill="${SOLID.has(kind) || !LINES[kind] ? '#120a26' : 'none'}" fill-opacity=".78" stroke="#fff" stroke-opacity=".5" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">${lines}</g>
      <rect y="240" width="400" height="60" fill="#120a26" fill-opacity=".78"/>
      <g fill="none" stroke="#0d0818" stroke-width="4.5" stroke-linecap="round">${palm(46, 300, 1.15, false)}</g>
    </svg>`;
  };

  /** A palm in silhouette: a line for the trunk and seven filled leaves from its crown. */
  function tree(x, y, scale, flip) {
    const tips = [[-64, 10], [-54, -20], [-30, -40], [0, -47], [30, -40], [54, -20], [64, 10]];
    const leaves = tips.map(([tx, ty]) => {
      const mx = tx / 2, my = ty / 2;
      return `M2 -92Q${2 + mx} ${-92 + my - 30} ${2 + tx} ${-92 + ty}Q${2 + mx} ${-92 + my - 10} 2 -92Z`;
    }).join('');
    return `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
      <path d="M0 0C-5-32 7-62 2-92" fill="none" stroke="#0b0618" stroke-width="3.4" stroke-linecap="round"/>
      <path d="${leaves}" fill="#0b0618"/>
    </g>`;
  }

  /** The Home scene: a sun setting behind a skyline over water, with palms in front. */
  window.heroScene = function heroScene() {
    const rand = rng(hash('hq-guide-home'));
    const skyline = (base, low, high, step) => {
      let x = -10, d = `M-10 ${base}`;
      while (x < 1610) {
        const w = step * (0.6 + rand() * 0.9), h = low + rand() * (high - low);
        d += `H${x.toFixed(0)}V${(base - h).toFixed(0)}H${(x + w).toFixed(0)}V${base}`;
        x += w + 4 + rand() * 10;
      }
      return `${d}H1610V${base + 4}H-10Z`;
    };
    let stars = '';
    for (let i = 0; i < 70; i++) {
      stars += `<circle class="hs-star" style="animation-delay:-${(rand() * 6).toFixed(1)}s" cx="${(rand() * 1600).toFixed(0)}" cy="${(rand() * 300).toFixed(0)}" r="${(0.6 + rand() * 1.3).toFixed(1)}"/>`;
    }
    let windows = '';
    for (let i = 0; i < 90; i++) {
      windows += `<rect class="hs-window" style="animation-delay:-${(rand() * 9).toFixed(1)}s" x="${(rand() * 1600).toFixed(0)}" y="${(520 + rand() * 76).toFixed(0)}" width="3" height="4"/>`;
    }
    let slats = '';
    for (let i = 0; i < 7; i++) slats += `<rect x="760" y="${520 + i * 26 + i * i * 0.9}" width="600" height="${5 + i * 2.2}"/>`;
    let glints = '';
    for (let i = 0; i < 26; i++) {
      const y = 612 + i * 10.5, w = 60 + rand() * 260 * (1 - i / 40);
      glints += `<rect class="hs-glint" style="animation-delay:-${(rand() * 5).toFixed(1)}s" x="${(1060 - w / 2 + (rand() - 0.5) * 70).toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(2 + i * 0.16).toFixed(1)}" rx="1.5"/>`;
    }
    return `<svg class="hero-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#150c33"/><stop offset=".3" stop-color="#3f1a6b"/><stop offset=".52" stop-color="#b3327f"/>
          <stop offset=".64" stop-color="#ff7d5e"/><stop offset=".68" stop-color="#ffc46b"/>
        </linearGradient>
        <linearGradient id="hs-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".55" stop-color="#ff9f5a"/><stop offset="1" stop-color="#ee3f7c"/></linearGradient>
        <linearGradient id="hs-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a2a78"/><stop offset=".35" stop-color="#3a1763"/><stop offset="1" stop-color="#0f0921"/></linearGradient>
        <radialGradient id="hs-glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".55"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
        <mask id="hs-slats"><rect width="1600" height="900" fill="#fff"/><g fill="#000">${slats}</g></mask>
      </defs>
      <rect width="1600" height="900" fill="url(#hs-sky)"/>
      <g fill="#fff">${stars}</g>
      <circle class="hs-glow" cx="1060" cy="520" r="430" fill="url(#hs-glow)"/>
      <circle cx="1060" cy="500" r="200" fill="url(#hs-sun)" mask="url(#hs-slats)"/>
      <g class="hs-cloud" fill="#fff" fill-opacity=".1"><rect x="180" y="250" width="420" height="10" rx="5"/><rect x="260" y="272" width="300" height="7" rx="3.5"/><rect x="1180" y="190" width="360" height="9" rx="4.5"/></g>
      <path d="${skyline(600, 26, 120, 34)}" fill="#5a2476" fill-opacity=".75"/>
      <path d="${skyline(600, 14, 78, 26)}" fill="#1c0f3a"/>
      <g fill="#ffd27a">${windows}</g>
      <rect y="600" width="1600" height="300" fill="url(#hs-sea)"/>
      <g fill="#ffb37a">${glints}</g>
      <g class="hs-palm" style="transform-origin: 1390px 900px">${tree(1390, 930, 4.2, false)}</g>
      <g class="hs-palm hs-palm-b" style="transform-origin: 1540px 900px">${tree(1540, 950, 3.2, true)}</g>
      <g class="hs-palm hs-palm-c" style="transform-origin: 1250px 900px">${tree(1250, 930, 2.3, true)}</g>
    </svg>`;
  };
})();
