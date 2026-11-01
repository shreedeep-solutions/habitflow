/**
 * HabitFlow — monthly Excel report by email (free, Google Apps Script)
 * Runs on the 1st of every month at ~8 AM IST and emails last month's report.
 * One-time setup: see "Monthly email" in SETUP.md.
 * Must run from the Google account that owns the Firebase project (habits-70105).
 */
var PROJECT_ID  = 'habits-70105';
var SEND_TO     = 'deepvernekar1097@gmail.com';     // who receives the email (comma-separate for more)
var ADMIN_EMAIL = 'deepvernekar1097@gmail.com';
var FS_BASE     = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';

/** Run this ONCE: creates the monthly schedule and sends a test email right away. */
function setup() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendMonthlyReport').timeBased().onMonthDay(1).atHour(8).inTimezone('Asia/Kolkata').create();
  sendMonthlyReport();
}

/** Builds last month's report, emails it as an .xlsx attachment, then deletes the temporary sheet. */
function sendMonthlyReport() {
  var now = new Date();
  var first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  var monthKey = first.getFullYear() + '-' + pad2(first.getMonth() + 1);
  var rep = buildReport(monthKey);
  var ss = SpreadsheetApp.create('HabitFlow ' + rep.label);
  var sum = ss.getSheets()[0]; sum.setName('Summary');
  writeGrid(sum, rep.summary, rep.summaryStyles, 1);
  rep.people.forEach(function (p) {
    if (!p.rows) return;
    var sh = ss.insertSheet(uniqueName(ss, p.sheetName));
    writeGrid(sh, p.rows, p.styles, 1);
  });
  SpreadsheetApp.flush();
  var url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx';
  var blob = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }).getBlob()
    .setName('HabitFlow_' + rep.label.replace(' ', '_') + '.xlsx');
  var lines = rep.people.map(function (p) { return '<li><b>' + esc(p.name) + '</b> — ' + p.scoreText + '</li>'; }).join('');
  MailApp.sendEmail({
    to: SEND_TO,
    subject: 'HabitFlow report — ' + rep.label,
    htmlBody: '<p>Monthly habit report for <b>' + rep.label + '</b> is attached.</p><ul>' + lines + '</ul>' +
      '<p style="color:#888">Sent automatically by HabitFlow · Shreedeep Solutions</p>',
    attachments: [blob]
  });
  DriveApp.getFileById(ss.getId()).setTrashed(true);
}

/* ───────── report data (same rules as the app) ───────── */
function buildReport(monthKey) {
  var y = +monthKey.slice(0, 4), m = +monthKey.slice(5, 7);
  var from = monthKey + '-01', to = monthKey + '-' + pad2(new Date(y, m, 0).getDate());
  var dates = []; for (var d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  var cfgDoc = getDoc('config/app') || {};
  var cfg = { holidays: cfgDoc.holidays || {}, weeklyOff: cfgDoc.weeklyOff || [2] };
  var users = listDocs('users');
  var people = [];
  var adminUser = users.filter(function (u) { return String(u.data.email || '').toLowerCase() === ADMIN_EMAIL; })[0];
  if (!adminUser && cfgDoc.adminUid) adminUser = { id: cfgDoc.adminUid, data: { name: 'Super Admin' } };
  users.forEach(function (u) {
    var e = String(u.data.email || '').toLowerCase();
    if (u.data.removed === true) return;
    if (e === ADMIN_EMAIL) return;
    people.push({ uid: u.id, name: u.data.name || e.split('@')[0], email: e, role: 'Staff', designation: u.data.designation || '' });
  });
  people.sort(function (a, b) { return a.name.localeCompare(b.name); });
  if (adminUser) people.unshift({ uid: adminUser.id, name: adminUser.data.name || 'Super Admin', email: ADMIN_EMAIL, role: 'Admin', designation: 'Super Admin', sheet: 'Super Admin' });
  var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var dh = dates.map(function (ds) { return DAYN[parseDs(ds).getDay()] + ' ' + dmy(ds); });
  var summary = [['Name', 'Email', 'Role', 'Designation', 'Habits', 'Done', 'Possible', 'Score'].concat(dh)];
  var summaryStyles = [summary[0].map(function () { return 'h'; })];
  var used = {};
  people.forEach(function (p) {
    var habits = listDocs('users/' + p.uid + '/habits').map(function (h) { h.data.id = h.id; return h.data; });
    var comp = {}; queryRange('users/' + p.uid, 'completions', from, to).forEach(function (c) { comp[c.id] = c.data; });
    var state = function (h, ds) {
      var c = comp[h.id + '_' + ds];
      if (c && c.done) return 'done';
      var start = isoToDs(h.createdAt) || '0000-00-00';
      if (ds < start) return 'na';
      if ((h.archivedRanges || []).some(function (r) { return r && r.from && ds >= r.from && (!r.to || ds < r.to); })) return 'na';
      if (c && c.status === 'skip') return 'skip';
      var lv = comp['LEAVE_' + ds];
      if ((lv && lv.leave) || cfg.holidays[ds] || cfg.weeklyOff.indexOf(parseDs(ds).getDay()) >= 0) return 'off';
      return 'miss';
    };
    var hs = habits.filter(function (h) { return dates.some(function (ds) { return state(h, ds) !== 'na'; }); })
      .sort(function (a, b) { return ((a.order == null ? 1e9 : a.order) - (b.order == null ? 1e9 : b.order)) || String(a.createdAt).localeCompare(String(b.createdAt)); });
    var n = 0, dd = 0;
    var perDay = dates.map(function (ds) {
      var req = 0, done = 0;
      hs.forEach(function (h) { var s = state(h, ds); if (s === 'done') { req++; done++; } else if (s === 'miss') req++; });
      n += done; dd += req;
      return req ? done + '/' + req : '–';
    });
    p.scoreText = dd ? Math.round(n / dd * 100) + '% (' + n + ' of ' + dd + ')' : 'no habits';
    summary.push([p.name, p.email, p.role, p.designation, hs.length, n, dd, dd ? Math.round(n / dd * 100) + '%' : '–'].concat(perDay));
    summaryStyles.push(['b', '', '', '', '', '', '', dd ? (n / dd >= .8 ? 'pd' : n / dd >= .5 ? 'ps' : 'pm') : ''].concat(perDay.map(function () { return 'c'; })));
    var base = (p.sheet || p.name).replace(/[:\\\/\?\*\[\]]/g, '_').slice(0, 31), nm = base, i = 2;
    while (used[nm.toLowerCase()] || nm.toLowerCase() === 'summary') { nm = base.slice(0, 27) + ' (' + (i++) + ')'; }
    used[nm.toLowerCase()] = 1; p.sheetName = nm;
    if (!hs.length) return;
    var rows = [['Habit'].concat(dh)], styles = [rows[0].map(function () { return 'h'; })];
    hs.forEach(function (h) {
      var cells = dates.map(function (ds) {
        var s = state(h, ds), c = comp[h.id + '_' + ds] || {};
        if (s === 'done') return [h.type === 'count' ? String(c.count) : h.type === 'timer' ? c.minutes + 'm' : '✓', 'd'];
        if (s === 'skip') return ['–', 's'];
        if (s === 'off') return [comp['LEAVE_' + ds] ? 'L' : cfg.holidays[ds] ? 'H' : 'Off', 'o'];
        if (s === 'na') return ['·', 'n'];
        return ['✕', 'm'];
      });
      rows.push([((h.emoji || '') + ' ' + h.name).trim()].concat(cells.map(function (c) { return c[0]; })));
      styles.push(['b'].concat(cells.map(function (c) { return c[1]; })));
    });
    rows.push(['Daily total'].concat(perDay)); styles.push(['t'].concat(perDay.map(function () { return 't'; })));
    p.rows = rows; p.styles = styles;
  });
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return { label: MONTHS[m - 1] + ' ' + y, summary: summary, summaryStyles: summaryStyles, people: people };
}

/* ───────── sheet writing ───────── */
var STY = { h: ['#4A1521', '#FFFFFF', 'bold'], d: ['#E5F2E6', '#1B5E20', 'bold'], m: ['#F6E9EA', '#B4535F', 'normal'], o: ['#EFEAE4', '#8A7D72', 'normal'],
  s: ['#F7EFD9', '#9A7A2C', 'normal'], n: ['#FFFFFF', '#BBBBBB', 'normal'], t: ['#F4EDE3', '#2A1A1E', 'bold'], b: ['#FFFFFF', '#2A1A1E', 'bold'],
  pd: ['#FFFFFF', '#1B5E20', 'bold'], ps: ['#FFFFFF', '#9A7A2C', 'bold'], pm: ['#FFFFFF', '#B4535F', 'bold'], c: ['#FFFFFF', '#2A1A1E', 'normal'] };
function writeGrid(sh, rows, styles, freezeCols) {
  var w = Math.max.apply(null, rows.map(function (r) { return r.length; }));
  var data = rows.map(function (r) { var x = r.slice(); while (x.length < w) x.push(''); return x; });
  var rng = sh.getRange(1, 1, data.length, w);
  rng.setValues(data);
  var st = styles.map(function (r) { var x = []; for (var i = 0; i < w; i++) x.push(STY[r[i]] || ['#FFFFFF', '#2A1A1E', 'normal']); return x; });
  rng.setBackgrounds(st.map(function (r) { return r.map(function (s) { return s[0]; }); }));
  rng.setFontColors(st.map(function (r) { return r.map(function (s) { return s[1]; }); }));
  rng.setFontWeights(st.map(function (r) { return r.map(function (s) { return s[2]; }); }));
  rng.setHorizontalAlignment('center'); sh.getRange(1, 1, data.length, 1).setHorizontalAlignment('left');
  sh.setFrozenRows(1); sh.setFrozenColumns(freezeCols);
  sh.setColumnWidth(1, 240); if (w > 1) sh.setColumnWidths(2, w - 1, 95);
}
function uniqueName(ss, n) { var b = n, i = 2; while (ss.getSheetByName(n)) n = b.slice(0, 27) + ' (' + (i++) + ')'; return n; }

/* ───────── Firestore REST (uses this Google account's access to the project) ───────── */
function fsFetch(url, opts) {
  opts = opts || {};
  var res = UrlFetchApp.fetch(url, { method: opts.method || 'get', contentType: 'application/json', payload: opts.payload ? JSON.stringify(opts.payload) : undefined,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  var code = res.getResponseCode();
  if (code === 404) return null;
  if (code !== 200) throw new Error('Firestore ' + code + ': ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText());
}
function getDoc(path) { var j = fsFetch(FS_BASE + '/' + path); return j ? decodeFields(j.fields || {}) : null; }
function listDocs(path) {
  var out = [], token = '';
  do {
    var j = fsFetch(FS_BASE + '/' + path + '?pageSize=300' + (token ? '&pageToken=' + encodeURIComponent(token) : '')) || {};
    (j.documents || []).forEach(function (d) { out.push({ id: d.name.split('/').pop(), data: decodeFields(d.fields || {}) }); });
    token = j.nextPageToken || '';
  } while (token);
  return out;
}
function queryRange(parent, collection, from, to) {
  var body = { structuredQuery: { from: [{ collectionId: collection }], where: { compositeFilter: { op: 'AND', filters: [
    { fieldFilter: { field: { fieldPath: 'date' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: from } } },
    { fieldFilter: { field: { fieldPath: 'date' }, op: 'LESS_THAN_OR_EQUAL', value: { stringValue: to } } }] } } } };
  var j = fsFetch(FS_BASE + '/' + parent + ':runQuery', { method: 'post', payload: body }) || [];
  return j.filter(function (r) { return r.document; }).map(function (r) { return { id: r.document.name.split('/').pop(), data: decodeFields(r.document.fields || {}) }; });
}
function decodeValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return decodeFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue);
  return null;
}
function decodeFields(f) { var o = {}; Object.keys(f).forEach(function (k) { o[k] = decodeValue(f[k]); }); return o; }

/* ───────── date helpers (local "YYYY-MM-DD") ───────── */
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function parseDs(ds) { var p = ds.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function fmt(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function addDays(ds, n) { var d = parseDs(ds); d.setDate(d.getDate() + n); return fmt(d); }
function dmy(ds) { var p = ds.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
function isoToDs(v) { if (!v) return null; var d = new Date(v); return isNaN(d) ? null : fmt(d); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
