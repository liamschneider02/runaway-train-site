# Runaway Train — band website

Static multi-page site for **Runaway Train / Country Roads and Friends** (country & country-rock covers, east-central Missouri). No build step, no framework — deployable as-is to Cloudflare Pages, Netlify, or GitHub Pages.

Design source: "Runaway Train v3 – Neon" (Claude Design project *Three EPK design concepts*).

## Pages

| URL | Purpose |
|---|---|
| `/` | Hero, next show banner, top-3 shows, two lineups, song marquee, CTA |
| `/shows/` | Full schedule (auto-rendered, past shows auto-hide) |
| `/band/` | Band story + member cards |
| `/songs/` | Song list by set (titles only) |
| `/book/` | Booking form + FAQ (FAQPage schema for AEO) |
| `/epk/` | Press kit for talent buyers: quick facts, photos, tech notes |

## Editing shows (the band's job)

Shows live in **`data/events.json`**. Add a show, commit, done — the site sorts by date and hides past shows automatically. Fields:

```json
{ "date": "2026-08-21", "start": "20:00", "end": "23:00",
  "venue": "M-K Ranch Bar & Grill", "city": "Warrenton", "state": "MO",
  "lineup": "Runaway Train — full band", "fbEvent": "", "ticketUrl": "", "notes": "" }
```

`fbEvent` = paste the Facebook event URL and a "FB event" button appears on that show.

### Option B — Google Sheet (no GitHub needed)
1. Make a Google Sheet with header row: `date, start, end, venue, city, state, lineup, fbEvent, ticketUrl, notes`
2. File → Share → **Publish to web** → select the sheet tab → **CSV** → copy the URL
3. Paste that URL into `SITE.sheetCsvUrl` at the top of `assets/js/site.js`

When set, the Sheet **replaces** events.json. Band edits the sheet from their phones; the site updates on next page load. events.json stays as a fallback if the Sheet ever breaks.

### Option C — Bandsintown
Band claims their artist page in the free **Bandsintown for Artists** app and manages gigs there (bonus: shows syndicate to Google, Spotify & Shazam). Set `SITE.bandsintownArtist` in `assets/js/site.js` and the shows page renders the Bandsintown widget instead. Trade-off: widget styling, not our neon cards.

## TODOs before production

Search the repo for `data-todo` / `TODO`:

- **Booking email** — replace `booking@example.com` everywhere (`data-todo="booking-email"`)
- **Form backend** — point the form `action` in `book/index.html` at FormSubmit.co / Formspree / a Cloudflare Pages Function. Currently `action="#"` = demo mode (client-side thank-you only, nothing is sent)
- **Social URLs** — footer Facebook/Instagram/YouTube links (`data-todo="*-url"`)
- **Member names/bios** — 4 placeholder members on `/band/` (`data-todo="member-bio"`)
- **Stage plot PDF** — linked from `/epk/`
- **Domain** — site assumes `https://runawaytrain.band` (canonicals, sitemap, schema). If the domain changes, find-and-replace it in all HTML + `sitemap.xml` + `robots.txt` + `SITE.domain` in `site.js`
- **Newsletter** — footer signup is decorative until wired to Mailchimp/Buttondown

## SEO / AEO built in

- Unique title/description per page; canonical URLs; OG/Twitter cards with real stage photo
- JSON-LD: `MusicGroup` (home), `MusicEvent` per show (injected from events data), `FAQPage` (book), `BreadcrumbList` (subpages)
- `sitemap.xml`, `robots.txt`, semantic HTML, alt text on all images
- FAQ answers written to be quotable by answer engines (cost, travel, insurance, lineups)
- Fluid/responsive from 320px up; WCAG-minded contrast & focus states; `prefers-reduced-motion` respected

## Deploy (Cloudflare Pages)

1. Push this repo to GitHub
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → pick the repo
3. Build settings: **no build command**, output directory `/`
4. Staging URL: `<project>.pages.dev`; add `runawaytrain.band` as custom domain when purchased

## Local preview

```
python3 -m http.server 8080
```
(Any static server works; the site fetches `/data/events.json` so file:// won't render shows.)
