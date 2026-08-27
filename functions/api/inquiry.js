/**
 * Runaway Train — /api/inquiry (Cloudflare Pages Function)
 * --------------------------------------------------------
 * Receives both website forms (booking inquiries + song requests).
 *  1. Logs every submission to the band's Google Sheet by forwarding
 *     to the Apps Script receiver (Bookings / Requests tabs).
 *  2. For bookings, emails the band via Resend from the band's domain.
 *
 * Required Pages environment variable (encrypted):
 *   RESEND_API_KEY — from resend.com after verifying runawaytrain.band
 */

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxOLGMZ35qkcpUkcaQMH70CjTv1e1pX4nk4DyducENC0LeyPDP4PMrfWF_CQkH2iz0r/exec';
const FROM = 'Booking Inquiry <booking@runawaytrain.band>';
const TO = 'Runawaytrainstl@gmail.com';
const MAX_LEN = 200;
const MAX_MSG = 800;

export async function onRequestPost({ request, env, waitUntil }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'bad request' }, 400);
  }

  const clean = (k, max = MAX_LEN) =>
    String(form.get(k) || '').replace(/\s+/g, ' ').trim().slice(0, max);

  // Honeypot — pretend success so bots learn nothing
  if (clean('website')) return json({ ok: true });

  const formType = clean('formType') === 'booking' ? 'booking' : 'request';

  // 1. Sheet logging via Apps Script (never blocks the response)
  const fwd = new FormData();
  for (const [k, v] of form.entries()) fwd.append(k, typeof v === 'string' ? v : '');
  const logToSheet = fetch(APPS_SCRIPT_URL, { method: 'POST', body: fwd }).catch(() => {});

  // 2. Booking inquiries also email the band from the domain
  let emailed = false;
  if (formType === 'booking' && env.RESEND_API_KEY) {
    const name = clean('name');
    const email = clean('email');
    if (!name || !email) {
      waitUntil(logToSheet);
      return json({ ok: false, error: 'missing fields' }, 400);
    }
    const phone = clean('phone');
    const eventDate = clean('event_date');
    const venue = clean('venue');
    const eventType = clean('event_type');
    const lineup = clean('lineup');
    const budget = clean('budget');
    const message = clean('message', MAX_MSG);

    const fields = [
      ['Name', name],
      ['Email', email],
      ['Phone', phone],
      ['Event date', eventDate],
      ['Venue', venue],
      ['Event type', eventType],
      ['Lineup', lineup],
      ['Budget', budget],
    ].filter(([, v]) => v);

    const text = [
      'New booking inquiry from the website:',
      '',
      ...fields.map(([k, v]) => `${k}: ${v}`),
      message && `\n${message}`,
      '',
      'Hit reply to answer them directly.',
    ].filter(Boolean).join('\n');

    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif; color:#1a1a1a; max-width:560px;">
        <h2 style="margin:0 0 4px; font-size:20px;">New booking inquiry</h2>
        <p style="margin:0 0 18px; color:#777; font-size:13px;">from runawaytrain.band</p>
        <table cellpadding="0" cellspacing="0" style="border-collapse:collapse; width:100%; font-size:15px;">
          ${fields.map(([k, v]) => `
          <tr>
            <td style="padding:7px 16px 7px 0; font-weight:bold; white-space:nowrap; vertical-align:top; border-bottom:1px solid #eee;">${esc(k)}</td>
            <td style="padding:7px 0; vertical-align:top; border-bottom:1px solid #eee;">${esc(v)}</td>
          </tr>`).join('')}
        </table>
        ${message ? `
        <p style="margin:18px 0 6px; font-weight:bold; font-size:15px;">Message</p>
        <p style="margin:0; padding:12px 14px; background:#faf6ee; border-left:3px solid #FFB020; font-size:15px; line-height:1.5;">${esc(message)}</p>` : ''}
        <p style="margin:22px 0 0; color:#777; font-size:13px;">Hit reply to answer ${esc(name)} directly.</p>
      </div>`;

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: [TO],
          reply_to: email,
          subject: `Booking inquiry: ${venue || name}${eventDate ? ' — ' + eventDate : ''}`,
          text,
          html,
        }),
      });
      emailed = res.ok;
    } catch {
      emailed = false;
    }
  }

  waitUntil(logToSheet);
  return json({ ok: true, emailed });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
