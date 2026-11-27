(function () {
  'use strict';
  var LOGO = '/images/Team_connect_logo_white.png';
  var app = document.getElementById('app');
  var selected = (location.hash || '').replace('#', '').toUpperCase() || null;
  var consoleShown = false;
  var detail = null, detailAt = 0, listT = null, detT = null, clockT = null;

  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) for (var k in props) {
      var v = props[k]; if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v; else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(function (x) { add(el, x); }); else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function mmssF(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  var STATUS = { waiting: 'Waiting to start', running: 'Running', paused: 'Paused', ended: 'Ended' };
  var toastEl;
  function toast(m) { if (toastEl) toastEl.remove(); toastEl = h('div', { class: 'toast', text: m }); document.body.appendChild(toastEl); setTimeout(function () { toastEl && toastEl.remove(); }, 2600); }

  function api(method, path, body) {
    return fetch(path, { method: method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; if (r.status === 401 && path !== '/api/puzzle/fac/login') logout(true); return j; }); });
  }
  function logout(expired) {
    if (!expired) fetch('/api/puzzle/fac/logout', { method: 'POST', credentials: 'same-origin' });
    clearInterval(listT); clearInterval(detT); clearInterval(clockT);
    showLogin(expired && consoleShown ? 'Please sign in again.' : '');
  }

  function topbar(extra) {
    var img = h('img', { src: LOGO, alt: 'Team Connect' });
    img.addEventListener('error', function () { img.replaceWith(h('span', { class: 'wordmark', text: 'TEAM CONNECT' })); });
    return h('div', { class: 'brandbar' }, img, h('div', { class: 'tag' }, 'Facilitator console'), extra || null);
  }

  // ---------------------------------------------------------- login
  function showLogin(msg) {
    clear(app);
    var pin = h('input', { class: 'field', type: 'password', autocomplete: 'current-password', placeholder: 'Facilitator password' });
    var m = h('div', { class: 'msg bad', text: msg || '' });
    var form = h('form', { onsubmit: function (e) {
      e.preventDefault(); m.textContent = '';
      api('POST', '/api/puzzle/fac/login', { password: pin.value }).then(function (j) {
        if (j._status !== 200) { m.textContent = j.error || 'Could not sign in.'; return; }
        showConsole();
      });
    } }, h('label', { class: 'lbl', text: 'Password (same one as the DISC dashboard)' }), pin, m, h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn accent block', type: 'submit', text: 'Sign in' })));
    app.appendChild(topbar());
    app.appendChild(h('div', { class: 'screen' }, h('div', { class: 'panel' }, h('h1', { text: 'Facilitator sign-in' }), form)));
    pin.focus();
  }

  // ---------------------------------------------------------- console
  var listEl, detailEl, nameIn;
  function showConsole() {
    consoleShown = true;
    clear(app);
    app.appendChild(topbar(h('button', { class: 'btn small ghost', style: 'color:#fff;border-color:#fff;margin-left:12px', text: 'Sign out', onclick: function () { logout(false); } })));
    nameIn = h('input', { class: 'field', placeholder: 'Client name, e.g. Acme Ltd', maxlength: 60 });
    var cmsg = h('div', { class: 'msg bad' });
    listEl = h('div', { class: 'clientlist' });
    detailEl = h('div');
    var left = h('div', null,
      h('div', { class: 'panel' }, h('h2', { text: 'New client' }),
        h('form', { onsubmit: function (e) {
          e.preventDefault(); cmsg.textContent = '';
          api('POST', '/api/puzzle/fac/clients', { name: nameIn.value }).then(function (j) {
            if (j._status !== 200) { cmsg.textContent = j.error || 'Failed.'; return; }
            nameIn.value = ''; select(j.code); loadList();
          });
        } }, nameIn, cmsg, h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn accent block', type: 'submit', text: 'Create client' })))),
      h('div', { class: 'panel mt' }, h('h2', { text: 'Clients' }), listEl));
    app.appendChild(h('div', { class: 'fac' }, h('div', { class: 'cols' }, left, detailEl)));
    loadList(); listT = setInterval(loadList, 6000);
    if (selected) select(selected);
    else detailEl.appendChild(h('div', { class: 'panel' }, h('p', { class: 'muted', text: 'Create a client or pick one on the left. The "Facilitator test" client is a dry run you can play through yourself.' })));
  }

  function loadList() {
    api('GET', '/api/puzzle/fac/clients').then(function (j) {
      if (j._status !== 200) return;
      clear(listEl);
      j.clients.forEach(function (c) {
        listEl.appendChild(h('button', { class: 'clientitem' + (c.code === selected ? ' sel' : ''), onclick: function () { select(c.code); } },
          h('b', { text: c.name }),
          h('span', { class: 'muted', text: c.code + ' · ' + c.teams + ' team' + (c.teams === 1 ? '' : 's') + ' · ' + new Date(c.createdAt).toLocaleDateString() + ' ' }),
          c.test ? h('span', { class: 'badge test', text: 'test' }) : null, ' ',
          h('span', { class: 'badge ' + c.status, text: STATUS[c.status] })));
      });
    });
  }

  function select(code) {
    selected = code; location.hash = code;
    clearInterval(detT); clearInterval(clockT); detail = null;
    clear(detailEl); detailEl.appendChild(h('div', { class: 'panel', text: 'Loading…' }));
    loadList();
    loadDetail(true);
    detT = setInterval(function () { loadDetail(false); }, 3000);
    clockT = setInterval(paintClock, 250);
  }

  var ui = null; // references to parts of the detail view
  function loadDetail(first) {
    if (!selected) return;
    var code = selected;
    api('GET', '/api/puzzle/fac/clients/' + code).then(function (j) {
      if (code !== selected) return;
      if (j._status !== 200) { clear(detailEl); detailEl.appendChild(h('div', { class: 'panel err', text: j.error || 'Could not load.' })); return; }
      detail = j; detailAt = Date.now();
      if (first || !ui || ui.code !== code) buildDetail(); 
      paintDetail();
    });
  }

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(function () { toast('Copied'); });
    var t = h('textarea', { style: 'position:fixed;opacity:0' }); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); toast('Copied'); } catch (e) { toast('Press and hold to copy'); }
    t.remove(); return Promise.resolve();
  }
  function download(path, name) {
    fetch(path, { credentials: 'same-origin' }).then(function (r) { return r.blob(); }).then(function (b) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
  }

  function confirmBtn(label, cls, fn) {
    var b = h('button', { class: 'btn ' + cls, text: label }), t = null;
    b.addEventListener('click', function () {
      if (t) { clearTimeout(t); t = null; b.textContent = label; fn(); return; }
      b.textContent = 'Sure? Tap again'; t = setTimeout(function () { t = null; b.textContent = label; }, 4000);
    });
    return b;
  }
  function action(a) {
    return api('POST', '/api/puzzle/fac/clients/' + selected + '/' + a).then(function (j) {
      if (j._status !== 200) { toast(j.error || 'Failed'); return; }
      detail = j; detailAt = Date.now(); paintDetail(); loadList();
    });
  }

  function buildDetail() {
    var d = detail; ui = { code: d.code };
    clear(detailEl);
    var link = location.origin + '/puzzle?client=' + d.code;
    ui.title = h('h2', { text: d.name });
    ui.badges = h('div', { class: 'row-inline' });
    ui.clock = h('div', { class: 'bigclock', text: '--:--' });
    ui.sub = h('div', { class: 'muted' });
    ui.startBtn = h('button', { class: 'btn accent', text: 'START', onclick: function () { action('start'); } });
    ui.pauseBtn = h('button', { class: 'btn', text: 'PAUSE', onclick: function () { action('pause'); } });
    ui.addBtn = h('button', { class: 'btn ghost', text: 'ADD 5 MIN', onclick: function () { action('add'); } });
    ui.endBtn = confirmBtn('END', 'danger', function () { action('end'); });
    ui.resetBtn = confirmBtn('RESET', 'ghost', function () { action('reset'); });
    var qrBox = h('div', { class: 'qrbox' });
    try { var qr = qrcode(0, 'M'); qr.addData(link); qr.make(); qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { qrBox.textContent = 'QR unavailable'; }
    var linkIn = h('input', { class: 'field', value: link, readonly: true, onfocus: function (e) { e.target.select(); } });
    ui.tbody = h('tbody');
    ui.empty = h('p', { class: 'muted', text: 'No teams yet. Teams appear here as soon as they join.' });

    detailEl.appendChild(h('div', { class: 'panel' },
      ui.title, ui.badges,
      h('div', { class: 'mt row-inline', style: 'align-items:flex-end;gap:24px' }, h('div', null, ui.clock, ui.sub)),
      h('div', { class: 'ctrls' }, ui.startBtn, ui.pauseBtn, ui.addBtn, ui.endBtn, ui.resetBtn),
      h('div', { class: 'ctrls' },
        h('button', { class: 'btn small', text: 'Projector view', onclick: function () { window.open('/puzzle/projector?client=' + d.code, '_blank'); } }),
        h('button', { class: 'btn small ghost', text: 'Export results CSV', onclick: function () { download('/api/puzzle/fac/clients/' + d.code + '/export?kind=results', d.code + '-results.csv'); } }),
        h('button', { class: 'btn small ghost', text: 'Export timeline CSV', onclick: function () { download('/api/puzzle/fac/clients/' + d.code + '/export?kind=timeline', d.code + '-timeline.csv'); } }),
        h('button', { class: 'btn small ghost', text: 'Answer key', onclick: showKey }))));
    detailEl.appendChild(h('div', { class: 'panel mt' },
      h('h2', { text: 'Player link' }),
      h('div', { class: 'linkbox' }, linkIn, h('button', { class: 'btn small', text: 'Copy link', onclick: function () { copy(link); } }),
        h('button', { class: 'btn small ghost', text: 'Copy code', onclick: function () { copy(d.code); } })),
      h('p', { class: 'muted', text: 'Client code: ' + d.code + ' (players can also type it at ' + location.origin + '/puzzle)' }),
      qrBox));
    detailEl.appendChild(h('div', { class: 'panel mt' },
      h('h2', { text: 'Scoreboard' }),
      h('div', { class: 'tablewrap' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['#', 'Team', 'Files', 'Answers', 'Wrong', 'Used', 'Left', 'Score'].map(function (t) { return h('th', { text: t }); }))), ui.tbody)),
      ui.empty,
      h('p', { class: 'note', text: 'Scoring: ' + d.config.points + ' per correct answer, +' + d.config.bonus + ' per full minute left when a team finishes all 12, -' + d.config.penalty + ' per wrong attempt. Tap a team for its timeline.' })));
  }

  function paintDetail() {
    var d = detail; if (!d || !ui) return;
    ui.title.textContent = d.name;
    clear(ui.badges);
    ui.badges.appendChild(h('span', { class: 'badge ' + d.status, text: STATUS[d.status] }));
    if (d.test) ui.badges.appendChild(h('span', { class: 'badge test', text: 'test client' }));
    ui.badges.appendChild(h('span', { class: 'badge', text: d.code }));
    ui.sub.textContent = d.status === 'waiting' ? 'Total ' + Math.round(d.durationMs / 60000) + ' min · teams are waiting' : 'Time left · ' + Math.round(d.durationMs / 60000) + ' min total';
    ui.startBtn.textContent = d.status === 'paused' ? 'RESUME' : 'START';
    ui.startBtn.disabled = !(d.status === 'waiting' || d.status === 'paused');
    ui.pauseBtn.disabled = d.status !== 'running';
    ui.endBtn.disabled = d.status === 'ended';
    paintClock();
    clear(ui.tbody);
    ui.empty.hidden = d.teams.length > 0;
    d.teams.forEach(function (t) {
      var on = d.serverNow - t.lastSeen < 20000 && t.lastSeen > 0;
      ui.tbody.appendChild(h('tr', { class: 'row', onclick: function () { showTeam(t.id); } },
        h('td', { class: 'rank', text: String(t.rank) }),
        h('td', null, h('span', { class: 'dot' + (on ? ' on' : ''), title: on ? 'Online' : 'Not seen recently' }), t.name, t.finished ? ' ✅' : ''),
        h('td', { text: t.filesUnlocked + '/' + t.filesTotal }),
        h('td', { text: t.correct + '/' + t.total }),
        h('td', { text: t.wrong + (t.wrong ? ' (' + t.wrongPw + 'p/' + t.wrongAns + 'a)' : '') }),
        h('td', { text: d.status === 'waiting' ? '--:--' : mmssF(t.timeUsed) }),
        h('td', { text: mmss(t.timeLeft) }),
        h('td', { class: 'score', text: String(t.score) })));
    });
  }
  function paintClock() {
    if (!detail || !ui || !ui.clock) return;
    var left = detail.timeLeftMs;
    if (detail.status === 'running') left = Math.max(0, detail.timeLeftMs - (Date.now() - detailAt));
    ui.clock.textContent = mmss(detail.status === 'waiting' ? detail.durationMs : left);
  }

  // ---------------------------------------------------------- team timeline
  var modal;
  function closeModal() { if (modal) { modal.remove(); modal = null; } }
  function openModal(sheet) { closeModal(); modal = h('div', { class: 'modal', onclick: function (e) { if (e.target === modal) closeModal(); } }, sheet); document.body.appendChild(modal); }
  function showTeam(id) {
    api('GET', '/api/puzzle/fac/clients/' + selected + '/teams/' + id).then(function (j) {
      if (j._status !== 200) return;
      var s = j.summary, list = h('ul', { class: 'timeline' });
      if (!j.events.length) list.appendChild(h('li', { class: 'muted', text: 'Nothing yet.' }));
      j.events.forEach(function (e) {
        list.appendChild(h('li', null, h('span', { class: 't', text: mmssF(e.t) }),
          h('span', { class: /^wrong/.test(e.type) ? 'wrong' : /^(correct|unlock|finish)/.test(e.type) ? 'good' : '', text: e.text })));
      });
      openModal(h('div', { class: 'sheet', style: 'max-width:640px' },
        h('h2', { text: s.name }),
        h('p', { class: 'muted', text: 'Rank ' + s.rank + ' · ' + s.score + ' pts · files ' + s.filesUnlocked + '/' + s.filesTotal + ' · answers ' + s.correct + '/' + s.total + ' · wrong ' + s.wrong + ' (' + s.wrongPw + ' passwords, ' + s.wrongAns + ' answers)' }),
        list,
        h('div', { class: 'actions' },
          h('button', { class: 'btn', text: 'Close', onclick: closeModal }),
          confirmBtn('Remove team', 'danger', function () { api('DELETE', '/api/puzzle/fac/clients/' + selected + '/teams/' + id).then(function () { closeModal(); loadDetail(false); }); }))));
    });
  }

  function showKey() {
    api('GET', '/api/puzzle/fac/key').then(function (j) {
      if (j._status !== 200) return;
      var rows = [];
      j.key.forEach(function (f) {
        rows.push(h('tr', null, h('td', null, h('b', { text: f.file })), h('td', { text: 'Password: ' + f.password }), h('td', null, f.questions.map(function (q) { return h('div', { style: 'margin-bottom:6px' }, h('b', { text: q.id + ': ' }), q.answer); }))));
      });
      openModal(h('div', { class: 'sheet', style: 'max-width:760px' }, h('h2', { text: 'Answer key (facilitator only)' }),
        h('div', { class: 'tablewrap' }, h('table', { class: 'tbl keytable' }, h('tbody', null, rows))),
        h('p', { class: 'note', text: j.note || '' }),
        h('div', { class: 'actions' }, h('button', { class: 'btn block', text: 'Close', onclick: closeModal }))));
    });
  }

  api('GET', '/api/puzzle/fac/clients').then(function (j) { if (j._status === 200) showConsole(); else showLogin(); });
})();
