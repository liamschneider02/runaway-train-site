/* ============================================================
   Runaway Train — site.js
   Shows loader (events.json → optional Google Sheet override),
   ICS calendar downloads, MusicEvent JSON-LD, nav, mobile bar.
   ============================================================ */

const SITE = {
  name: 'Runaway Train',
  domain: 'https://runawaytrain.band',

  // OPTION A (active): band edits data/events.json in the repo.
  eventsUrl: '/data/events.json',

  // OPTION B: Google Sheet. Publish the sheet to the web as CSV
  // (File → Share → Publish to web → CSV) and paste the URL here.
  // Columns (row 1 headers): date, start, end, venue, city, state,
  // lineup, fbEvent, ticketUrl, notes  — date as YYYY-MM-DD, times 24h HH:MM.
  // When set, the Sheet REPLACES events.json.
  sheetCsvUrl: '',

  // OPTION C: Bandsintown. Set the artist name registered on
  // Bandsintown for Artists and the shows page will render their
  // public event feed instead (falls back to A/B on failure).
  bandsintownArtist: ''
};

/* ---------------- date helpers ---------------- */
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseLocal(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
function fmtTime(t) {
  if (!t) return '';
  let [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h}:00 ${ap}`;
}
function icsStamp(dateStr, timeStr) {
  return dateStr.replace(/-/g, '') + 'T' + (timeStr || '00:00').replace(':', '') + '00';
}

/* ---------------- data sources ---------------- */
function parseCsv(text) {
  // small CSV parser (handles quoted fields)
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
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).filter(r => r.some(v => v.trim() !== '')).map(r => {
    const o = {};
    head.forEach((h, i) => { o[h] = (r[i] || '').trim(); });
    return o;
  });
}

function normalizeSheetRow(r) {
  return {
    date: r.date, start: r.start, end: r.end,
    venue: r.venue, city: r.city || '', state: r.state || '',
    lineup: r.lineup || '', fbEvent: r.fbevent || r.fb_event || '',
    ticketUrl: r.ticketurl || r.ticket_url || '', notes: r.notes || ''
  };
}

async function loadEvents() {
  // Sheet override
  if (SITE.sheetCsvUrl) {
    try {
      const res = await fetch(SITE.sheetCsvUrl, { cache: 'no-store' });
      if (res.ok) {
        const rows = parseCsv(await res.text()).map(normalizeSheetRow).filter(e => e.date && e.venue);
        if (rows.length) return rows;
      }
    } catch (e) { /* fall through to JSON */ }
  }
  try {
    const res = await fetch(SITE.eventsUrl, { cache: 'no-store' });
    const json = await res.json();
    return json.events || [];
  } catch (e) { return []; }
}

function upcoming(events) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter(e => e.date && parseLocal(e.date, e.end || e.start || '23:59') >= today)
    .sort((a, b) => parseLocal(a.date, a.start) - parseLocal(b.date, b.start));
}

/* ---------------- ICS ---------------- */
function downloadIcs(e) {
  const loc = [e.venue, e.city, e.state].filter(Boolean).join(', ');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Runaway Train//Shows//EN', 'BEGIN:VEVENT',
    'UID:' + e.date.replace(/-/g, '') + '-' + e.venue.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '@runawaytrain',
    'DTSTART:' + icsStamp(e.date, e.start),
    'DTEND:' + icsStamp(e.date, e.end || e.start),
    'SUMMARY:Runaway Train at ' + e.venue,
    'LOCATION:' + loc,
    'DESCRIPTION:Live country & country-rock covers from Runaway Train.' + (e.notes ? ' ' + e.notes : ''),
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'runaway-train-' + e.venue.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ---------------- rendering ---------------- */
function showCard(e) {
  const dt = parseLocal(e.date, e.start);
  const loc = [e.city, e.state].filter(Boolean).join(', ');
  const time = e.start ? fmtTime(e.start) + (e.end ? '–' + fmtTime(e.end) : '') : '';
  const meta = [loc, e.notes && /tbd/i.test(e.notes) ? 'Set time TBD' : time].filter(Boolean).join(' · ');
  const mapUrl = 'https://www.google.com/maps/search/' + encodeURIComponent([e.venue, e.city, e.state].filter(Boolean).join(', '));

  const card = document.createElement('article');
  card.className = 'show-card';
  card.innerHTML = `
    <div class="show-date">
      <div class="dow">${DAYS[dt.getDay()]}</div>
      <div class="day">${String(dt.getDate()).padStart(2, '0')}</div>
      <div class="mon">${MONTHS[dt.getMonth()]}</div>
    </div>
    <div class="show-info">
      <div class="venue"></div>
      <div class="meta"></div>
      <div class="lineup"></div>
    </div>
    <div class="show-actions">
      <a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${mapUrl}">Map</a>
      ${e.fbEvent ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${e.fbEvent}">FB event</a>` : ''}
      ${e.ticketUrl ? `<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="${e.ticketUrl}">Tickets</a>` : ''}
      <button class="btn btn-outline-amber btn-sm" type="button">Add to calendar</button>
    </div>`;
  card.querySelector('.venue').textContent = e.venue;
  card.querySelector('.meta').textContent = meta;
  card.querySelector('.lineup').textContent = e.lineup || '';
  card.querySelector('button').addEventListener('click', () => downloadIcs(e));
  return card;
}

function injectEventSchema(events) {
  const data = events.map(e => ({
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: 'Runaway Train at ' + e.venue,
    startDate: e.date + (e.start ? 'T' + e.start + ':00-05:00' : ''),
    ...(e.end ? { endDate: e.date + 'T' + e.end + ':00-05:00' } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: e.venue,
      address: { '@type': 'PostalAddress', addressLocality: e.city || undefined, addressRegion: e.state || 'MO', addressCountry: 'US' }
    },
    performer: { '@type': 'MusicGroup', name: 'Runaway Train', '@id': SITE.domain + '/#band' },
    organizer: { '@type': 'MusicGroup', name: 'Runaway Train', url: SITE.domain },
    ...(e.ticketUrl ? { offers: { '@type': 'Offer', url: e.ticketUrl, availability: 'https://schema.org/InStock' } } : {}),
    description: 'Live country & country-rock covers from Runaway Train' + (e.city ? ' in ' + e.city + ', ' + (e.state || 'MO') : '') + '.'
  }));
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.id = 'event-schema';
  s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

/* Bandsintown option: render their public widget */
function mountBandsintown(container) {
  const div = document.createElement('div');
  div.innerHTML = `<a class="bit-widget-initializer"
    data-artist-name="${SITE.bandsintownArtist}"
    data-background-color="#0B0A09" data-separator-color="#2A2318"
    data-text-color="#F7F1E6" data-link-color="#FFB020"
    data-display-local-dates="true" data-display-past-dates="false"
    data-auto-style="false" data-display-limit="15"></a>`;
  container.replaceChildren(div);
  const s = document.createElement('script');
  s.src = 'https://widget.bandsintown.com/main.min.js';
  document.body.appendChild(s);
}

/* ---------------- page wiring ---------------- */
async function initShows() {
  const listEl = document.querySelector('[data-shows]');
  const nextEls = document.querySelectorAll('[data-next-show]');
  const bar = document.querySelector('.mobile-bar');
  if (!listEl && !nextEls.length && !bar) return;

  if (SITE.bandsintownArtist && listEl) { mountBandsintown(listEl); return; }

  const events = upcoming(await loadEvents());
  const limit = listEl ? parseInt(listEl.dataset.shows || '0', 10) : 0;

  if (listEl) {
    listEl.replaceChildren();
    if (!events.length) {
      listEl.innerHTML = '<p class="show-empty">No public shows on the books right now — <a href="/book/">bring us to yours</a>.</p>';
    } else {
      (limit ? events.slice(0, limit) : events).forEach(e => listEl.appendChild(showCard(e)));
    }
    injectEventSchema(events);
  }

  const next = events[0];
  if (next) {
    const dt = parseLocal(next.date, next.start);
    const where = [next.venue, [next.city, next.state].filter(Boolean).join(', ')].filter(Boolean).join(', ');
    const short = `${DAYS[dt.getDay()]} ${MONTHS[dt.getMonth()]} ${dt.getDate()}`;
    nextEls.forEach(el => {
      const what = el.querySelector('[data-next-what]');
      const when = el.querySelector('[data-next-when]');
      if (what) what.textContent = `${short} · ${where}`;
      if (when && next.start) when.textContent = fmtTime(next.start) + (next.end ? '–' + fmtTime(next.end) : '');
      const cal = el.querySelector('[data-next-cal]');
      if (cal) cal.addEventListener('click', () => downloadIcs(next));
      el.hidden = false;
    });
    if (bar) {
      bar.classList.add('has-show');
      const v = bar.querySelector('.v');
      if (v) v.textContent = `${short} · ${next.venue}`;
      const btn = bar.querySelector('button');
      if (btn) btn.addEventListener('click', () => downloadIcs(next));
    }
  }
}

function initNav() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.mobile-menu');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
}

function initForms() {
  document.querySelectorAll('form[data-static-form]').forEach(form => {
    form.addEventListener('submit', e => {
      // If no backend is configured yet, keep it client-side.
      if (form.getAttribute('action') === '#') {
        e.preventDefault();
        const note = form.querySelector('.form-note');
        if (note) note.textContent = 'Thanks — we reply within 48 hours.';
        form.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initShows();
  initForms();
});
