// The "artwork unavailable" state for entries that have no picture yet.
// A quiet dark panel with faint line work for the kind of place, and a small
// label. It is deliberately not a substitute illustration: it says, in the
// app's palette, that there is no artwork on file.

(function () {
  function hash(text) {
    let h = 2166136261;
    for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  // Deterministic pseudo-random numbers so each entry always gets the same panel.
  function rng(seed) {
    let s = seed || 1;
    return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296;
  }

  function palm(x, y, scale, flip) {
    return `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">
      <path d="M0 0C-5-32 7-62 2-92"/>
      <path d="M2-92Q32-114 58-84M2-92Q-26-116-54-88M2-92Q28-128 50-120M2-92Q-22-132-46-122M2-92Q6-124 10-138M2-92Q34-100 44-70M2-92Q-30-102-40-72"/>
    </g>`;
  }

  const LINES = {
    city(rand) {
      let x = 20, d = 'M0 240';
      while (x < 400) {
        const w = 18 + rand() * 30, h = 30 + rand() * 110;
        d += `H${x.toFixed(0)}V${(240 - h).toFixed(0)}H${(x + w).toFixed(0)}V240`;
        x += w + 6;
      }
      return `<path d="${d}H400"/>`;
    },
    keys() {
      let pillars = '';
      for (let x = 70; x < 400; x += 40) pillars += `M${x} 204V240`;
      return `<path d="M0 240Q50 200 110 232T230 236Q300 212 400 240M40 204H400${pillars}"/>`;
    },
    swamp(rand) {
      let reeds = '';
      for (let i = 0; i < 30; i++) {
        const x = rand() * 400, h = 16 + rand() * 40;
        reeds += `M${x.toFixed(0)} 244V${(244 - h).toFixed(0)}`;
      }
      return `<path d="M0 232Q40 206 80 222T160 214T250 224T340 208T400 226${reeds}"/>`;
    },
    port() {
      return `<circle cx="300" cy="176" r="54"/><path d="M300 122V230M246 176H354M262 138L338 214M338 138L262 214M278 240L300 176L322 240M0 240H400M20 240V200H170V240"/>`;
    },
    refinery() {
      return `<path d="M0 240H400M40 240V172H160V240M62 172V96H78V172M104 172V116H120V172M200 240V150H220V240M244 240V216A46 30 0 0 1 336 216V240M350 240V188H400"/>`;
    },
    mountain(rand) {
      let pines = '';
      for (let x = 10; x < 400; x += 26) {
        const h = 22 + rand() * 26;
        pines += `M${x} 244L${x + 10} ${(244 - h).toFixed(0)}L${x + 20} 244`;
      }
      return `<path d="M0 236L90 124L150 182L230 88L320 190L360 152L400 204${pines}"/>`;
    },
  };

  /**
   * @param {string} seedText  anything stable, usually the entry's slug
   * @param {string} kind      city | keys | swamp | port | refinery | mountain | portrait
   */
  window.postcard = function postcard(seedText, kind) {
    const rand = rng(hash(seedText));
    const portrait = kind === 'portrait';
    const lines = portrait
      ? `${palm(120, 300, 1.5, false)}${palm(300, 300, 1.2, true)}`
      : `${(LINES[kind] || LINES.city)(rand)}${palm(40, 300, 1.1, false)}`;

    return `<svg class="no-art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" role="img" aria-label="No artwork on file">
      <rect width="400" height="300" fill="#130f22"/>
      <g fill="none" stroke="#dcbeeb" stroke-opacity=".13" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${lines}</g>
      <text x="200" y="${portrait ? 150 : 138}" text-anchor="middle" fill="#82788f" font-family="Bahnschrift, 'Arial Narrow', Arial, sans-serif"
        font-size="11" font-weight="600" letter-spacing="3">NO ARTWORK ON FILE</text>
    </svg>`;
  };
})();
