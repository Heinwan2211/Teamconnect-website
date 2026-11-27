(function () {
  'use strict';
  var app = document.getElementById('app');
  var code = (new URLSearchParams(location.search).get('client') || '').toUpperCase();
  var d = null, at = 0;
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) for (var k in props) { var v = props[k]; if (v == null || v === false) continue; if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else el.setAttribute(k, v); }
    for (var i = 2; i < arguments.length; i++) { var c = arguments[i]; if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return el;
  }
  function mmss(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  var STATUS = { waiting: 'Waiting to start', running: 'Time left', paused: 'Paused', ended: 'Finished' };
  if (!code) {
    app.appendChild(h('div', { class: 'wrap' }, h('h1', { text: 'Projector view' }), h('p', { class: 'empty', text: 'Open this from the facilitator console (sign in there first, in this same browser).' }), h('p', { class: 'empty' }, h('a', { href: '/puzzle/facilitator', style: 'color:#e8862a', text: 'Go to facilitator console' }))));
    return;
  }
  var title = h('h1'), sub = h('div', { class: 'sub' }), clock = h('div', { class: 'clock' }), status = h('div', { class: 'sub', style: 'text-align:right' }), board = h('div', { class: 'board' });
  app.appendChild(h('div', { class: 'wrap' },
    h('div', { class: 'top' }, h('div', null, title, sub), h('div', null, clock, status)), board));
  function load() {
    fetch('/api/puzzle/fac/clients/' + code, { credentials: 'same-origin', cache: 'no-store' }).then(function (r) {
      if (r.status === 401) { board.textContent = ''; board.appendChild(h('p', { class: 'empty', text: 'Not signed in. Sign in on the facilitator console, then reload this page.' })); return null; }
      return r.json();
    }).then(function (j) { if (j && j.code) { d = j; at = Date.now(); paint(); } }).catch(function () {});
  }
  function paint() {
    title.textContent = d.name;
    sub.textContent = 'Team Connect Puzzle Challenge · Leaderboard';
    status.textContent = STATUS[d.status];
    while (board.firstChild) board.removeChild(board.firstChild);
    if (!d.teams.length) { board.appendChild(h('p', { class: 'empty', text: 'Waiting for teams to join…' })); return; }
    board.appendChild(h('div', { class: 'line head' }, h('div', { text: '#' }), h('div', { text: 'Team' }), h('div', { class: 'a', text: 'Answers' }), h('div', { class: 's', text: 'Score' })));
    d.teams.slice(0, 12).forEach(function (t, i) {
      board.appendChild(h('div', { class: 'line' + (t.rank === 1 && t.score > 0 ? ' first' : '') },
        h('div', { class: 'r', text: String(t.rank) }), h('div', { class: 'n', text: t.name + (t.finished ? ' ✔' : '') }),
        h('div', { class: 'a', text: t.correct + '/' + t.total }), h('div', { class: 's', text: String(t.score) })));
    });
    if (d.teams.length > 12) board.appendChild(h('p', { class: 'empty', text: '+ ' + (d.teams.length - 12) + ' more teams' }));
  }
  function paintClock() {
    if (!d) return;
    var left = d.timeLeftMs;
    if (d.status === 'running') left = Math.max(0, d.timeLeftMs - (Date.now() - at));
    clock.textContent = mmss(d.status === 'waiting' ? d.durationMs : left);
    clock.className = 'clock' + (d.status === 'paused' ? ' paused' : d.status === 'ended' ? ' ended' : d.status === 'running' && left <= 60000 ? ' crit' : '');
  }
  load(); setInterval(load, 2000); setInterval(paintClock, 250);
})();
