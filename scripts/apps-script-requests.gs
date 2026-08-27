/**
 * Runaway Train — website form receiver
 * ------------------------------------------------
 * Lives in the band's Show Schedule Google Sheet.
 * Handles TWO forms from the website:
 *   - song requests  → "Requests" tab
 *   - booking inquiries (formType=booking) → "Bookings" tab + email to the band
 */

var BOOKING_EMAIL = 'Runawaytrainstl@gmail.com'; // booking inquiries land here
var NOTIFY_EMAIL = ''; // optional: also email each song request — '' = off
var MAX_LEN = 200;
var MAX_MSG = 800;

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    if (clean(p.website)) return out('ok'); // honeypot filled → silently drop
    if (clean(p.formType) === 'booking') return handleBooking(p);
    return handleRequest(p);
  } catch (err) {
    return out('error');
  }
}

function handleRequest(p) {
  var song = clean(p.song);
  if (!song) return out('missing song');

  var row = [
    new Date(),
    song,
    clean(p.artist),
    clean(p.show),
    clean(p.name),
    clean(p.dedication),
    clean(p.page)
  ];

  var sheet = getTab('Requests', ['When', 'Song', 'Artist', 'Show', 'Name', 'Dedication', 'Source']);
  sheet.appendRow(row);

  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(
      NOTIFY_EMAIL,
      'Song request: ' + song,
      'Song: ' + song +
      (row[2] ? '\nArtist: ' + row[2] : '') +
      (row[3] ? '\nShow: ' + row[3] : '') +
      (row[4] ? '\nFrom: ' + row[4] : '') +
      (row[5] ? '\nDedication: ' + row[5] : '')
    );
  }
  return out('ok');
}

function handleBooking(p) {
  var name = clean(p.name);
  var email = clean(p.email);
  if (!name || !email) return out('missing fields');

  var row = [
    new Date(),
    name,
    email,
    clean(p.phone),
    clean(p.event_date),
    clean(p.venue),
    clean(p.event_type),
    clean(p.lineup),
    clean(p.budget),
    String(p.message || '').replace(/\s+/g, ' ').trim().slice(0, MAX_MSG),
    clean(p.page)
  ];

  var sheet = getTab('Bookings', ['When', 'Name', 'Email', 'Phone', 'Event date', 'Venue', 'Event type', 'Lineup', 'Budget', 'Message', 'Source']);
  sheet.appendRow(row);

  if (BOOKING_EMAIL) {
    MailApp.sendEmail(
      BOOKING_EMAIL,
      'Booking inquiry: ' + (row[5] || name) + (row[4] ? ' — ' + row[4] : ''),
      'New booking inquiry from the website:\n\n' +
      'Name: ' + name + '\n' +
      'Email: ' + email + '\n' +
      (row[3] ? 'Phone: ' + row[3] + '\n' : '') +
      (row[4] ? 'Event date: ' + row[4] + '\n' : '') +
      (row[5] ? 'Venue: ' + row[5] + '\n' : '') +
      (row[6] ? 'Event type: ' + row[6] + '\n' : '') +
      (row[7] ? 'Lineup: ' + row[7] + '\n' : '') +
      (row[8] ? 'Budget: ' + row[8] + '\n' : '') +
      (row[9] ? '\n' + row[9] + '\n' : '') +
      '\nReply directly to ' + email
    );
  }
  return out('ok');
}

function getTab(name, header) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(header);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clean(v) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
}

function doGet() {
  return out('Runaway Train request receiver is running.');
}

function out(msg) {
  return ContentService.createTextOutput(msg);
}
