(function () {
  'use strict';
  var LOGO = '/images/Team_connect_logo_white.png';
  var app = document.getElementById('app');

  // ------------------------------------------------------------ tiny helpers
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) for (var k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function ls(op, k, v) { try { return op === 'get' ? localStorage.getItem(k) : op === 'set' ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) { return null; } }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  function mmssFloor(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  var toastEl;
  function toast(msg) {
    if (toastEl) toastEl.remove();
    toastEl = h('div', { class: 'toast', text: msg });
    document.body.appendChild(toastEl);
    setTimeout(function () { if (toastEl) toastEl.remove(); }, 2800);
  }
  function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['x-team-token'] = token;
    return fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; }); });
  }

  // ------------------------------------------------------------ branding
  function brandbar() {
    var img = h('img', { src: LOGO, alt: 'Team Connect' });
    var bar = h('div', { class: 'brandbar' }, img, h('div', { class: 'tag' }, 'Bringing Teams Together'));
    img.addEventListener('error', function () { img.replaceWith(h('span', { class: 'wordmark', text: 'TEAM CONNECT' })); });
    return bar;
  }
  function footer() { return h('div', { class: 'footer-tag', text: 'Cohesion through Experience' }); }

  // ------------------------------------------------------------ session
  var params = new URLSearchParams(location.search);
  var code = (params.get('client') || ls('get', 'tc_code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  var token = code ? ls('get', 'tc_token_' + code) : null;
  var state = null, deadline = 0, pollT = null, tickT = null, shell = null, polling = false, endPolled = 0;

  function stop() { clearInterval(pollT); clearInterval(tickT); pollT = tickT = null; shell = null; }

  function boot() {
    stop();
    if (code && token) {
      api('GET', '/api/puzzle/state').then(function (s) {
        if (s._status === 200) { state = s; startGame(); } else { ls('del', 'tc_token_' + code); token = null; showJoin(); }
      }).catch(function () { showJoin('We could not reach the server. Check your signal and refresh.'); });
    } else showJoin();
  }

  // ------------------------------------------------------------ join screen
  function showJoin(errMsg) {
    stop(); clear(app);
    var welcome = h('p', { class: 'muted', text: '' });
    var codeIn = h('input', { class: 'field', value: code, placeholder: 'e.g. K7M2P', maxlength: 8, autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false' });
    var nameIn = h('input', { class: 'field', placeholder: 'e.g. Team Blue', maxlength: 30, autocomplete: 'off' });
    var msg = h('div', { class: 'msg bad', text: errMsg || '' });
    var go = h('button', { class: 'btn accent block', type: 'submit', text: 'Join' });
    function lookup() {
      var c = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (c.length < 3) { welcome.textContent = ''; return; }
      fetch('/api/puzzle/client/' + encodeURIComponent(c)).then(function (r) { return r.json(); }).then(function (j) {
        welcome.textContent = j.name ? 'Welcome, ' + j.name + '.' : '';
      }).catch(function () {});
    }
    codeIn.addEventListener('blur', lookup);
    var form = h('form', { onsubmit: function (e) {
      e.preventDefault();
      var c = codeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      msg.textContent = '';
      if (!c) { msg.textContent = 'Enter your client code.'; return; }
      if (!nameIn.value.trim()) { msg.textContent = 'Enter a team name.'; return; }
      go.disabled = true;
      api('POST', '/api/puzzle/join', { code: c, teamName: nameIn.value }).then(function (j) {
        go.disabled = false;
        if (j._status !== 200) { msg.textContent = j.error || 'Could not join.'; return; }
        code = c; token = j.token; ls('set', 'tc_code', code); ls('set', 'tc_token_' + code, token);
        boot();
      }).catch(function () { go.disabled = false; msg.textContent = 'No connection. Try again.'; });
    } },
      h('label', { class: 'lbl', text: 'Client code' }), codeIn,
      h('label', { class: 'lbl', text: 'Your team name' }), nameIn,
      h('p', { class: 'note', text: 'More than one phone in your team? Everyone types the same team name and you will share one score.' }),
      msg, h('div', { style: 'margin-top:12px' }, go));
    app.appendChild(brandbar());
    app.appendChild(h('div', { class: 'screen' },
      h('div', { class: 'hero panel' }, h('h1', { text: 'Team Connect Puzzle Challenge' }), welcome, form),
      footer()));
    if (code) lookup();
  }

  // ------------------------------------------------------------ game shell
  function startGame() {
    stop(); clear(app);
    shell = {};
    shell.test = h('div', { class: 'testflag', text: 'TEST MODE - dry run, not a live session', hidden: true });
    shell.timer = h('div', { class: 'timer', text: '--:--' });
    shell.team = h('div', { class: 'team' });
    shell.fill = h('div', { class: 'fill' });
    shell.plabel = h('span', { text: '' });
    shell.attempts = h('span', { text: '' });
    var briefBtn = h('button', { class: 'btn accent', text: 'Brief', onclick: showBrief });
    shell.bar = h('div', { class: 'gamebar' },
      h('div', { class: 'row' }, shell.timer, shell.team, briefBtn),
      h('div', { class: 'progress' }, h('div', { class: 'label' }, shell.plabel, shell.attempts), h('div', { class: 'track' }, shell.fill)));
    shell.waiting = h('div', { class: 'screen center', hidden: true },
      h('div', { class: 'panel' }, h('div', { class: 'pulse' }), h('h2', { text: 'Waiting for the facilitator to start' }),
        shell.waitSub = h('p', { class: 'muted' }),
        h('p', { text: 'Keep this page open. Your clock starts the moment the facilitator starts it. In the meantime, read the brief.' }),
        h('button', { class: 'btn block', text: 'Read the brief', onclick: showBrief })));
    shell.main = h('div', { class: 'main' });
    shell.finish = h('div', { class: 'screen finish', hidden: true });
    shell.paused = h('div', { class: 'overlay', hidden: true }, h('h2', { text: 'Clock paused' }), h('p', { text: 'The facilitator has paused the clock. Stay where you are.' }));
    app.appendChild(shell.test); app.appendChild(shell.bar); app.appendChild(shell.waiting);
    app.appendChild(shell.main); app.appendChild(shell.finish); app.appendChild(shell.paused);
    shell.fileEls = {}; shell.built = false;
    applyState(state);
    pollT = setInterval(poll, 3000);
    tickT = setInterval(tick, 250);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(); });
  }

  function poll() {
    if (polling || !token) return;
    polling = true;
    api('GET', '/api/puzzle/state').then(function (s) {
      polling = false;
      if (s._status === 401) { ls('del', 'tc_token_' + code); token = null; showJoin('Your session was reset. Please join again.'); return; }
      if (s._status === 200) applyState(s);
    }).catch(function () { polling = false; });
  }

  function tick() {
    if (!state || !shell) return;
    if (state.clock.status === 'running') {
      var left = deadline - Date.now();
      setTimer(left);
      if (left <= 0 && Date.now() - endPolled > 1000) { endPolled = Date.now(); poll(); }
    }
  }
  function setTimer(ms) {
    shell.timer.textContent = mmss(ms);
    shell.timer.className = 'timer' + (ms <= 60000 ? ' crit' : ms <= 300000 ? ' low' : '');
  }

  function applyState(s) {
    state = s;
    if (s.clock.status === 'running') deadline = Date.now() + s.clock.timeLeftMs;
    setTimer(s.clock.timeLeftMs);
    shell.test.hidden = !s.client.test;
    shell.team.textContent = s.team.name + ' · ' + s.client.name;
    shell.waitSub.textContent = s.team.name + ' · ' + s.client.name;
    shell.plabel.textContent = s.progress.answered + ' of ' + s.progress.total + ' answered';
    shell.attempts.textContent = s.attempts.wrong ? s.attempts.wrong + ' wrong attempt' + (s.attempts.wrong === 1 ? '' : 's') : '';
    shell.fill.style.width = (100 * s.progress.answered / s.progress.total) + '%';
    var waiting = s.clock.status === 'waiting' && !s.over;
    shell.waiting.hidden = !waiting;
    shell.main.hidden = waiting || s.over;
    shell.finish.hidden = !s.over;
    shell.paused.hidden = !(s.clock.status === 'paused' && !s.over);
    if (s.over) { renderFinish(s); closeModal(); return; }
    if (!waiting) { buildMain(s); updateFiles(s); }
  }

  // ------------------------------------------------------------ main content
  function buildMain(s) {
    if (shell.built) return;
    shell.built = true;
    var clueGrid = h('div', { class: 'grid2' });
    s.clues.forEach(function (c) { clueGrid.appendChild(clueCard(c)); });
    shell.fileGrid = h('div', { class: 'grid2' });
    shell.main.appendChild(h('h2', { class: 'section-title', text: 'Clue Sheets' }));
    shell.main.appendChild(clueGrid);
    shell.main.appendChild(h('h2', { class: 'section-title', text: 'Locked Files' }));
    shell.main.appendChild(shell.fileGrid);
  }

  function clueCard(c) {
    var body;
    if (c.kind === 'text') body = h('div', { class: 'clue-text', text: c.text });
    else body = h('button', { class: 'clue-open', onclick: function () { showSudoku(c); }, 'aria-label': 'Open clue sheet ' + c.label },
      gridEl(c.grid, null, true), h('div', { class: 'tap', text: 'Tap to open' }));
    return h('div', { class: 'card' }, h('header', null, h('span', { text: '📄' }), h('span', { text: c.label })), h('div', { class: 'body' }, body));
  }

  function sig(f) { return JSON.stringify([f.unlocked, f.questions ? f.questions.map(function (q) { return q.solved; }) : 0]); }
  function updateFiles(s) {
    s.files.forEach(function (f) {
      var cur = shell.fileEls[f.id], sg = sig(f);
      if (cur && cur.sig === sg) return;
      var saved = cur ? captureInputs(cur.el) : {};
      var el = f.unlocked ? openCard(f) : lockedCard(f);
      restoreInputs(el, saved);
      if (cur) cur.el.replaceWith(el); else shell.fileGrid.appendChild(el);
      shell.fileEls[f.id] = { el: el, sig: sg };
    });
  }
  function captureInputs(el) { var o = {}; el.querySelectorAll('[data-q]').forEach(function (i) { o[i.getAttribute('data-q')] = i.value; }); return o; }
  function restoreInputs(el, o) { el.querySelectorAll('[data-q]').forEach(function (i) { var v = o[i.getAttribute('data-q')]; if (v) i.value = v; }); }

  function lockedCard(f) {
    var pw = h('input', { class: 'field', placeholder: 'Password', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', 'aria-label': 'Password for ' + f.label });
    var msg = h('div', { class: 'msg' });
    var btn = h('button', { class: 'btn', text: 'Unlock' });
    var card = h('div', { class: 'card' });
    function submit() {
      if (!pw.value.trim()) { msg.className = 'msg bad'; msg.textContent = 'Type a password first.'; return; }
      btn.disabled = true; msg.textContent = '';
      api('POST', '/api/puzzle/unlock', { fileId: f.id, password: pw.value }).then(function (r) {
        btn.disabled = false;
        if (r.state) applyState(r.state);
        if (r.ok) return;
        if (r.locked) { toast(r.error); return; }
        msg.className = 'msg bad'; msg.textContent = r.error || 'Incorrect password';
        card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        pw.select();
      }).catch(function () { btn.disabled = false; toast('No connection. Try again.'); });
    }
    btn.addEventListener('click', submit);
    pw.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    card.appendChild(h('header', null, h('span', { text: '🔒' }), h('span', { text: f.label }), h('span', { class: 'state', text: 'Locked' })));
    card.appendChild(h('div', { class: 'body' }, h('div', { class: 'pwrow' }, pw, btn), msg, f.note ? h('div', { class: 'note', text: f.note }) : null));
    return card;
  }

  function openCard(f) {
    var solved = f.questions.filter(function (q) { return q.solved; }).length;
    var card = h('div', { class: 'card open' + (solved === f.questions.length ? ' done' : '') });
    card.appendChild(h('header', null, h('span', { text: solved === f.questions.length ? '✅' : '🔓' }), h('span', { text: f.label }),
      h('span', { class: 'state', text: solved + ' / ' + f.questions.length + ' done' })));
    var body = h('div', { class: 'body' });
    f.questions.forEach(function (q) { body.appendChild(questionEl(q, card)); });
    card.appendChild(body);
    return card;
  }

  function questionEl(q, card) {
    var wrap = h('div', { class: 'q' });
    wrap.appendChild(h('div', { class: 'qid' }, q.id.replace('Q', 'Question '), q.solved ? h('span', { class: 'tick', text: '✔' }) : null));
    wrap.appendChild(h('div', { class: 'qtext', text: q.text }));
    if (q.solved) {
      wrap.appendChild(h('input', { class: 'field good', value: q.shown, disabled: true, 'aria-label': q.id + ' answer, correct' }));
      return wrap;
    }
    var msg = h('div', { class: 'msg' });
    var btn = h('button', { class: 'btn', text: 'Submit' });
    var getAnswer, inputs = [];
    function mark(bad) { inputs.forEach(function (i) { i.classList.toggle('bad', bad); }); }
    if (q.type === 'trio') {
      var vals = {}; var grid = h('div', { class: 'trio' });
      q.people.forEach(function (p) {
        var sel = h('select', { class: 'field', 'data-q': q.id + '.' + p, 'aria-label': p },
          h('option', { value: '', text: 'Choose…' }), q.options.map(function (o) { return h('option', { value: o, text: o }); }));
        sel.addEventListener('change', function () { mark(false); });
        inputs.push(sel); vals[p] = sel;
        grid.appendChild(h('b', { text: p })); grid.appendChild(sel);
      });
      wrap.appendChild(grid);
      getAnswer = function () { var o = {}; q.people.forEach(function (p) { o[p] = vals[p].value; }); return q.people.every(function (p) { return o[p]; }) ? o : null; };
      wrap.appendChild(h('div', { class: 'ansrow' }, btn));
    } else {
      var inp = q.type === 'day'
        ? h('select', { class: 'field', 'data-q': q.id }, h('option', { value: '', text: 'Choose a day…' }), q.options.map(function (o) { return h('option', { value: o, text: o }); }))
        : h('input', { class: 'field', 'data-q': q.id, placeholder: 'Your answer', autocomplete: 'off', spellcheck: 'false', 'aria-label': q.id + ' answer' });
      inputs.push(inp);
      inp.addEventListener('input', function () { mark(false); msg.textContent = ''; });
      inp.addEventListener('change', function () { mark(false); });
      getAnswer = function () { return inp.value.trim() ? inp.value : null; };
      wrap.appendChild(h('div', { class: 'ansrow' }, inp, btn));
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter' && q.type === 'text') btn.click(); });
    }
    wrap.appendChild(msg);
    btn.addEventListener('click', function () {
      var a = getAnswer();
      if (!a) { msg.className = 'msg bad'; msg.textContent = q.type === 'trio' ? 'Choose one for each person.' : 'Type an answer first.'; return; }
      btn.disabled = true; msg.textContent = '';
      api('POST', '/api/puzzle/answer', { qid: q.id, answer: a }).then(function (r) {
        btn.disabled = false;
        if (r.state) applyState(r.state);
        if (r.ok) return;
        if (r.locked) { toast(r.error); return; }
        mark(true); msg.className = 'msg bad'; msg.textContent = r.error || 'Incorrect answer';
        inputs.forEach(function (i) { i.classList.remove('shake'); void i.offsetWidth; i.classList.add('shake'); });
      }).catch(function () { btn.disabled = false; toast('No connection. Try again.'); });
    });
    return wrap;
  }

  // ------------------------------------------------------------ finish
  function renderFinish(s) {
    var r = s.result; clear(shell.finish);
    var done = r.reason === 'finished';
    shell.finish.appendChild(h('div', { class: 'panel center' },
      h('h1', { text: done ? 'All 12 answered!' : "Time's up" }),
      h('p', { class: 'muted', text: s.team.name + ' · ' + s.client.name }),
      h('div', { class: 'bigscore', text: String(r.score) }),
      h('div', { class: 'muted', text: 'points' }),
      h('div', { class: 'stats' },
        stat(r.correct + ' / ' + r.total, 'Answers correct'),
        stat(mmssFloor(r.timeUsedMs), 'Time used'),
        stat(String(r.wrongPw), 'Wrong passwords'),
        stat(String(r.wrongAns), 'Wrong answers'),
        r.bonus ? stat('+' + r.bonus, 'Time bonus') : null,
        stat(String(r.wrong), 'Wrong attempts in total')),
      h('p', { text: done && s.clock.status !== 'ended' ? 'Well done. Your files are locked in. The facilitator will share the leaderboard.' : 'Everything is now locked. The facilitator will share the leaderboard.' })));
    shell.finish.appendChild(footer());
  }
  function stat(v, l) { return h('div', { class: 'stat' }, h('b', { text: v }), h('span', { text: l })); }

  // ------------------------------------------------------------ modals
  var modal = null, keyHandler = null;
  function closeModal() { if (modal) { modal.remove(); modal = null; } if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; } document.body.style.overflow = ''; }
  function openModal(sheet) {
    closeModal();
    modal = h('div', { class: 'modal', onclick: function (e) { if (e.target === modal) closeModal(); } }, sheet);
    document.body.appendChild(modal); document.body.style.overflow = 'hidden';
  }
  function showBrief() {
    var mins = state ? Math.round(state.clock.durationMs / 60000) : 40;
    openModal(h('div', { class: 'sheet' }, h('h2', { text: 'Brief' }),
      h('div', { class: 'brief-text' },
        h('p', { text: 'You have ' + mins + ' minutes in total.' }),
        h('p', { text: 'Before you open anything, agree a plan: who does what, and how you will share passwords and answers.' }),
        h('p', { text: 'Every locked file has a matching clue sheet. Work out which goes with which.' }),
        h('p', { text: 'Some passwords depend on other answers.' })),
      h('div', { class: 'actions' }, h('button', { class: 'btn block', text: 'Got it', onclick: closeModal }))));
  }

  // ------------------------------------------------------------ sudoku
  function gridEl(grid, opt, mini) {
    var box = h('div', { class: 'sudoku' + (mini ? ' mini' : '') });
    for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) {
      var v = grid[r][c];
      var cell = h('button', { class: 'cell' + (c % 3 === 2 && c < 8 ? ' bR' : '') + (r % 3 === 2 && r < 8 ? ' bB' : ''), type: 'button', 'data-i': r * 9 + c, tabindex: mini ? '-1' : null });
      if (typeof v === 'number' && v > 0) { cell.classList.add('given'); cell.textContent = String(v); }
      else if (typeof v === 'string') cell.appendChild(h('span', { class: 'letter', text: v }));
      box.appendChild(cell);
    }
    return box;
  }
  function showSudoku(c) {
    var key = 'tc_s_' + state.team.id + '_' + c.id;
    var scratch = [];
    try { scratch = JSON.parse(ls('get', key) || '[]'); } catch (e) { scratch = []; }
    if (!Array.isArray(scratch) || scratch.length !== 81) scratch = new Array(81).fill(0);
    var sel = -1;
    var box = gridEl(c.grid, null, false);
    var cells = box.children;
    function paint() {
      for (var i = 0; i < 81; i++) {
        var r = Math.floor(i / 9), col = i % 9, v = c.grid[r][col], cell = cells[i];
        cell.classList.toggle('sel', i === sel);
        var hl = false;
        if (sel >= 0 && i !== sel) { var sr = Math.floor(sel / 9), sc = sel % 9; hl = sr === r || sc === col || (Math.floor(sr / 3) === Math.floor(r / 3) && Math.floor(sc / 3) === Math.floor(col / 3)); }
        cell.classList.toggle('hl', hl);
        if (typeof v === 'number' && v > 0) continue;
        clear(cell);
        var letter = typeof v === 'string' ? v : null, s = scratch[i];
        if (letter && !s) cell.appendChild(h('span', { class: 'letter', text: letter }));
        else if (letter && s) { cell.appendChild(h('span', { class: 'letter small', text: letter })); cell.appendChild(h('span', { class: 'scratch', text: String(s) })); }
        else if (s) cell.appendChild(h('span', { class: 'scratch', text: String(s) }));
      }
    }
    function setDigit(d) {
      if (sel < 0) { toast('Tap a cell first'); return; }
      var v = c.grid[Math.floor(sel / 9)][sel % 9];
      if (typeof v === 'number' && v > 0) return;
      scratch[sel] = (d === 0 || scratch[sel] === d) ? 0 : d;
      ls('set', key, JSON.stringify(scratch)); paint();
    }
    box.addEventListener('click', function (e) {
      var t = e.target.closest('.cell'); if (!t) return;
      var i = Number(t.getAttribute('data-i')), v = c.grid[Math.floor(i / 9)][i % 9];
      if (typeof v === 'number' && v > 0) { sel = -1; } else sel = i;
      paint();
    });
    var pad = h('div', { class: 'pad' });
    for (var d = 1; d <= 9; d++) (function (d) { pad.appendChild(h('button', { type: 'button', text: String(d), onclick: function () { setDigit(d); } })); })(d);
    pad.appendChild(h('button', { type: 'button', text: '⌫', 'aria-label': 'Erase', onclick: function () { setDigit(0); } }));
    paint();
    openModal(h('div', { class: 'sheet' }, h('h2', { text: 'Clue sheet ' + c.label }),
      h('div', { class: 'sudoku-wrap' }, box, pad),
      h('p', { class: 'note', text: 'Tap a cell, then a number, to jot notes. Notes stay on this phone only.' }),
      h('div', { class: 'actions' }, h('button', { class: 'btn block', text: 'Close', onclick: closeModal }))));
    keyHandler = function (e) {
      if (e.key >= '1' && e.key <= '9') setDigit(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') setDigit(0);
      else if (e.key === 'Escape') closeModal();
      else if (sel >= 0 && /^Arrow/.test(e.key)) {
        e.preventDefault();
        var r = Math.floor(sel / 9), col = sel % 9;
        if (e.key === 'ArrowUp') r = (r + 8) % 9; if (e.key === 'ArrowDown') r = (r + 1) % 9;
        if (e.key === 'ArrowLeft') col = (col + 8) % 9; if (e.key === 'ArrowRight') col = (col + 1) % 9;
        sel = r * 9 + col; paint();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  boot();
})();
