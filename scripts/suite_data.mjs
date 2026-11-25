// Shared by the Edge suites (ui_features.mjs, ui_phase2.mjs): put the app's saved data and settings
// back to a known start through the app's own API, so a suite can be run again and again without
// deleting files by hand.
//
// It ERASES the saved data and settings of the app at `base`, so it first asks the app (/api/storage)
// whether it was started with throwaway files (GTA6_HQ_SETTINGS and GTA6_HQ_USERDATA set), and
// refuses otherwise.
//
// Saved data: every part is removed (`null` removes a part). Settings can't be removed through the
// API (a value must be text), so every saved setting is set to '' (which the app reads as "not
// chosen": the default), except the few below whose default is not ''.

/** Settings whose default, when none is chosen, is not the empty text. */
const DEFAULTS = { 'map-overlays': 'links' };

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const read = async (url) => {
  const answer = await fetch(url, { cache: 'no-store' });
  if (!answer.ok) throw new Error(`${url} answered ${answer.status}`);
  return answer.json();
};

/**
 * Reset saved data and settings on the app at `base`. With `firstLaunch`, the spoiler notice has not
 * been answered yet (the app asks on its next opening); otherwise it has, with spoilers hidden.
 * Throws if the app refuses or the reset did not take.
 */
export async function resetSaved(base, { firstLaunch = false } = {}) {
  // Never on an app that uses the reader's own files: the app says whether it was started with
  // throwaway files, and anything else (including an older app without /api/storage) is refused.
  const storage = await fetch(`${base}/api/storage`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
  if (storage.throwaway !== true) {
    throw new Error(`refusing to reset ${base}: it is not using throwaway files. Start it with GTA6_HQ_SETTINGS and GTA6_HQ_USERDATA pointing at a temporary folder.`);
  }
  const saved = await read(`${base}/api/userdata`);
  const parts = Object.keys(saved);
  if (parts.length) {
    const answer = await post(`${base}/api/userdata`, Object.fromEntries(parts.map((name) => [name, null])));
    if (!answer.ok) throw new Error(`clearing saved data: ${answer.status} ${await answer.text()}`);
  }
  const settings = await read(`${base}/api/settings`);
  const wanted = Object.fromEntries(Object.keys(settings).map((name) => [name, DEFAULTS[name] ?? '']));
  // The app asks about spoilers until `spoiler-notice` is '1'.
  Object.assign(wanted, { 'spoiler-notice': firstLaunch ? '0' : '1', 'show-spoilers': '0' });
  // The start-up chooser shows until `intro` is set; only a first launch sees it.
  wanted.intro = firstLaunch ? '' : 'classic';
  const answer = await post(`${base}/api/settings`, wanted);
  if (!answer.ok) throw new Error(`resetting settings: ${answer.status} ${await answer.text()}`);

  const after = await read(`${base}/api/userdata`);
  const now = await read(`${base}/api/settings`);
  const wrong = Object.entries(wanted).filter(([name, value]) => now[name] !== value).map(([name]) => name);
  if (Object.keys(after).length || wrong.length) {
    throw new Error(`reset did not take: ${Object.keys(after).length} saved parts left, settings ${wrong.join(', ') || 'fine'}`);
  }
  return { parts: parts.length, settings: Object.keys(wanted).length };
}
