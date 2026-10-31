/* ちえの もり ―― 画面（ui.js・古い Safari で動く書き方だけ） */
(function (global) {
  'use strict';
  var CM = global.CM, doc = global.document;
  var S = CM.loadState();          /* きろく */
  var G = null;                    /* いま あそんでいる 1まわり */
  var T = null;                    /* てんせん の 手もと */
  var screen = 'home';

  function el(id) { return doc.getElementById(id); }
  function setText(node, text) { if (node) { node.textContent = text; } }
  function show(id) {
    var ids = ['scr-home', 'scr-play', 'scr-result', 'scr-zukan', 'scr-grown'], i;
    for (i = 0; i < ids.length; i++) { el(ids[i]).style.display = (ids[i] === 'scr-' + id) ? 'block' : 'none'; }
    screen = id;
    if (id === 'home') { checkUpdate(); reloadIfIdle(); }
    global.scrollTo(0, 0);
  }
  function on(id, fn) { var n = el(id); if (n) { n.addEventListener('click', fn, false); } }
  function sizeCanvas(c, w, h) { c.style.width = w + 'px'; c.style.height = h + 'px'; c.setAttribute('width', String(w)); c.setAttribute('height', String(h)); }

  /* ================= はじめの がめん ================= */
  function renderHome() {
    var who = S.name ? S.name + ' の' : '', stage = CM.stageOf(S.cLeaves), pic = CM.PICS[S.cIndex % CM.PICS.length];
    var next = CM.nextRankAt(S.total), need = CM.GROW[3] - S.cLeaves, i, g, st, box = el('genre-list'), b;
    setText(el('home-rank'), who + ' かんむり：' + CM.rankOf(S.total));
    setText(el('home-leaves'), 'はっぱ ' + S.total + 'まい' + (next !== null ? '（つぎの かんむりまで あと ' + (next - S.total) + 'まい）' : '（いちばん うえ！）'));
    setText(el('home-stage'), CM.STAGE_NAME[stage] + (stage === 3 ? '' : '（せいちゅうまで あと ' + need + 'まい）'));
    setText(el('home-creature'), stage >= 2 ? pic.name + ' に なるかな？' : 'なにに なるかな？');
    CM.paintStage(el('home-egg'), stage, pic.id);
    setText(el('home-zukan-count'), 'ずかん ' + S.zukan.length + 'ひき');
    setText(el('home-ver'), '（v' + CM.APP_VERSION + '）');
    box.innerHTML = '';
    for (i = 0; i < CM.GENRES.length; i++) {
      g = CM.GENRES[i]; st = S.g[g.id];
      b = doc.createElement('button'); b.className = 'gbtn g-' + g.id; b.setAttribute('data-g', g.id);
      b.innerHTML = '<b>' + g.name + '</b><span>' + g.sub + '</span><span class="rec">' + CM.LEVEL_NAME[st.level] + (st.rounds ? '・' + st.ok + '／' + st.q + ' せいかい' : '') + '</span>';
      box.appendChild(b);
    }
    b = doc.createElement('button'); b.className = 'gbtn g-mix'; b.setAttribute('data-g', 'mix');
    b.innerHTML = '<b>まぜまぜ</b><span>いろいろな もんだいが つぎつぎ でる（ほんばんみたい）</span><span class="rec">' + (S.mix.rounds ? S.mix.ok + '／' + S.mix.q + ' せいかい' : '') + '</span>';
    box.appendChild(b);
  }

  /* ================= あそぶ ================= */
  function startRound(gid) {
    var i, qs = [], order, lv;
    if (gid === 'mix') {
      order = [];
      while (order.length < S.perRound) { order = order.concat(CM.shuffle(CM.GENRES).map ? CM.shuffle(CM.GENRES).map(function (g) { return g.id; }) : []); }
      for (i = 0; i < S.perRound; i++) { qs.push(CM.makeQuestion(order[i], S.g[order[i]].level)); }
    } else {
      lv = S.g[gid].level;
      for (i = 0; i < S.perRound; i++) { qs.push(CM.makeQuestion(gid, lv)); }
    }
    G = { gid: gid, qs: qs, idx: 0, ok: 0, firstOk: 0, firstOkMain: 0, leaves: 0, tries: 0, done: false, streak: 0, hint: false, planned: qs.length };
    show('play');
    renderQuestion();
  }

  function stemSize(q) {
    if (q.g === 'tonneru') { return [440, 300]; }
    if (q.g === 'kasane') { return [440, 190]; }
    if (q.g === 'shiso') { return [340, 300]; }
    if (q.g === 'kazoe') { return [320, 300]; }
    return [270, 270];
  }
  function paintStem(q, canvas) {
    var h = !!(G && G.hint);
    if (q.g === 'ten') { CM.paintDotFig(canvas, q.n, q.model, {}); }
    else if (q.g === 'kagami') { CM.paintKagamiStem(canvas, q, h); }
    else if (q.g === 'kazoe') { CM.paintKazoe(canvas, q, h); }
    else if (q.g === 'shiso') { CM.paintShiso(canvas, q, h); }
    else if (q.g === 'tonneru') { CM.paintTonneru(canvas, q, h); }
    else if (q.g === 'onaji') { CM.paintGridFig(canvas, q.base, 0); }
    else if (q.g === 'kasane') { CM.paintKasaneStem(canvas, q, h); }
  }
  function paintChoice(q, i, canvas) {
    if (q.g === 'kagami' || q.g === 'kasane') { CM.paintDotFig(canvas, q.n, q.choices[i], {}); }
    else if (q.g === 'onaji') { CM.paintGridFig(canvas, q.choices[i], 0); }
    else if (q.g === 'shiso') { CM.paintShape(canvas, q.choices[i]); }
  }

  function renderQuestion() {
    var q = G.qs[G.idx], box = el('choices'), i, c, wrap, lab, g = CM.genreById(q.g), sz = stemSize(q), stem = el('q-stem');
    G.tries = 0; G.done = false; G.hint = false;
    setText(el('play-genre'), g.name + '（' + CM.LEVEL_NAME[q.level] + '）' + (q.retest ? '・にた もんだい' : ''));
    setText(el('play-no'), (G.idx + 1) + ' ／ ' + G.qs.length + ' もんめ');
    setText(el('q-text'), CM.questionText(q));
    sizeCanvas(stem, sz[0], sz[1]);
    el('q-stem-wrap').className = 'qstem ' + (sz[0] > sz[1] * 1.3 ? 'wide' : 'square');
    paintStem(q, stem);
    box.innerHTML = '';
    el('ten-box').style.display = 'none';
    box.style.display = '';
    if (q.kind === 'tap') {
      box.style.display = 'none';
      el('ten-box').style.display = 'block';
      T = { cur: null, set: {}, hist: [], ghost: false };
      paintTen();
      setText(el('msg'), 'てんを じゅんばんに タップして、ひだりと おなじ かたちに してね');
    } else {
      for (i = 0; i < q.choices.length; i++) {
        wrap = doc.createElement('div'); wrap.className = 'choice' + (q.numeric ? ' choice-num' : (q.shapeChoices ? ' choice-shape' : '')); wrap.setAttribute('data-i', String(i));
        if (q.numeric) { wrap.innerHTML = '<div class="cnum">' + q.choices[i] + '</div>'; }
        else { c = doc.createElement('canvas'); c.className = 'cv'; sizeCanvas(c, q.shapeChoices ? 110 : 150, q.shapeChoices ? 110 : 150); wrap.appendChild(c); }
        lab = doc.createElement('div'); lab.className = 'mark'; wrap.appendChild(lab);
        box.appendChild(wrap);
      }
      paintChoices();
      setText(el('msg'), 'どれかな？ タップしてね');
    }
    el('msg').className = 'msg';
    el('next-btn').style.display = 'none';
    CM.snd.say(CM.questionText(q));
  }
  function paintChoices() {
    var q = G.qs[G.idx], nodes = el('choices').getElementsByTagName('canvas'), i;
    for (i = 0; i < nodes.length; i++) { paintChoice(q, i, nodes[i]); }
  }
  function choiceNodes() { return el('choices').getElementsByClassName('choice'); }

  function gotRight() {
    var leaves = (G.tries === 0) ? 2 : 1, bonus = '';
    G.done = true;
    G.ok++; if (G.tries === 0) { G.firstOk++; G.streak++; if (!G.qs[G.idx].retest) { G.firstOkMain++; } } else { G.streak = 0; }
    if (G.streak >= 3) { leaves += 1; bonus = '（3もん れんぞく！ ボーナス ＋1）'; CM.snd.play('combo'); } else { CM.snd.play(G.tries === 0 ? 'ok' : 'ok2'); }
    G.leaves += leaves;
    setText(el('msg'), 'せいかい！ ' + (G.tries === 0 ? CM.praise() + '。' : 'なおせたね。') + 'はっぱ ' + leaves + 'まい ' + bonus);
    el('msg').className = 'msg good';
    el('next-btn').style.display = 'inline-block';
  }
  function onChoice(i) {
    var q = G.qs[G.idx], nodes = choiceNodes(), node = nodes[i];
    if (G.done || q.kind === 'tap') { return; }
    if (i === q.answerIndex) {
      node.className += ' right';
      setText(node.getElementsByClassName('mark')[0], '✓ せいかい');
      gotRight();
    } else {
      G.tries++; G.streak = 0;
      node.className += ' wrong';
      setText(node.getElementsByClassName('mark')[0], '！ ちがう');
      if (G.tries === 1) {
        /* 足場 1段目＝やり方の ヒント＋見る場所を 絵で しぼる（答えは 見せない） */
        CM.snd.play('oshii');
        G.hint = true;
        paintStem(q, el('q-stem'));
        if (q.g === 'onaji') { CM.paintGridFig(node.getElementsByTagName('canvas')[0], q.choices[i], 0, q.choices[q.answerIndex]); }
        setText(el('msg'), 'おしい！ ' + CM.hintText(q));
        el('msg').className = 'msg warn';
      } else {
        /* 足場 2段目＝解き方つきの 答え（例題）→ つぎに 同じ型の 似た問題を 1つ はさむ */
        G.done = true;
        CM.snd.play('kotae');
        nodes[q.answerIndex].className += ' right';
        setText(nodes[q.answerIndex].getElementsByClassName('mark')[0], '✓ こたえ');
        setText(el('msg'), 'こたえは これ。' + whyText(q) + planRetest(q));
        el('msg').className = 'msg warn';
        el('next-btn').style.display = 'inline-block';
      }
    }
  }
  /* 2回目の まちがいの あと＝同じ型・同じレベルの 似た問題を すぐ 1つ 足す（1問に つき 1回まで） */
  function planRetest(q) {
    var nq;
    if (q.retest) { return ''; }
    nq = CM.makeQuestion(q.g, q.level); nq.retest = true;
    G.qs.splice(G.idx + 1, 0, nq);
    return ' つぎは にた もんだいで もういちど。';
  }
  function whyText(q) {
    if (q.g === 'kazoe') { return CM.SHAPE_NAMES[q.target] + ' は ' + q.answer + 'こ あったよ'; }
    if (q.g === 'tonneru') { return 'はじめ ' + q.start + 'こ → ' + q.answer + 'こ'; }
    if (q.g === 'shiso') { return 'おもい じゅんに ' + shapeList(q.order) + ' だよ'; }
    return 'つぎは よく みて えらんでみよう';
  }
  function shapeList(arr) { var i, s = []; for (i = 0; i < arr.length; i++) { s.push(CM.SHAPE_NAMES[arr[i]]); } return s.join('・'); }

  /* ================= てんせん（点を タップして かく） ================= */
  function paintTen() {
    var q = G.qs[G.idx], canvas = el('ten-canvas'), c = CM.setupCanvas(canvas), s = Math.min(c.w, c.h), m, cur;
    c.ctx.fillStyle = CM.COL.kami; c.ctx.fillRect(0, 0, c.w, c.h);
    c.ctx.strokeStyle = CM.COL.sumi; c.ctx.lineWidth = 3; c.ctx.strokeRect(1.5, 1.5, c.w - 3, c.h - 3);
    if (T.ghost) { CM.drawDots(c.ctx, q.n, s, q.model, { color: '#bcdcf5', lw: 10, dots: false }); }
    m = CM.drawDots(c.ctx, q.n, s, T.set, { color: CM.COL.ao, dotColor: CM.COL.sumi, lw: 6 });
    if (T.cur) {
      cur = T.cur;
      c.ctx.beginPath(); c.ctx.arc(m.pad + cur[0] * m.step, m.pad + cur[1] * m.step, 11, 0, Math.PI * 2);
      c.ctx.strokeStyle = CM.COL.daidai; c.ctx.lineWidth = 4; c.ctx.stroke();
    }
    T.geom = m;
  }
  function tenTap(ev) {
    var canvas = el('ten-canvas'), rect = canvas.getBoundingClientRect(), x, y, q = G.qs[G.idx], m = T.geom, px, py, i, j, best = null, bd = 1e9, d, segs, added = [], k, t;
    if (G.done) { return; }
    t = (ev.changedTouches && ev.changedTouches[0]) || ev;
    x = t.clientX - rect.left; y = t.clientY - rect.top;
    for (i = 0; i < q.n; i++) { for (j = 0; j < q.n; j++) { px = m.pad + i * m.step; py = m.pad + j * m.step; d = (px - x) * (px - x) + (py - y) * (py - y); if (d < bd) { bd = d; best = [i, j]; } } }
    if (bd > (m.step * 0.45) * (m.step * 0.45)) { return; }
    CM.snd.play('dot');
    if (!T.cur) { T.cur = best; paintTen(); return; }
    if (T.cur[0] === best[0] && T.cur[1] === best[1]) { return; }
    segs = CM.unitSegs(T.cur, best);
    if (segs === null) { setText(el('msg'), 'たて・よこ・ななめに まっすぐ つなげてね'); el('msg').className = 'msg warn'; return; }
    for (i = 0; i < segs.length; i++) { k = CM.segKey(segs[i][0], segs[i][1]); if (!T.set[k]) { T.set[k] = segs[i]; added.push(k); } }
    T.hist.push({ from: T.cur, keys: added });
    T.cur = best;
    paintTen();
  }
  function tenUndo() {
    var h, i;
    if (G.done || !T.hist.length) { if (!G.done) { T.cur = null; paintTen(); } return; }
    h = T.hist.pop();
    for (i = 0; i < h.keys.length; i++) { delete T.set[h.keys[i]]; }
    T.cur = h.from; paintTen();
  }
  function tenClear() { if (G.done) { return; } T.set = {}; T.hist = []; T.cur = null; paintTen(); }
  function tenLift() { if (G.done) { return; } T.cur = null; paintTen(); }
  function tenCheck() {
    var q = G.qs[G.idx], sig = CM.segSetSig(T.set), n = 0, k;
    if (G.done) { return; }
    for (k in T.set) { if (T.set.hasOwnProperty(k)) { n++; } }
    if (n === 0) { setText(el('msg'), 'まだ なにも かいていないよ'); el('msg').className = 'msg warn'; return; }
    if (sig === q.modelSig) { T.cur = null; paintTen(); gotRight(); return; }
    G.tries++; G.streak = 0;
    if (G.tries === 1) {
      CM.snd.play('oshii');
      T.ghost = true; G.hint = true; paintTen();
      setText(el('msg'), 'おしい！ ' + CM.hintText(q));
      el('msg').className = 'msg warn';
    } else {
      G.done = true; CM.snd.play('kotae');
      T.set = {}; T.cur = null; T.ghost = false;
      for (k in q.model) { if (q.model.hasOwnProperty(k)) { T.set[k] = q.model[k]; } }
      paintTen();
      setText(el('msg'), 'こたえは これ。はじめの てんの ばしょを よく みてね。' + planRetest(q));
      el('msg').className = 'msg warn';
      el('next-btn').style.display = 'inline-block';
    }
  }

  function onNext() {
    G.idx++;
    if (G.idx >= G.qs.length) { finishRound(); return; }
    renderQuestion();
  }

  function finishRound() {
    var events, i, lines = [], stars = '', adultId = null, st, newLv, gname;
    if (G.gid === 'mix') { st = S.mix; gname = 'まぜまぜ'; }
    else { st = S.g[G.gid]; gname = CM.genreById(G.gid).name; }
    st.rounds++; st.q += G.qs.length; st.ok += G.ok;
    if (G.gid !== 'mix') {
      newLv = CM.nextLevel(st.level, G.firstOkMain, G.planned);   /* 分母は 予定の問題数・にた もんだい は数えない */
      if (newLv > st.level) { lines.push(gname + ' が「' + CM.LEVEL_NAME[newLv] + '」に あがった！'); }
      if (newLv < st.level) { lines.push('つぎは「' + CM.LEVEL_NAME[newLv] + '」で れんしゅう'); }
      st.level = newLv;
    }
    events = CM.addLeaves(S, G.leaves);
    CM.saveState(S);
    for (i = 0; i < G.qs.length; i++) { stars += (i < G.firstOk) ? '★' : (i < G.ok ? '☆' : '・'); }
    setText(el('res-title'), G.ok === G.qs.length ? 'ぜんぶ せいかい！' : 'おつかれさま！');
    setText(el('res-score'), gname + '：' + G.qs.length + 'もんちゅう ' + G.ok + 'もん せいかい');
    setText(el('res-stars'), stars);
    setText(el('res-leaves'), 'はっぱ ＋' + G.leaves + 'まい（ぜんぶで ' + S.total + 'まい）');
    for (i = 0; i < events.length; i++) {
      if (events[i].kind === 'stage') { lines.push(CM.STAGE_NAME[events[i].stage] + ' に なった！'); }
      if (events[i].kind === 'adult') { adultId = events[i].id; lines.push(CM.picById(events[i].id).name + ' が うまれた！ ずかんに はいったよ'); }
      if (events[i].kind === 'lap') { lines.push('ぜんぶの いきものが そろった！ ' + events[i].lap + 'しゅうめ'); }
    }
    CM.snd.play(G.ok === G.qs.length ? 'perfect' : 'round');
    if (adultId || events.length) { CM.snd.play('grow', G.ok === G.qs.length ? 1.5 : 1.1); }
    if (lines.length === 0) { lines.push(CM.STAGE_NAME[CM.stageOf(S.cLeaves)] + ' が そだっているよ（せいちゅうまで あと ' + (CM.GROW[3] - S.cLeaves) + 'まい）'); }
    setText(el('res-events'), lines.join(' ／ '));
    if (adultId) { CM.paintStage(el('res-egg'), 3, adultId); }
    else { CM.paintStage(el('res-egg'), CM.stageOf(S.cLeaves), CM.PICS[S.cIndex % CM.PICS.length].id); }
    show('result');
  }

  /* ================= ずかん ================= */
  function renderZukan() {
    var box = el('zukan-list'), i, pic, card, c, got, cv;
    box.innerHTML = '';
    for (i = 0; i < CM.PICS.length; i++) {
      pic = CM.PICS[i];
      got = 0; for (c = 0; c < S.zukan.length; c++) { if (S.zukan[c] === pic.id) { got++; } }
      card = doc.createElement('div'); card.className = 'zcard' + (got ? '' : ' none');
      cv = doc.createElement('canvas'); sizeCanvas(cv, 120, 120); card.appendChild(cv);
      card.appendChild(doc.createElement('div')).textContent = got ? pic.name + (got > 1 ? ' ×' + got : '') : '？？？';
      box.appendChild(card);
      CM.paintStage(cv, got ? 3 : 0, pic.id);
    }
  }

  /* ================= おとなのひと ================= */
  function renderGrown() {
    var t = el('grown-table'), i, rows = '', g, st;
    el('grown-name').value = S.name || '';
    el('grown-per').value = String(S.perRound);
    el('grown-snd').value = (S.sound === false) ? 'off' : 'on';
    el('grown-voice').value = (S.voice === false) ? 'off' : 'on';
    for (i = 0; i < CM.GENRES.length; i++) {
      g = CM.GENRES[i]; st = S.g[g.id];
      rows += '<tr><td>' + g.name + '</td><td>' + CM.LEVEL_NAME[st.level] + '</td><td>' + st.rounds + '</td><td>' + st.q + '</td><td>' + st.ok + '</td></tr>';
    }
    rows += '<tr><td>まぜまぜ</td><td>−</td><td>' + S.mix.rounds + '</td><td>' + S.mix.q + '</td><td>' + S.mix.ok + '</td></tr>';
    t.innerHTML = '<tr><th>もんだい</th><th>レベル</th><th>まわり</th><th>もんだい</th><th>せいかい</th></tr>' + rows;
    setText(el('grown-ver'), 'はんすう ' + CM.APP_VERSION + '・はっぱ ' + S.total + '・ずかん ' + S.zukan.length);
    el('reset-2').style.display = 'none';
  }
  var holdTimer = null;
  function holdStart() { holdTimer = global.setTimeout(function () { holdTimer = null; renderGrown(); show('grown'); }, 1200); }
  function holdEnd() { if (holdTimer) { global.clearTimeout(holdTimer); holdTimer = null; } }

  /* ================= 版の 取りなおし（くるくる ずけい と同型） ================= */
  var UPD_KEY = 'chie_upd';
  function tidyUrl() {
    if (!global.history || !global.history.replaceState) { return; }
    if (global.location.search.indexOf('v=') < 0) { return; }
    try { global.history.replaceState(null, '', global.location.pathname); } catch (e) { /* 見ためだけ */ }
  }
  function checkUpdate() {
    var x;
    if (!global.XMLHttpRequest) { return; }
    try { x = new global.XMLHttpRequest(); } catch (e) { return; }
    try { x.open('GET', 'version.txt?t=' + (new Date()).getTime(), true); } catch (e2) { return; }
    x.onreadystatechange = function () {
      var v, now, last = null, part;
      if (x.readyState !== 4 || x.status !== 200) { return; }
      v = parseInt(String(x.responseText).replace(/[^0-9]/g, ''), 10);
      now = (new Date()).getTime();
      if (!(v > CM.APP_VERSION)) { return; }
      try { last = global.sessionStorage.getItem(UPD_KEY); } catch (e3) { /* 無くても進む */ }
      if (last) { part = String(last).split(':'); if (part[0] === String(v) && (now - parseInt(part[1], 10)) < 30000) { return; } }
      if (screen !== 'home') { return; }
      try { global.sessionStorage.setItem(UPD_KEY, v + ':' + now); } catch (e4) { /* 無くても進む */ }
      global.location.replace('./?v=' + v);
    };
    try { x.send(null); } catch (e5) { /* 通信できなくても あそべる */ }
  }
  var cacheReady = false;
  function reloadIfIdle() { if (!cacheReady || screen !== 'home') { return; } cacheReady = false; global.location.reload(); }
  function watchCache() {
    var ac = global.applicationCache;
    if (!ac || !ac.addEventListener) { return; }
    ac.addEventListener('updateready', function () { try { ac.swapCache(); } catch (e) { /* つぎに */ } cacheReady = true; reloadIfIdle(); }, false);
  }

  /* ================= 押したときの 受けとり ================= */
  function init() {
    var gb = el('grown-btn'), tc = el('ten-canvas'), touched = false;
    el('genre-list').addEventListener('click', function (ev) {
      var t = ev.target, n = 0;
      while (t && n < 4) { if (t.getAttribute && t.getAttribute('data-g')) { startRound(t.getAttribute('data-g')); return; } t = t.parentNode; n++; }
    }, false);
    on('zukan-btn', function () { renderZukan(); show('zukan'); });
    on('zukan-back', function () { renderHome(); show('home'); });
    on('play-back', function () { try { global.speechSynthesis && global.speechSynthesis.cancel(); } catch (e) { /* なくても */ } renderHome(); show('home'); });
    on('next-btn', onNext);
    on('say-btn', function () { CM.snd.say(CM.questionText(G.qs[G.idx])); });
    on('res-again', function () { startRound(G.gid); });
    on('res-home', function () { renderHome(); show('home'); });
    on('ten-undo', tenUndo); on('ten-clear', tenClear); on('ten-lift', tenLift); on('ten-check', tenCheck);
    el('choices').addEventListener('click', function (ev) {
      var t = ev.target, n = 0;
      while (t && n < 5) { if (t.getAttribute && t.getAttribute('data-i') !== null) { onChoice(parseInt(t.getAttribute('data-i'), 10)); return; } t = t.parentNode; n++; }
    }, false);
    /* てんせん＝ゆびで さわった ところを すぐ 受ける（クリックより はやい）。両方 来たら 1回だけ */
    tc.addEventListener('touchstart', function (ev) { ev.preventDefault(); touched = true; tenTap(ev); }, false);
    tc.addEventListener('mousedown', function (ev) { if (touched) { touched = false; return; } tenTap(ev); }, false);
    gb.addEventListener('touchstart', function (ev) { ev.preventDefault(); holdStart(); }, false);
    gb.addEventListener('touchend', holdEnd, false); gb.addEventListener('touchcancel', holdEnd, false);
    gb.addEventListener('mousedown', holdStart, false); gb.addEventListener('mouseup', holdEnd, false); gb.addEventListener('mouseleave', holdEnd, false);
    on('grown-back', function () { renderHome(); show('home'); });
    on('grown-save', function () {
      S.name = String(el('grown-name').value || '').slice(0, 8);
      S.perRound = parseInt(el('grown-per').value, 10) === 10 ? 10 : 5;
      S.sound = el('grown-snd').value !== 'off'; S.voice = el('grown-voice').value !== 'off';
      CM.snd.on = S.sound; CM.snd.voice = S.voice;
      CM.saveState(S); renderHome(); show('home');
    });
    on('reset-1', function () { el('reset-2').style.display = 'inline-block'; });
    on('reset-2', function () {
      var keep = { name: S.name, perRound: S.perRound, sound: S.sound, voice: S.voice };
      S = CM.freshState(); S.name = keep.name; S.perRound = keep.perRound; S.sound = keep.sound; S.voice = keep.voice;
      CM.saveState(S); renderGrown(); setText(el('grown-ver'), 'きろくを けしました');
    });
    global.addEventListener('resize', function () {
      if (screen === 'play' && G) { paintStem(G.qs[G.idx], el('q-stem')); paintChoices(); if (T && G.qs[G.idx].kind === 'tap') { paintTen(); } }
      if (screen === 'home') { renderHome(); }
    }, false);
    CM.snd.on = (S.sound !== false); CM.snd.voice = (S.voice !== false);
    doc.addEventListener('touchend', function () { CM.snd.unlock(); }, false);
    doc.addEventListener('click', function (ev) { CM.snd.unlock(); if (ev.target && ev.target.tagName === 'BUTTON') { CM.snd.play('tap'); } }, false);
    tidyUrl();
    watchCache();
    renderHome();
    show('home');
  }
  /* 試験用＝画面を 直接 うごかす 入口 */
  CM.ui = { startRound: startRound, tenTap: tenTap, tenCheck: tenCheck, state: function () { return S; }, round: function () { return G; }, ten: function () { return T; } };

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init, false); } else { init(); }
})(window);
