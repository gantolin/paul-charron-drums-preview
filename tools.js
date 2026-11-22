// Practice tools for Paul Charron Drums: metronome and practice timer.
// Sounds are made in the browser (Web Audio). Nothing is sent anywhere.

function $(sel, root) { return (root || document).querySelector(sel); }

/* ---------------- Metronome ---------------- */
(function () {
  var box = document.getElementById('metro');
  if (!box) return;

  var bpmOut = $('#metro-bpm'), nameOut = $('#metro-name'), slider = $('#metro-slider');
  var dotsBox = $('#metro-dots'), dial = $('.metro-dial', box), startBtn = $('#metro-start');
  var beatsSel = $('#metro-beats'), subSel = $('#metro-sub'), accentChk = $('#metro-accent');
  var trainChk = $('#metro-train'), trainStep = $('#metro-train-step'), trainBars = $('#metro-train-bars');
  var st = { bpm: 100, beats: 4, sub: 1, running: false };
  var ctx = null, timer = null, nextTime = 0, tick = 0, bars = 0, queue = [], raf = null, taps = [];

  var NAMES = [[60, 'Largo'], [76, 'Adagio'], [108, 'Andante'], [120, 'Moderato'], [156, 'Allegro'], [176, 'Vivace'], [999, 'Presto']];

  function setBpm(v) {
    st.bpm = Math.max(30, Math.min(260, Math.round(v)));
    bpmOut.textContent = st.bpm;
    slider.value = st.bpm;
    for (var i = 0; i < NAMES.length; i++) { if (st.bpm < NAMES[i][0]) { nameOut.textContent = NAMES[i][1]; break; } }
  }

  function drawDots() {
    dotsBox.innerHTML = '';
    for (var i = 0; i < st.beats; i++) {
      var a = (i / st.beats) * Math.PI * 2 - Math.PI / 2;
      var d = document.createElement('span');
      d.className = 'metro-dot' + (i === 0 ? ' first' : '');
      d.style.left = (50 + 43 * Math.cos(a)) + '%';
      d.style.top = (50 + 43 * Math.sin(a)) + '%';
      dotsBox.appendChild(d);
    }
  }

  function click(t, kind) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = kind === 'accent' ? 1760 : kind === 'beat' ? 1175 : 784;
    var vol = kind === 'accent' ? 0.9 : kind === 'beat' ? 0.6 : 0.28;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + 0.08);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.12) {
      var perBar = st.beats * st.sub;
      var pos = tick % perBar;
      var beat = Math.floor(pos / st.sub), onBeat = pos % st.sub === 0;
      if (pos === 0 && tick > 0) {
        bars++;
        if (trainChk.checked && bars % Math.max(1, Number(trainBars.value)) === 0) setBpm(st.bpm + Number(trainStep.value));
      }
      click(nextTime, onBeat ? (beat === 0 && accentChk.checked ? 'accent' : 'beat') : 'sub');
      if (onBeat) queue.push({ t: nextTime, beat: beat });
      nextTime += 60 / st.bpm / st.sub;
      tick++;
    }
  }

  function paint() {
    while (queue.length && queue[0].t <= ctx.currentTime) {
      var q = queue.shift(), dots = dotsBox.children;
      for (var i = 0; i < dots.length; i++) dots[i].classList.toggle('on', i === q.beat);
      dial.classList.toggle('hit', q.beat === 0);
    }
    if (st.running) raf = requestAnimationFrame(paint);
  }

  function start() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    st.running = true; tick = 0; bars = 0; queue = [];
    nextTime = ctx.currentTime + 0.08;
    timer = setInterval(schedule, 25); schedule();
    raf = requestAnimationFrame(paint);
    startBtn.textContent = 'Stop';
  }
  function stop() {
    st.running = false; clearInterval(timer); cancelAnimationFrame(raf);
    startBtn.textContent = 'Start';
    for (var i = 0; i < dotsBox.children.length; i++) dotsBox.children[i].classList.remove('on');
    dial.classList.remove('hit');
  }

  startBtn.addEventListener('click', function () { st.running ? stop() : start(); });
  slider.addEventListener('input', function () { setBpm(slider.value); });
  box.querySelectorAll('[data-step]').forEach(function (b) {
    b.addEventListener('click', function () { setBpm(st.bpm + Number(b.getAttribute('data-step'))); });
  });
  box.querySelectorAll('[data-bpm]').forEach(function (b) {
    b.addEventListener('click', function () { setBpm(Number(b.getAttribute('data-bpm'))); });
  });
  beatsSel.addEventListener('change', function () { st.beats = Number(beatsSel.value); drawDots(); tick = 0; });
  subSel.addEventListener('change', function () { st.sub = Number(subSel.value); tick = 0; });
  $('#metro-tap').addEventListener('click', function () {
    var now = performance.now();
    if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
    taps.push(now);
    if (taps.length > 5) taps.shift();
    if (taps.length >= 2) setBpm(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
  });
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'button' || tag === 'a') return;
    if (e.code === 'Space') { e.preventDefault(); st.running ? stop() : start(); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setBpm(st.bpm + 1); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setBpm(st.bpm - 1); }
  });

  setBpm(100); drawDots();
})();

/* ---------------- Practice timer ---------------- */
(function () {
  var box = document.getElementById('ptimer');
  if (!box) return;

  var DEFAULT = [['Warm-up', 0.2], ['Technique', 0.3], ['Groove or song', 0.4], ['Free play', 0.1]];
  var KEY = 'pcd-practice-blocks';
  var rowsBox = $('#pt-rows'), timeOut = $('#pt-time'), blockOut = $('#pt-block'), nextOut = $('#pt-next');
  var ring = $('#pt-ring'), startBtn = $('#pt-start'), totalOut = $('#pt-total'), doneOut = $('#pt-done');
  var CIRC = 2 * Math.PI * 130;
  var blocks = [], idx = 0, left = 0, endAt = 0, timer = null, running = false, ctx = null, lock = null;

  function split(total) {
    var out = DEFAULT.map(function (d) { return { name: d[0], min: Math.max(1, Math.round(total * d[1])) }; });
    var diff = total - out.reduce(function (s, b) { return s + b.min; }, 0);
    out[2].min = Math.max(1, out[2].min + diff);
    return out;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(blocks)); } catch (e) {} }
  function load() {
    try { var b = JSON.parse(localStorage.getItem(KEY)); if (b && b.length) return b; } catch (e) {}
    return split(20);
  }
  function fmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function total() { return blocks.reduce(function (s, b) { return s + b.min; }, 0); }

  function drawRows() {
    rowsBox.innerHTML = '';
    blocks.forEach(function (b, i) {
      var li = document.createElement('li');
      if (i === idx && (running || left)) li.className = 'now';
      var name = document.createElement('input');
      name.type = 'text'; name.value = b.name; name.setAttribute('aria-label', 'Name of block ' + (i + 1));
      name.addEventListener('input', function () { b.name = name.value; save(); show(); });
      var min = document.createElement('input');
      min.type = 'number'; min.min = 1; min.max = 90; min.value = b.min; min.setAttribute('aria-label', 'Minutes for ' + b.name);
      min.addEventListener('change', function () {
        b.min = Math.max(1, Math.min(90, Number(min.value) || 1)); min.value = b.min; save();
        if (!running) reset(); else totalOut.textContent = total() + ' minutes';
      });
      var unit = document.createElement('span'); unit.textContent = 'min';
      li.appendChild(name); li.appendChild(min); li.appendChild(unit);
      rowsBox.appendChild(li);
    });
    totalOut.textContent = total() + ' minutes';
  }
  function show() {
    var b = blocks[idx];
    timeOut.textContent = fmt(left);
    blockOut.textContent = b ? b.name : '';
    nextOut.textContent = blocks[idx + 1] ? 'Next: ' + blocks[idx + 1].name : 'Last block';
    var whole = b ? b.min * 60 : 1;
    ring.style.strokeDashoffset = String(CIRC * (1 - Math.max(0, left) / whole));
  }
  function chime(n) {
    if (!ctx) return;
    for (var i = 0; i < n; i++) {
      var o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.28;
      o.type = 'sine'; o.frequency.value = [880, 1175, 1568][i % 3];
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.65);
    }
  }
  function step() {
    left = (endAt - Date.now()) / 1000;
    if (left <= 0) {
      if (idx < blocks.length - 1) {
        idx++; left = blocks[idx].min * 60; endAt = Date.now() + left * 1000; chime(2); drawRows();
      } else {
        pause(); left = 0; chime(3);
        doneOut.textContent = 'Done. ' + total() + ' minutes of practice.';
        startBtn.textContent = 'Start again'; idx = 0; left = 0; drawRows(); show();
        return;
      }
    }
    show();
  }
  function start() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    if (left <= 0) { idx = 0; left = blocks[0].min * 60; }
    doneOut.textContent = '';
    endAt = Date.now() + left * 1000; running = true;
    timer = setInterval(step, 250); startBtn.textContent = 'Pause';
    if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }).catch(function () {});
    drawRows(); show();
  }
  function pause() {
    running = false; clearInterval(timer); startBtn.textContent = 'Resume';
    if (lock) { lock.release().catch(function () {}); lock = null; }
  }
  function reset() {
    running = false; clearInterval(timer); idx = 0; left = blocks[0].min * 60;
    startBtn.textContent = 'Start'; doneOut.textContent = ''; drawRows(); show();
  }

  startBtn.addEventListener('click', function () { running ? pause() : start(); });
  $('#pt-reset').addEventListener('click', reset);
  $('#pt-skip').addEventListener('click', function () {
    if (idx < blocks.length - 1) { idx++; left = blocks[idx].min * 60; endAt = Date.now() + left * 1000; drawRows(); show(); }
  });
  box.querySelectorAll('[data-total]').forEach(function (b) {
    b.addEventListener('click', function () { blocks = split(Number(b.getAttribute('data-total'))); save(); reset(); });
  });

  ring.style.strokeDasharray = String(CIRC);
  blocks = load(); reset();
})();
