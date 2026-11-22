// Phone menu: open and close the nav panel.
(function () {
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!toggle || !nav) return;
  function close() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });
})();

// Beat machine on the home page: three drum voices, 16 steps, sounds made in the browser.
(function () {
  var box = document.getElementById('beat');
  if (!box) return;
  var pattern = {
    hat:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    snare: [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    kick:  [1,0,0,0, 0,0,0,0, 1,0,1,0, 0,0,0,0]
  };
  var names = { hat: 'Hi-hat', snare: 'Snare', kick: 'Kick' };
  var cells = {};
  var rows = box.querySelector('.beat-rows');
  Object.keys(pattern).forEach(function (voice) {
    var row = document.createElement('div');
    row.className = 'beat-row';
    row.setAttribute('data-voice', voice);
    var label = document.createElement('span');
    label.textContent = names[voice];
    var steps = document.createElement('div');
    steps.className = 'beat-steps';
    cells[voice] = pattern[voice].map(function (on, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', names[voice] + ', step ' + (i + 1) + ' of 16');
      b.addEventListener('click', function () {
        pattern[voice][i] = pattern[voice][i] ? 0 : 1;
        b.setAttribute('aria-pressed', pattern[voice][i] ? 'true' : 'false');
        if (pattern[voice][i]) { ensureAudio(); hit(voice, ctx.currentTime); }
      });
      steps.appendChild(b);
      return b;
    });
    row.appendChild(label);
    row.appendChild(steps);
    rows.appendChild(row);
  });

  var ctx = null, noise = null, timer = null, step = 0;
  var playBtn = box.querySelector('.beat-play');
  var tempo = box.querySelector('.beat-tempo');
  var out = box.querySelector('output');

  function ensureAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    var len = ctx.sampleRate * 0.4;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noise.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  function burst(t, freq, type, dur, vol) {
    var src = ctx.createBufferSource(); src.buffer = noise;
    var f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    src.start(t); src.stop(t + dur);
  }
  function tone(t, from, to, dur, vol) {
    var o = ctx.createOscillator(); var g = ctx.createGain();
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  function hit(voice, t) {
    if (voice === 'kick') tone(t, 150, 45, 0.32, 0.9);
    if (voice === 'snare') { burst(t, 1800, 'highpass', 0.18, 0.5); tone(t, 220, 140, 0.1, 0.35); }
    if (voice === 'hat') burst(t, 7000, 'highpass', 0.05, 0.22);
  }
  function tick() {
    Object.keys(pattern).forEach(function (voice) {
      cells[voice].forEach(function (b, i) { b.classList.toggle('now', i === step); });
      if (pattern[voice][step]) hit(voice, ctx.currentTime + 0.01);
    });
    step = (step + 1) % 16;
    timer = setTimeout(tick, 60000 / Number(tempo.value) / 4);
  }
  function stop() {
    clearTimeout(timer); timer = null; step = 0;
    playBtn.textContent = 'Play';
    Object.keys(cells).forEach(function (v) { cells[v].forEach(function (b) { b.classList.remove('now'); }); });
  }
  playBtn.addEventListener('click', function () {
    if (timer) { stop(); return; }
    ensureAudio();
    playBtn.textContent = 'Stop';
    tick();
  });
  tempo.addEventListener('input', function () { out.textContent = tempo.value + ' bpm'; });
})();

// Preview switch for PCs with animations turned off: ?motion=1 shows the button shimmer anyway.
if (/[?&]motion=1/.test(location.search)) document.documentElement.classList.add('force-motion');

// Sliding reviews: arrow buttons move one card; slides on its own every 6 seconds when motion is allowed.
(function () {
  var slider = document.querySelector('.review-slider');
  if (!slider) return;
  var motionOk = document.documentElement.classList.contains('force-motion') ||
    !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function step(dir) {
    var card = slider.querySelector('.review');
    var gap = parseFloat(getComputedStyle(slider).columnGap) || 0;
    var by = card.getBoundingClientRect().width + gap;
    var max = slider.scrollWidth - slider.clientWidth;
    var to = slider.scrollLeft + dir * by;
    if (dir > 0 && slider.scrollLeft >= max - 4) to = 0;
    if (dir < 0 && slider.scrollLeft <= 4) to = max;
    slider.scrollTo({ left: to, behavior: motionOk ? 'smooth' : 'auto' });
  }
  var timer = null;
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() { if (motionOk && !timer) timer = setInterval(function () { step(1); }, 6000); }
  var userStopped = false;
  var nav = document.querySelectorAll('.slider-btn');
  for (var i = 0; i < nav.length; i++) {
    nav[i].addEventListener('click', function () { userStopped = true; stop(); step(Number(this.getAttribute('data-dir'))); });
  }
  ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(function (ev) {
    slider.addEventListener(ev, function () { userStopped = true; stop(); }, { passive: true });
  });
  slider.addEventListener('mouseenter', stop);
  slider.addEventListener('mouseleave', function () { if (!userStopped) start(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { if (e[0].isIntersecting && !userStopped) start(); else stop(); }, { threshold: 0.4 }).observe(slider);
  } else { start(); }
})();
