/**
 * Runaway Train — song request receiver (personal-account version)
 * ----------------------------------------------------------------
 * Runs as a STANDALONE script on a personal Gmail account and writes
 * into the band's Show Schedule sheet by ID (the personal account must
 * be an Editor on that sheet). Personal accounts have no Workspace org
 * restrictions, so "Anyone" web-app access actually works.
 *
 * SETUP (~5 minutes):
 * 1. Make sure the schedule sheet is shared to this Gmail as Editor
 * 2. Signed in as the personal Gmail → script.google.com → New project
 * 3. Delete starter code, paste this whole file, hit Save
 * 4. Deploy → New deployment → type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Authorize when prompted, copy the Web app URL (ends in /exec)
 * 6. Paste that URL into SITE.requestUrl in assets/js/site.js
 */

var SHEET_ID = '1mRuzKp7iaCALfipKehCIVKZS0FoN3uvBfeQ7dFvMm4M'; // Show Schedule sheet
var NOTIFY_EMAIL = ''; // e.g. 'band@example.com' — leave '' for no emails
var TAB_NAME = 'Requests';
var MAX_LEN = 200;

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};
    var clean = function (v) {
      return String(v || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
    };

    var song = clean(p.song);
    if (!song) return out('missing song');
    if (clean(p.website)) return out('ok'); // honeypot filled → silently drop

    var row = [
      new Date(),            // timestamp
      song,                  // song
      clean(p.artist),       // artist
      clean(p.show),         // which show
      clean(p.name),         // fan name
      clean(p.dedication),   // dedication / shout-out
      clean(p.page)          // page it came from
    ];

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(TAB_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(TAB_NAME);
      sheet.appendRow(['When', 'Song', 'Artist', 'Show', 'Name', 'Dedication', 'Source']);
      sheet.setFrozenRows(1);
    }
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
  } catch (err) {
    return out('error');
  }
}

function out(msg) {
  return ContentService.createTextOutput(msg);
}
