// Syncs the band's published Google Sheet (CSV) into data/events.json.
// Run by .github/workflows/sync-events.yml daily, or manually: node scripts/sync-events.mjs
// Requires env SHEET_CSV_URL (the "Publish to web → CSV" link). Exits quietly if unset.

import { readFileSync, writeFileSync } from 'node:fs';

const URL = process.env.SHEET_CSV_URL || '';
if (!URL) {
  console.log('SHEET_CSV_URL not set — nothing to sync.');
  process.exit(0);
}

function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (cur !== '' || row.length) { row.push(cur); rows.push(row); row = []; cur = ''; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const head = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).filter(r => r.some(v => v.trim() !== '')).map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

const res = await fetch(URL, { redirect: 'follow' });
if (!res.ok) {
  console.error('Sheet fetch failed: HTTP ' + res.status + ' — keeping existing events.json');
  process.exit(1);
}
const rows = parseCsv(await res.text());

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const events = rows
  .map(r => ({
    date: r.date || '',
    start: r.start || '',
    end: r.end || '',
    venue: r.venue || '',
    city: r.city || '',
    state: r.state || '',
    lineup: r.lineup || '',
    fbEvent: r.fbevent || r.fb_event || '',
    ticketUrl: r.ticketurl || r.ticket_url || '',
    notes: r.notes || ''
  }))
  .filter(e => DATE_RE.test(e.date) && e.venue);

if (!events.length) {
  console.error('Sheet parsed to zero valid events — refusing to overwrite events.json (check date format YYYY-MM-DD and the header row).');
  process.exit(1);
}

const out = {
  _comment: 'AUTO-SYNCED from the band\'s Google Sheet by scripts/sync-events.mjs — edit the Sheet, not this file. Serves as the site\'s fallback if the live Sheet fetch fails.',
  _syncedFrom: 'google-sheet',
  events
};

const path = new globalThis.URL('../data/events.json', import.meta.url).pathname;
const next = JSON.stringify(out, null, 2) + '\n';
let prev = '';
try { prev = readFileSync(path, 'utf8'); } catch {}
// Compare events only, so the _synced timestamp-free diff stays quiet when nothing changed
if (prev) {
  try {
    const a = JSON.stringify(JSON.parse(prev).events);
    if (a === JSON.stringify(events)) {
      console.log('No changes — events.json already matches the Sheet (' + events.length + ' events).');
      process.exit(0);
    }
  } catch {}
}
writeFileSync(path, next);
console.log('Wrote data/events.json with ' + events.length + ' events from the Sheet.');
