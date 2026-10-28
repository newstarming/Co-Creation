/**
 * The Steam build's Workshop link, through steamworks.js, which only that build carries (scripts/pack.ts).
 *
 * Steam keeps each subscribed Workshop item in its own folder, `steamapps/workshop/content/<app id>/<item id>/`,
 * in the Steam library the app is installed in. A figure pack is published with its figure.json at the item's
 * root, so that content folder is a pack root: each item in it is one pack, picked up by the desktop-pet
 * World's next scan of its packs. At start, subscribed items that are missing or out of date are asked for;
 * Steam downloads them, and any item subscribed while the app runs, into that folder.
 *
 * When Steam cannot be reached (the app started outside Steam), only the items already on disk load.
 * What happened is written to `steam.log` in the logs directory.
 */
const { appendFileSync, mkdirSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

/** ISteamUGC item state flags (EItemState). */
const INSTALLED = 4;
const NEEDS_UPDATE = 8;

/** The folders holding this app's Workshop items, for `packRoots`. */
function workshopPackRoots(appId, logDir) {
  const roots = new Map();
  const add = (dir) => {
    const full = resolve(dir);
    roots.set(process.platform === 'win32' ? full.toLowerCase() : full, full);
  };
  // <library>/steamapps/common/<install dir>/<exe>
  add(join(dirname(process.execPath), '..', '..', 'workshop', 'content', String(appId)));
  let line;
  try {
    const { workshop } = require('steamworks.js').init(appId);
    const items = workshop.getSubscribedItems();
    let asked = 0;
    for (const id of items) {
      const state = workshop.state(id);
      if (!(state & INSTALLED) || state & NEEDS_UPDATE) asked += workshop.download(id, true) ? 1 : 0;
      const info = workshop.installInfo(id);
      if (info) add(dirname(info.folder));
    }
    line = `${items.length} subscribed Workshop items, ${asked} asked for download`;
  } catch (err) {
    line = `Steam not reached: ${String(err?.message ?? err).split('\n')[0]}`;
  }
  mkdirSync(logDir, { recursive: true });
  appendFileSync(join(logDir, 'steam.log'), `${new Date().toISOString()} ${line}; pack roots: ${[...roots.values()].join(', ')}\n`);
  return [...roots.values()];
}

module.exports = { workshopPackRoots };
