/**
 * Runaway Train — song request receiver
 * ------------------------------------------------
 * Lives in the band's Show Schedule Google Sheet and appends every
 * website song request as a row in a "Requests" tab.
 *
 * SETUP (one time, ~3 minutes):
 * 1. Open the Show Schedule sheet → Extensions → Apps Script
 * 2. Delete any starter code, paste this whole file, hit Save
 * 3. Deploy → New deployment → type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 4. Authorize when prompted, copy the Web app URL (ends in /exec)
 * 5. Paste that URL into SITE.requestUrl in assets/js/site.js
 *
 * Optional: set NOTIFY_EMAIL below to get an email per request.
 */

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

    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
