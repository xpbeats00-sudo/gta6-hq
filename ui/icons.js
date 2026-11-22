// GTA 6 HQ: the interface's line icons, one style throughout (24-unit grid, 1.8 stroke).
// icon('star') returns an inline <svg> string; aria-hidden, so the button around it carries the name.
// Loaded before app.js.
(function () {
  const P = {
    star: '<path d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6L3.8 9.5l5.7-.7z"/>',
    'star-fill': '<path class="f" d="M12 3.6l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L12 16.2 6.9 19l1.1-5.6L3.8 9.5l5.7-.7z"/>',
    check: '<path d="M4.5 12.5l4.6 4.5L19.5 6.8"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.6"/><path d="M8 12.3l2.8 2.8 5.3-5.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    route: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
    walk: '<circle cx="12.5" cy="4.6" r="1.9"/><path d="M10.4 21l1.7-6.2 2.6 2.6V21M8 11.2l2.4-3.4 3.3.6 1.8 3.4 2.5 1M12.1 14.8l-.5-4.5"/>',
    book: '<path d="M12 6.6C10 5.3 7.4 4.8 4 5.1v13.2c3.4-.3 6 .2 8 1.5 2-1.3 4.6-1.8 8-1.5V5.1c-3.4-.3-6 .2-8 1.5zM12 6.6v13.2"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="M15.4 15.4l4.8 4.8"/>',
    layers: '<path d="M12 3.5 21 8l-9 4.5L3 8zM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5"/>',
    eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
    bookmark: '<path d="M6.5 3.5h11v17l-5.5-3.8-5.5 3.8z"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2"/>',
    expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
    'chevron-left': '<path d="M14.8 5.5 8.2 12l6.6 6.5"/>',
    'chevron-right': '<path d="M9.2 5.5 15.8 12l-6.6 6.5"/>',
    'chevron-down': '<path d="M6 9.2l6 6 6-6"/>',
    back: '<path d="M10 5.5 3.6 12l6.4 6.5M4 12h16.4"/>',
    next: '<path d="M14 5.5l6.4 6.5-6.4 6.5M20 12H3.6"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    play: '<path class="f" d="M8 5.2v13.6L19 12z"/>',
    map: '<path d="M3.4 6.6 9 4.5l6 2.1 5.6-2.1v13L15 19.6l-6-2.1-5.6 2.1zM9 4.5v13M15 6.6v13"/>',
    note: '<path d="M5 3.5h10l4 4v13H5z"/><path d="M14.5 3.5v4.5H19M8.5 12h7M8.5 15.5h5"/>',
    trash: '<path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6M14 10.5v6"/>',
    pin: '<path d="M12 21.4s-6.4-6-6.4-11a6.4 6.4 0 0 1 12.8 0c0 5-6.4 11-6.4 11z"/><circle cx="12" cy="10.3" r="2.3"/>',
    user: '<circle cx="12" cy="8.3" r="3.8"/><path d="M4.6 20.2c.6-4 3.5-6.4 7.4-6.4s6.8 2.4 7.4 6.4"/>',
    tilt: '<path d="M4 17h16M7 17l3-10h4l3 10"/>',
    gem: '<path d="M7 4h10l4 5.2L12 20.5 3 9.2zM3 9.2h18M9.5 4 8 9.2l4 11.3 4-11.3L14.5 4"/>',
    guide: '<path d="M19 16.6H7a2 2 0 0 0 0 4h12V3.4H7a2 2 0 0 0-2 2v13.2"/><path d="M9 8h6M9 11.5h4"/>',
    compass: '<circle cx="12" cy="12" r="8.6"/><path class="f" d="M12 5.6 14.2 12h-4.4z"/><path d="M12 18.4 9.8 12h4.4z"/>',
    journal: '<path d="M6 3.5h12.5v17H6a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 6 3.5z"/><path d="M8.5 3.5v17M11.5 8h4.5M11.5 11.5h4.5"/>',
    collection: '<path d="M4 7.5h16v12H4zM6.5 4.5h11M9.5 11h5"/>',
    camera: '<path d="M4 7.5h3.2l1.6-2.5h6.4l1.6 2.5H20v11.5H4z"/><circle cx="12" cy="13" r="3.3"/>',
  };
  window.icon = (name, cls = '') => `<svg class="i${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${P[name] || ''}</svg>`;
  window.ICON_NAMES = Object.keys(P);
}());
