// GTA 6 HQ: the "More" pages, laid out like the encyclopedia.
//   #/more        every tool and page in More, as picture tiles in groups (the encyclopedia's index)
//   #/compare     vehicles side by side, and the fastest and best by stat or class
//   #/strangers   Strangers and Freaks, side and optional missions, by who gives them
//   #/properties  garages and other places you can own or stay in, cheapest first
//   #/icons       the game's HUD, map, vehicle and weapon icons and what each means
// The top bar's More menu is drawn from the same list, with the same pictures, so the two always match.
(() => {
  const img = (src) => (STORE ? '' : src);
  const vehicleArt = () => (state.wiki.vehicles || []).find((e) => e.facts?.menu_picture && !isHidden('vehicles', e))?.facts.menu_picture;
  const MORE = [
    { title: 'Browse', items: [
      { route: 'characters', label: 'Characters', blurb: 'Jason, Lucia and everyone around them.', art: '/images/manual/jason-and-lucia-waterfront.jpg' },
      { route: 'locations', label: 'Locations', blurb: 'Counties, towns and districts of Leonida.', art: '/images/artwork/vice-city-skyline-night.webp' },
      { route: 'vehicles', label: 'Vehicles', blurb: 'Every car, bike, boat and aircraft.', art: '/images/artwork/car-meet-selfie.webp' },
      { route: 'wiki/businesses', label: 'Businesses', blurb: 'Shops, bars and services you can visit.', art: '/images/artwork/rusty-anchor-bar.webp' },
      { route: 'wiki/activities', label: 'Activities', blurb: 'Side activities, minigames and hobbies.', art: '/images/artwork/hilltop-sunset.webp' },
    ] },
    { title: 'Game menus', items: [
      { route: 'garage', label: 'Garage', blurb: 'Vehicles with the game\'s menu art and stat bars.', art: vehicleArt },
      { route: 'compare', label: 'Compare Vehicles', blurb: 'Up to three side by side, and the best of each class.', art: '/images/artwork/jason-lucia-convertible-night.webp' },
      { route: 'arsenal', label: 'Weapon Locker', blurb: 'Every weapon with its stats and attachments.', art: '/images/weapons/menu/duke-556.jpg' },
      { route: 'cards', label: 'Card Collections', blurb: 'All 18 card sets, card by card.', art: '/images/ui/menu-collections.jpg' },
      { route: 'trophies', label: 'Trophy Guides', blurb: 'Each trophy as a step-by-step guide.', art: '/images/artwork/dancer-money.webp' },
      { route: 'cheats', label: 'Cheats', blurb: 'Codes for PlayStation and Xbox, and the rules.', art: '/images/artwork/jason-motorbike-police.webp' },
    ] },
    { title: 'Story and places', items: [
      { route: 'strangers', label: 'Strangers and Freaks', blurb: 'Side and stranger missions by who gives them.', art: '/images/artwork/trap-house-crew.webp' },
      { route: 'properties', label: 'Properties', blurb: 'Garages, motels and safehouses, cheapest first.', art: '/images/artwork/brian-heder-boat-yard.webp' },
      { route: 'intel', label: 'Intel', blurb: 'News, editions and answers.', art: '/images/artwork/raul-bautista-duffel.webp' },
      { route: 'media', label: 'Media', blurb: 'Trailers, screenshots and wallpapers.', art: '/images/artwork/club-vip.webp' },
    ] },
    { title: 'Track your game', items: [
      { route: 'tracker', label: 'Collectible Tracker', blurb: 'Tick off every collectible, family by family.', art: '/images/collectibles/card-set-vice-city-flamingos.jpg' },
      { route: 'hundred', label: '100% Checklist', blurb: 'Everything the game counts toward 100%.', art: '/images/artwork/real-dimez-ocean-view.webp' },
      { route: 'progress', label: 'Progress', blurb: 'Your counts across the whole app.', art: '/images/artwork/jason-lucia-gas-station.webp' },
      { route: 'journal', label: 'Discovery Journal', blurb: 'Notes and finds, as you play.', art: '/images/artwork/dog-and-owner.webp' },
    ] },
    { title: 'Help and settings', items: [
      { route: 'icons', label: 'Icons Explained', blurb: 'What every HUD, map and vehicle icon means.', art: '/images/map-icons/safehouse.webp', icon: true },
      { route: 'controls', label: 'Controls', blurb: 'A real DualSense or Xbox pad, button by button.', art: '/images/ui/menu-palms.webp' },
      { route: 'help', label: 'Help', blurb: 'How the app works and where things are.', art: '/images/artwork/hilltop-sunset.webp' },
      { route: 'settings', label: 'Settings', blurb: 'Look, sound, spoilers and data.', art: '/images/ui/menu-palms.webp' },
    ] },
  ];
  window.MORE_GROUPS = MORE;
  const artOf = (it) => img(typeof it.art === 'function' ? it.art() : it.art);
  const MORE_ROUTES = new Set(MORE.flatMap((g) => g.items.map((it) => it.route)).filter((r) => !/^(characters|locations|vehicles|wiki\/)/.test(r)));

  // ---------- #/more: the hub ----------
  EXTRA_PAGES.more = function renderMore() {
    view.innerHTML = `${pageHead('More', 'Game menus, trackers, story extras and help, laid out like the encyclopedia.')}
      ${MORE.map((g) => `<section class="block hub-group"><h2 class="hub-title">${esc(g.title)}</h2><div class="index">
        ${g.items.map((it) => {
          const art = artOf(it);
          return `<a class="topic" href="#/${it.route}"><div class="topic-media${it.icon ? ' topic-media-icon' : ''}">${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : postcard(it.route, 'city')}</div>
            <h3>${esc(it.label)}</h3><p>${esc(it.blurb)}</p></a>`;
        }).join('')}</div></section>`).join('')}`;
  };

  // ---------- the More menu in the top bar: the same groups, with the same pictures ----------
  function drawMenu() {
    const menu = document.getElementById('nav-more-menu');
    if (!menu) return;
    menu.classList.add('is-mega');
    menu.innerHTML = `<a class="mega-all" href="#/more" data-route="more">All of More <span aria-hidden="true">→</span></a>
      ${MORE.map((g) => `<div class="mega-col"><div class="menu-group" aria-hidden="true">${esc(g.title)}</div>
        ${g.items.map((it) => {
          const art = artOf(it);
          return `<a href="#/${it.route}" data-route="${esc(it.route)}">${art ? `<img class="mega-thumb${it.icon ? ' is-icon' : ''}" src="${esc(art)}" alt="" loading="lazy">` : '<span class="mega-thumb" aria-hidden="true"></span>'}<span>${esc(it.label)}</span></a>`;
        }).join('')}</div>`).join('')}`;
  }
  // The data (and with it the Garage's picture) arrives after start-up, so the menu is drawn on each page.
  let drawnFor = null;
  AFTER_RENDER.unshift(() => { if (drawnFor !== state.wiki) { drawMenu(); drawnFor = state.wiki; } });

  // Every More page starts with the way back, as encyclopedia pages do.
  AFTER_RENDER.push((page) => {
    if (!MORE_ROUTES.has(page) || view.querySelector('.back-more')) return;
    const back = document.createElement('a');
    back.href = '#/more';
    back.innerHTML = `${icon('back')}More`;
    // Inside the page's title block, where the encyclopedia puts its own way back; over a game menu's top otherwise.
    const head = view.querySelector('.page-head-text') || view.querySelector('.gm-head');
    back.className = `back back-more${view.querySelector('.gm-head') ? ' back-on-menu' : ''}`;
    if (head) head.prepend(back); else view.prepend(back);
  });

  // ---------- #/compare: vehicles side by side, and the best of each ----------
  const STATS = [['speed', 'Speed'], ['acceleration', 'Acceleration'], ['asphalt_handling', 'Asphalt handling'], ['offroad_handling', 'Off-road handling'], ['strength', 'Strength']];
  const num = (v) => (typeof v === 'number' ? v : NaN);
  const statted = () => (state.wiki.vehicles || []).filter((e) => STATS.every(([k]) => Number.isFinite(num(e.facts?.[k]))) && !isHidden('vehicles', e));
  const total = (e) => STATS.reduce((s, [k]) => s + e.facts[k], 0);
  const classOf = (e) => (window.vClass ? window.vClass(e) : String(e.facts?.class || '')) || 'Other';

  EXTRA_PAGES.compare = function renderCompare(a, b, params) {
    const all = statted().sort((x, y) => x.name.localeCompare(y.name));
    const bySlug = new Map(all.map((e) => [e.slug, e]));
    let picked = (params?.get('v') || UserStore.get('compare-vehicles', []).join(',')).split(',').filter((s) => bySlug.has(s)).slice(0, 3);
    const classes = [...new Set(all.map(classOf))].sort();
    view.innerHTML = `<div class="compare-page">${pageHead('Compare Vehicles', `${all.length} vehicles have the game's five stat bars. Pick up to three to set side by side, or see the best by stat and class.`)}
      <section class="block compare">
        <div class="compare-pick">
          <div class="field-search">${icon('search')}<input list="compare-list" class="compare-input" placeholder="Add a vehicle by name" aria-label="Add a vehicle to compare"></div>
          <datalist id="compare-list">${all.map((e) => `<option value="${esc(e.name)}">`).join('')}</datalist>
          <button type="button" class="btn btn-small compare-clear">Clear</button>
        </div>
        <div class="compare-table"></div>
      </section>
      <section class="block"><div class="block-head"><h2>Best of</h2>
        <label class="list-sort"><span>Stat</span> <select class="best-stat">${[['total', 'All five stats together'], ...STATS].map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
        <label class="list-sort"><span>Class</span> <select class="best-class"><option value="">Every class</option>${classes.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label></div>
        <ol class="best-list"></ol></section></div>`;
    const save = () => { UserStore.set('compare-vehicles', picked); history.replaceState(null, '', `#/compare${picked.length ? `?v=${picked.join(',')}` : ''}`); };
    const drawTable = () => {
      const box = view.querySelector('.compare-table');
      if (!picked.length) { box.innerHTML = '<p class="muted">Nothing picked yet. Add a vehicle above, or press Compare on any vehicle in the Best of list.</p>'; return; }
      const cars = picked.map((s) => bySlug.get(s));
      const best = Object.fromEntries(STATS.map(([k]) => [k, Math.max(...cars.map((c) => c.facts[k]))]));
      box.innerHTML = `<div class="compare-grid" style="--n:${cars.length}">
        ${cars.map((c) => `<article class="compare-car">
          <div class="compare-art">${picture(c, 'port', 'vehicles')}</div>
          <h3><a href="${entryLink('vehicles', c.slug)}">${esc(c.name)}</a></h3>
          <p class="muted">${esc(classOf(c))}${c.facts.price ? ` · ${esc(String(c.facts.price).split(' (')[0])}` : ''}</p>
          ${STATS.map(([k, l]) => `<div class="compare-stat${c.facts[k] === best[k] && cars.length > 1 ? ' is-best' : ''}"><span>${esc(l)}</span><b>${c.facts[k].toFixed(1)}</b><i style="--v:${c.facts[k] * 10}%"></i></div>`).join('')}
          <div class="compare-stat compare-total"><span>All five</span><b>${total(c).toFixed(1)}</b></div>
          <button type="button" class="chip-btn" data-drop="${esc(c.slug)}">Remove</button>
        </article>`).join('')}</div>`;
    };
    const drawBest = () => {
      const stat = view.querySelector('.best-stat').value;
      const cls = view.querySelector('.best-class').value;
      const score = (e) => (stat === 'total' ? total(e) : e.facts[stat]);
      const list = all.filter((e) => !cls || classOf(e) === cls).sort((x, y) => score(y) - score(x)).slice(0, 15);
      view.querySelector('.best-list').innerHTML = list.map((e) => `<li><a href="${entryLink('vehicles', e.slug)}">${esc(e.name)}</a>
        <span class="muted">${esc(classOf(e))}</span><b>${score(e).toFixed(1)}</b>
        <button type="button" class="chip-btn" data-add="${esc(e.slug)}"${picked.includes(e.slug) || picked.length >= 3 ? ' disabled' : ''}>Compare</button></li>`).join('');
    };
    const redraw = () => { drawTable(); drawBest(); };
    redraw();
    view.querySelector('.compare-input').addEventListener('change', (e) => {
      const hit = all.find((v) => v.name.toLowerCase() === e.target.value.trim().toLowerCase());
      if (hit && !picked.includes(hit.slug) && picked.length < 3) { picked.push(hit.slug); save(); redraw(); }
      e.target.value = '';
    });
    view.querySelector('.compare-clear').addEventListener('click', () => { picked = []; save(); redraw(); });
    view.querySelector('.best-stat').addEventListener('change', drawBest);
    view.querySelector('.best-class').addEventListener('change', drawBest);
    // The page's own wrapper takes the clicks, so nothing is left listening once the page is gone.
    view.querySelector('.compare-page').addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      const drop = e.target.closest('[data-drop]');
      if (add && picked.length < 3 && !picked.includes(add.dataset.add)) { picked.push(add.dataset.add); save(); redraw(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (drop) { picked = picked.filter((s) => s !== drop.dataset.drop); save(); redraw(); }
    });
  };

  // ---------- #/strangers: Strangers and Freaks and the other side missions ----------
  // Drawn like the Trophies screen: tabs for the three kinds, the missions listed under who gives
  // them, and the chosen one's picture, summary and step-by-step walkthrough beside the list.
  EXTRA_PAGES.strangers = function renderStrangers(slug) {
    const ms = (state.wiki.missions || []).filter((e) => /^(stranger|side|optional) mission$/i.test(e.facts?.type || ''));
    const kinds = [['Stranger mission', 'Strangers and Freaks'], ['Side mission', 'Side missions'], ['Optional mission', 'Optional missions']]
      .filter(([type]) => ms.some((e) => String(e.facts?.type).toLowerCase() === type.toLowerCase()));
    const giverOf = (e) => String(e.facts?.giver || 'Giver not yet known').split(/[;,(]/)[0].trim();
    const byGiver = (x, y) => (giverOf(x).startsWith('Giver not') - giverOf(y).startsWith('Giver not')) || giverOf(x).localeCompare(giverOf(y)) || x.name.localeCompare(y.name, 'en', { numeric: true });
    const lists = kinds.map(([type]) => ms.filter((e) => String(e.facts?.type).toLowerCase() === type.toLowerCase()).sort(byGiver));
    // A link to one mission opens on its tab.
    const startTab = Math.max(0, lists.findIndex((list) => list.some((e) => e.slug === slug)));
    view.innerHTML = ResearchTools.shell({ crumbs: ['Progress', 'Strangers and Freaks'], tabs: kinds.map(([, title]) => title), active: startTab,
      body: '<p class="gm-summary"></p><div class="gm-pane"></div>' });
    const root = view.querySelector('.gm');
    const pane = root.querySelector('.gm-pane');
    let shown = lists[startTab] || [];
    const esc2 = esc;
    const rows = () => shown.map((e) => ({ html: isHidden('missions', e) ? `<span class="gm-row-giver">${esc2(giverOf(e))}</span>Spoiler: open it to read` : `<span class="gm-row-giver">${esc2(giverOf(e))}</span>${esc2(e.name)}`, locked: isHidden('missions', e) }));
    const detail = (i) => {
      const e = shown[i];
      const inner = `${e.image ? `<div class="gm-wiki-pic"><img src="${esc2(e.image)}" alt="" loading="lazy"></div>` : ''}
        <h2 class="gm-title">${esc2(e.name)}</h2>
        <p class="gm-tags"><span>${esc2(giverOf(e))}</span>${e.facts?.chapter ? `<span>${esc2(String(e.facts.chapter).replace(/^(?!chapter)/i, 'Chapter '))}</span>` : ''}${e.facts?.region ? `<span>${esc2(e.facts.region)}</span>` : ''}</p>
        <p>${esc2(e.summary || '')}</p>
        ${missionStepsSlot(e)}
        <p class="gm-wiki-actions"><a class="gm-open" href="${entryLink('missions', e.slug)}">Open entry <kbd class="gm-key">Enter</kbd></a></p>`;
      return isHidden('missions', e) ? veil('missions', e, inner) : inner;
    };
    const summary = () => { root.querySelector('.gm-summary').textContent = `${shown.length} of ${ms.length} side, stranger and optional missions, listed by who gives them.`; };
    const show = (t) => {
      shown = lists[t] || [];
      let first = true;
      const start = slug && first ? Math.max(0, shown.findIndex((e) => e.slug === slug)) : 0;
      const ld = ResearchTools.listDetail(pane, rows(), detail, start, (i) => {
        fillMissionSteps(pane);
        if (first) { first = false; return; }
        const s = shown[i]?.slug;
        if (s && location.hash !== `#/strangers/${s}`) history.replaceState(null, '', `#/strangers/${s}`);
      });
      const list = pane.querySelector('.gm-list');
      const open = () => { const e = shown[ld.selected]; if (e) location.hash = entryLink('missions', e.slug); };
      list.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); open(); } });
      list.addEventListener('dblclick', open);
      summary();
    };
    ResearchTools.wireTabs(root, kinds.length, show);
    show(startTab);
  };

  // ---------- #/properties: what you can own or stay in ----------
  EXTRA_PAGES.properties = function renderProperties() {
    const priceOf = (e) => {
      const m = /\$([\d,]+)/.exec(`${e.facts?.price || ''} ${e.summary || ''}`);
      return m ? Number(m[1].replace(/,/g, '')) : Infinity;
    };
    const own = (state.wiki.businesses || []).filter((e) => /^(garage|motel|inn)$/i.test(String(e.facts?.type || '')) || /real estate/i.test(e.name));
    const safehouses = (state.wiki.map?.markers || []).filter((m) => m.kind === 'Safehouses');
    own.sort((x, y) => priceOf(x) - priceOf(y) || x.name.localeCompare(y.name));
    view.innerHTML = `${pageHead('Properties', 'Garages you can buy, places to stay, and the safehouses the story gives you. Cheapest first.')}
      <section class="block"><div class="block-head"><h2>To buy or rent <span class="muted">${own.length}</span></h2></div>
        <div class="grid grid-3">${own.map((e) => card('businesses', e, priceOf(e) < Infinity ? `$${priceOf(e).toLocaleString('en-US')}` : String(e.facts?.type || ''))).join('')}</div></section>
      <section class="block"><div class="block-head"><h2>Safehouses <span class="muted">${safehouses.length}</span></h2></div>
        <ul class="prop-list">${safehouses.map((m) => `<li><img src="/images/map-icons/safehouse.webp" alt=""><span>${esc(m.spoiler && !showSpoilers ? 'Spoiler' : m.name)}</span>
          <a class="chip-btn" href="#/map?focus=${encodeURIComponent(m.name)}">Map</a></li>`).join('')}</ul></section>`;
  };

  // ---------- #/icons: Icons explained ----------
  // Pictures: the game's icons as GTABase cut them out (images/ui/hud, images/map-icons). Meanings in our words.
  const H = (f) => `/images/ui/hud/${f}.png`;
  const ICONS = [
    ['Health, stamina and focus', [
      [H('health'), 'Health', 'How much damage you can take.'], [H('health-buff'), 'Health boost', 'Extra health for a while, from food or drink.'],
      [H('stamina'), 'Stamina', 'Used up by sprinting, swimming and fighting.'], [H('stamina-buff'), 'Stamina boost', 'Extra stamina for a while.'],
      [H('focus'), 'Focus', 'Slows aim time in combat; drains while in use.'], [H('focus-buff'), 'Focus boost', 'Extra Focus for a while.'],
      [H('adrenaline'), 'Adrenaline', 'Every stat maxed for a short burst.'], [H('pocket-cash'), 'Pocket cash', 'Cash on you. You lose it if wasted or busted.']]],
    ['Wanted and heat', [
      [H('wanted-stars-flashing'), 'Cops responding', 'A crime was reported; police are on the way. The same flashing stars show while they search after losing sight of you.'],
      [H('wanted-stars-hollow'), 'Suspect unknown', 'The police do not yet know who you are.'], [H('wanted-stars-white'), 'In pursuit', 'The police can see you and know who you are.'],
      [H('wanted-stars-red'), 'Heat', 'You got away, but the area is still being watched.'], [H('wanted-heat-suspect-unknown'), 'Heat, suspect unknown', 'The area is watched, but nobody has your description.'],
      [H('recog-cloud-cctv'), 'Cloud CCTV', 'Footage you cannot destroy: an alarm will follow.'], [H('arrow-hidden'), 'Hidden', 'Your map arrow when the police cannot see you.'],
      [H('arrow-known'), 'Location known', 'Your map arrow when the police know where you are.']]],
    ['Criminal profile', [
      [H('profile-professional'), 'Professional', 'Clean jobs with little force.'], [H('profile-hardened'), 'Hardened', 'You use force and kill enemies.'],
      [H('profile-violent'), 'Violent', 'You attack police and bystanders.'], [H('profile-psycho'), 'Psycho', 'Extreme violence.'],
      [H('profile-breaking-point'), 'Breaking point', 'The last warning before Irredeemable.'], [H('profile-irredeemable'), 'Irredeemable', 'Permanent once reached.']]],
    ['Jason and Lucia', [
      [H('rel-hot-together'), 'Hot Together', 'The best of the four relationship levels.'], [H('rel-crazy-in-love'), 'Crazy in Love', 'The second level.'],
      [H('rel-not-so-hot'), 'Not So Hot', 'Things are cooling off.'], [H('rel-running-on-empty'), 'Running on Empty', 'The lowest level.'],
      [H('relationship-up'), 'Relationship up', 'Something you did helped.'], [H('relationship-down'), 'Relationship down', 'Your partner was neglected or treated badly.']]],
    ['Vehicles', [
      [H('personal-vehicle'), 'Personal vehicle', 'Your registered car; you can always get it back.'], [H('unowned-vehicle'), 'Unowned vehicle', 'Any other car; gone if it is destroyed.'],
      [H('standout-vehicle'), 'Standout vehicle', 'A car with unique parts.'], [H('vehicle-destroyed'), 'Destroyed', 'It will not drive; call for your personal vehicle.'],
      [H('vehicle-impounded'), 'Impounded', 'The police took it after you were wasted or busted.'], [H('vehicle-stash'), 'Stash in the trunk', 'Loot is stored in the trunk.'],
      [H('vehicle-locked'), 'Locked', 'Break in and hotwire it.'], [H('vehicle-keyless'), 'Keyless', 'You need a key cloner.'], [H('vehicle-alarm'), 'Alarm', 'Breaking a window may set it off.'],
      [H('tracker-standard'), 'Standard tracker', 'It cannot be modified until registered.'], [H('tracker-advanced'), 'Advanced tracker', 'It reports you to the police unless you drive fast.'],
      [H('engine-good'), 'Engine fine', 'No engine damage.'], [H('engine-moderate'), 'Engine damaged', 'Get it repaired soon.'], [H('engine-critical'), 'Engine critical', 'It is about to fail.'],
      [H('engine-destroyed'), 'Engine destroyed', 'It cannot be driven.'], [H('fuel-gas-high'), 'Fuel or charge high', 'Plenty left.'], [H('fuel-gas-low'), 'Fuel or charge low', 'Fill up or charge soon.'],
      [H('fuel-gas-empty'), 'Fuel or charge empty', 'Refuel at a gas station or charge at a charger.']]],
    ['Weapons', [
      [H('weapon-owned'), 'Owned weapon', 'Bought at Ammu-Nation; Jason and Lucia share it.'], [H('weapon-unowned'), 'Unowned weapon', 'Picked up; it cannot be modified.'],
      [H('weapon-unique'), 'Unique variant', 'A one-off weapon, unlocked for both.'], [H('attach-grip'), 'Grip', 'An attachment slot.'], [H('attach-magazine'), 'Magazine', 'An attachment slot.'],
      [H('attach-optic'), 'Optic', 'An attachment slot.']]],
    ['Phone apps', [
      [H('app-reminders'), 'Reminders', 'Missed calls and notifications.'], [H('app-contacts'), 'Contacts', 'Call people, a taxi or Joey.'], [H('app-waink'), 'WAiNK', 'Scan vehicles and finds.'],
      [H('rydeme'), 'RydeMe', 'Book a ride.'], [H('app-fitness'), 'Fitness', 'Workouts and body shape.'], [H('app-buckme'), 'BuckMe', 'Banking.']]],
    ['On the map', [
      [H('destination'), 'Destination', 'Your waypoint.'], [H('new'), 'New', 'Just discovered.'], [H('safehouse'), 'Safehouse', 'Sleep, shower and change.'],
      [H('wardrobe'), 'Wardrobe', 'Change and save outfits.'], [H('gym'), 'Gym', 'Strength and cardio.'], [H('grocery'), 'Grocery store', 'Food and drink.'],
      [H('ammunation'), 'Ammu-Nation', 'Weapons, armor and mods.'], [H('weapon-locker'), 'Weapon locker', 'Get owned weapons back and set your loadout.'],
      [H('clothing-store'), 'Clothing store', 'Stock differs for Jason and Lucia.'], [H('electronics-store'), 'Electronics store', 'Headphones and gear.'],
      [H('barber'), 'Salon or barber', 'Change your hair.'], [H('atm'), 'ATM', 'Deposit cash.'], [H('paynspray'), 'Pay \'n\' Spray', 'Repair, respray and register cars.'],
      [H('modshop-car'), 'Mod shop', 'Repairs and upgrades.'], [H('modshop-bike'), 'Bike mod shop', 'For motorcycles.'], [H('modshop-specialty'), 'Specialty mod shop', 'Specialises in one kind of vehicle.'],
      [H('gas-station'), 'Gas station', 'Fuel and small repairs.'], [H('ev-charging'), 'Charging station', 'Charge electric vehicles.'],
      [H('shooting-range'), 'Shooting range', 'Trains Focus.'], [H('golf'), 'Golf', 'Putting trains Focus.'], [H('pool'), 'Pool', 'Trains Focus.'], [H('fishing'), 'Fishing', 'Trains Focus.'],
      [H('cctv'), 'CCTV camera', 'Records crimes; the police can use the footage to find you.']]],
  ];
  EXTRA_PAGES.icons = function renderIcons() {
    view.innerHTML = `${pageHead('Icons Explained', 'What the icons on the HUD, the map, your phone and your vehicles mean.')}
      ${STORE ? '<p class="block muted">The Store edition carries none of the game\'s pictures, so the icons are not shown here.</p>' : ''}
      ${ICONS.map(([title, rows]) => `<section class="block"><div class="block-head"><h2>${esc(title)}</h2></div>
        <ul class="icon-list">${rows.map(([src, name, means]) => `<li>${STORE ? '' : `<img src="${esc(src)}" alt="" loading="lazy">`}<b>${esc(name)}</b><span>${esc(means)}</span></li>`).join('')}</ul></section>`).join('')}
      <p class="block muted">Icon pictures: the game's own icons, Rockstar Games, as cut out by GTABase. Map pins drawn with Material Symbols (Apache 2.0) and game-icons.net (CC BY 3.0) symbols.</p>`;
  };
})();
