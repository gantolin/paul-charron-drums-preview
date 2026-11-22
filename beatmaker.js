// Drum beat maker for Paul Charron Drums. Six drum sounds made in the browser, 16 steps, presets,
// swing, tap pads, and a link that saves the beat. Nothing is sent anywhere.
(function () {
  var box = document.getElementById('bm');
  if (!box) return;

  var VOICES = [
    ['crash', 'Crash'], ['open', 'Open hat'], ['hat', 'Hi-hat'], ['snare', 'Snare'], ['tom', 'Tom'], ['kick', 'Kick']
  ];
  var STEPS = 16;
  var PRESETS = {
    'Rock':        { bpm: 100, swing: 0,  p: { hat: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', kick: 'x.......x.x.....' } },
    'Four on the floor': { bpm: 120, swing: 0, p: { open: '..x...x...x...x.', hat: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', kick: 'x...x...x...x...' } },
    'Funk':        { bpm: 96,  swing: 0,  p: { hat: 'xxxxxxxxxxxxxxxx', snare: '....x..x.x..x...', kick: 'x..x..x...x.....' } },
    'Boom bap':    { bpm: 88,  swing: 35, p: { hat: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', kick: 'x.....x..x......' } },
    'Half time':   { bpm: 140, swing: 0,  p: { crash: 'x...............', hat: 'x.x.x.x.x.x.x.x.', snare: '........x.......', kick: 'x.....x......x..' } },
    'Tom groove':  { bpm: 110, swing: 0,  p: { hat: 'x...x...x...x...', snare: '....x.......x...', tom: '..x...x...x..xx.', kick: 'x.......x.......' } }
  };

  var pat = {}, cells = {}, ctx = null, noise = null, master = null;
  var running = false, timer = null, raf = null, nextTime = 0, step = 0, queue = [];
  var grid = document.getElementById('bm-grid'), playBtn = document.getElementById('bm-play');
  var tempo = document.getElementById('bm-tempo'), tempoOut = document.getElementById('bm-tempo-out');
  var swing = document.getElementById('bm-swing'), swingOut = document.getElementById('bm-swing-out');
  var note = document.getElementById('bm-note');

  VOICES.forEach(function (v) { pat[v[0]] = new Array(STEPS).fill(0); });

  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    var len = ctx.sampleRate * 1.5;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noise.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function burst(t, type, freq, dur, vol, q) {
    var s = ctx.createBufferSource(); s.buffer = noise;
    var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
  }
  function tone(t, from, to, dur, vol, type) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hit(v, t) {
    if (v === 'kick') { tone(t, 160, 42, 0.34, 1.0); burst(t, 'lowpass', 900, 0.02, 0.25); }
    if (v === 'snare') { burst(t, 'highpass', 1600, 0.19, 0.55); tone(t, 230, 150, 0.11, 0.4, 'triangle'); }
    if (v === 'hat') burst(t, 'highpass', 7500, 0.045, 0.26);
    if (v === 'open') burst(t, 'highpass', 6500, 0.32, 0.24);
    if (v === 'tom') tone(t, 190, 95, 0.28, 0.75);
    if (v === 'crash') { burst(t, 'highpass', 4200, 1.1, 0.3); burst(t, 'bandpass', 9000, 0.6, 0.18, 0.7); }
  }

  function setCell(v, i, on) {
    pat[v][i] = on ? 1 : 0;
    cells[v][i].setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  VOICES.forEach(function (v) {
    var row = document.createElement('div');
    row.className = 'bm-row'; row.setAttribute('data-voice', v[0]);
    var label = document.createElement('button');
    label.type = 'button'; label.className = 'bm-label'; label.textContent = v[1];
    label.setAttribute('aria-label', 'Play the ' + v[1] + ' sound');
    label.addEventListener('click', function () { audio(); hit(v[0], ctx.currentTime); });
    var steps = document.createElement('div'); steps.className = 'bm-steps';
    cells[v[0]] = [];
    for (var i = 0; i < STEPS; i++) {
      (function (i) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', v[1] + ', step ' + (i + 1) + ' of ' + STEPS);
        b.addEventListener('click', function () {
          setCell(v[0], i, !pat[v[0]][i]);
          if (pat[v[0]][i]) { audio(); hit(v[0], ctx.currentTime); }
          note.textContent = '';
        });
        cells[v[0]].push(b); steps.appendChild(b);
      })(i);
    }
    row.appendChild(label); row.appendChild(steps); grid.appendChild(row);
  });

  function loadPattern(p) {
    VOICES.forEach(function (v) {
      var s = p[v[0]] || '';
      for (var i = 0; i < STEPS; i++) setCell(v[0], i, s.charAt(i) === 'x');
    });
  }
  function setTempo(v) { tempo.value = v; tempoOut.textContent = tempo.value + ' bpm'; }
  function setSwing(v) { swing.value = v; swingOut.textContent = swing.value + '%'; }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.12) {
      var sixteenth = 60 / Number(tempo.value) / 4;
      var late = (step % 2 === 1) ? sixteenth * (Number(swing.value) / 100) * 0.66 : 0;
      for (var k = 0; k < VOICES.length; k++) if (pat[VOICES[k][0]][step]) hit(VOICES[k][0], nextTime + late);
      queue.push({ t: nextTime + late, s: step });
      nextTime += sixteenth;
      step = (step + 1) % STEPS;
    }
  }
  function paint() {
    while (queue.length && queue[0].t <= ctx.currentTime) {
      var q = queue.shift();
      VOICES.forEach(function (v) {
        for (var i = 0; i < STEPS; i++) cells[v[0]][i].classList.toggle('now', i === q.s);
      });
    }
    if (running) raf = requestAnimationFrame(paint);
  }
  function start() {
    audio(); running = true; step = 0; queue = [];
    nextTime = ctx.currentTime + 0.06;
    timer = setInterval(schedule, 25); schedule(); raf = requestAnimationFrame(paint);
    playBtn.textContent = 'Stop';
  }
  function stop() {
    running = false; clearInterval(timer); cancelAnimationFrame(raf); playBtn.textContent = 'Play';
    VOICES.forEach(function (v) { cells[v[0]].forEach(function (b) { b.classList.remove('now'); }); });
  }

  playBtn.addEventListener('click', function () { running ? stop() : start(); });
  tempo.addEventListener('input', function () { setTempo(tempo.value); });
  swing.addEventListener('input', function () { setSwing(swing.value); });
  document.getElementById('bm-clear').addEventListener('click', function () { loadPattern({}); note.textContent = ''; });

  var presetBox = document.getElementById('bm-presets');
  Object.keys(PRESETS).forEach(function (name) {
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = name;
    b.addEventListener('click', function () {
      var pr = PRESETS[name]; loadPattern(pr.p); setTempo(pr.bpm); setSwing(pr.swing); note.textContent = '';
    });
    presetBox.appendChild(b);
  });

  // Save a beat in the page address so it can be shared
  function encode() {
    var parts = VOICES.map(function (v) { return parseInt(pat[v[0]].join(''), 2).toString(16); });
    return 't' + tempo.value + 's' + swing.value + 'p' + parts.join('.');
  }
  function decode(h) {
    var m = /^t(\d+)s(\d+)p([0-9a-f.]+)$/.exec(h);
    if (!m) return false;
    var parts = m[3].split('.');
    if (parts.length !== VOICES.length) return false;
    setTempo(Math.max(60, Math.min(180, Number(m[1])))); setSwing(Math.max(0, Math.min(60, Number(m[2]))));
    VOICES.forEach(function (v, k) {
      var bits = ('0000000000000000' + parseInt(parts[k] || '0', 16).toString(2)).slice(-STEPS);
      for (var i = 0; i < STEPS; i++) setCell(v[0], i, bits.charAt(i) === '1');
    });
    return true;
  }
  document.getElementById('bm-share').addEventListener('click', function () {
    var url = location.origin + location.pathname + '#' + encode();
    history.replaceState(null, '', '#' + encode());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { note.textContent = 'Link copied. Paste it anywhere to share this beat.'; },
        function () { note.textContent = 'The link is in the address bar. Copy it from there.'; });
    } else { note.textContent = 'The link is in the address bar. Copy it from there.'; }
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'button' || tag === 'a') return;
    if (e.code === 'Space') { e.preventDefault(); running ? stop() : start(); }
  });

  setTempo(100); setSwing(0);
  if (!decode(location.hash.slice(1))) loadPattern(PRESETS['Rock'].p);
})();
