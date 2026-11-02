/* ちえの もり ―― 小学校受験の ペーパーの もんだいを あそびで（2012年の iPad・iOS 10.3.3 で動く書き方）
   きまり＝
   ・古い Safari で動く書き方だけ（var と function。let/const/アロー/テンプレート文字列は使わない）
   ・絵文字は使わない（この端末の字の在庫は 2016年で止まっている）
   ・端末内保存（localStorage）は try-catch で包み、やり直しの手段を画面に置く
   ・問題は全部 その場で作る（同じ形が また出ることはある）。正解は 機械で確かめてから出す（selfTest）
   もんだいの型（過去問 2022〜2025年度の ペーパーから）＝
     ten     てんせん（点図形の模写）  … 問題4・18・25・35
     kagami  かがみ・みずうみ（鏡図形・水面）… 問題4・17
     kazoe   かぞえる（選んで数える）  … 問題2・19・40
     shiso   シーソー（重さくらべ）     … 問題3・28
     tonneru トンネル（ブラックボックス）… 問題28・41
     onaji   おなじ かたち（同図形・回転同図形）… 問題36
     kasane  かさねる（重ね図形）       … 問題27
   このファイルは tools/build_app.py が index.html へ埋め込む。直すのは src/ だけ。 */
(function (global) {
  'use strict';

  var CM = {};
  /* このファイルを直したら この数字を +1 する。version.txt にも同じ数字を書く（build_app.py が照合する） */
  CM.APP_VERSION = 8;
  CM.SCHEMA = 1;
  CM.STORE_KEY = 'chie_no_mori_v1';

  /* ================= いろ ================= */
  var COL = {
    ao: '#1f77d0', daidai: '#f0932b', murasaki: '#b45fd1', mizu: '#4fc3f7', ki: '#f6d32d',
    midori: '#3cb371', aka: '#e64a4a', sumi: '#1b1b1b', shiro: '#ffffff', usui: '#9aa3ab', kami: '#fffdf7',
    hai: '#c9cfd4'
  };
  CM.COL = COL;

  /* ================= らんすう（試験では たねを 固定できる） ================= */
  var rngState = null;
  function rnd() {
    if (rngState === null) { return Math.random(); }
    rngState = (rngState + 0x6D2B79F5) | 0;
    var t = rngState;
    t = Math.imul ? Math.imul(t ^ (t >>> 15), t | 1) : (((t ^ (t >>> 15)) * (t | 1)) | 0);
    t ^= t + (Math.imul ? Math.imul(t ^ (t >>> 7), t | 61) : (((t ^ (t >>> 7)) * (t | 61)) | 0));
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  CM.seed = function (s) { rngState = (s === null || s === undefined) ? null : (s | 0); };
  function ri(n) { return Math.floor(rnd() * n); }
  function pick(arr) { return arr[ri(arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = ri(i + 1); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  CM.shuffle = shuffle;
  function uniqNums(answer, count, lo, hi) {
    /* answer を含む count 個の ちがう数（lo〜hi）。近い数を まぜて まぎらわしく */
    var out = [answer], tries = 0, v;
    while (out.length < count && tries < 200) {
      tries++;
      v = answer + (ri(7) - 3);
      if (v < lo || v > hi || out.indexOf(v) >= 0) { continue; }
      out.push(v);
    }
    while (out.length < count) { v = lo + ri(hi - lo + 1); if (out.indexOf(v) < 0) { out.push(v); } }
    return shuffle(out);
  }

  /* ================= 絵の 部品 ================= */
  function circle(ctx, x, y, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function ellipse(ctx, x, y, rx, ry, fill, stroke, lw) {
    ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke, lw) {
    var i;
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (i = 1; i < pts.length; i++) { ctx.lineTo(pts[i][0], pts[i][1]); }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }
  function line(ctx, x1, y1, x2, y2, color, lw) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  /* かたち（○●△□×☆）を (0,0) まん中・半径 r で */
  var SHAPE_NAMES = { maru: 'しろまる', kuro: 'くろまる', sankaku: 'さんかく', shikaku: 'しかく', batsu: 'ばつ', hoshi: 'ほし' };
  CM.SHAPE_NAMES = SHAPE_NAMES;
  function drawShape(ctx, name, r, colorFill) {
    var i, p = [], a;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (name === 'maru') { circle(ctx, 0, 0, r, COL.shiro, COL.sumi, Math.max(2, r * 0.18)); }
    else if (name === 'kuro') { circle(ctx, 0, 0, r, colorFill || COL.sumi, COL.sumi, 2); }
    else if (name === 'sankaku') { poly(ctx, [[0, -r * 1.1], [r * 1.05, r * 0.8], [-r * 1.05, r * 0.8]], colorFill || COL.daidai, COL.sumi, Math.max(2, r * 0.14)); }
    else if (name === 'shikaku') { ctx.beginPath(); ctx.rect(-r * 0.9, -r * 0.9, r * 1.8, r * 1.8); ctx.fillStyle = colorFill || COL.mizu; ctx.fill(); ctx.strokeStyle = COL.sumi; ctx.lineWidth = Math.max(2, r * 0.14); ctx.stroke(); }
    else if (name === 'batsu') { ctx.strokeStyle = colorFill || COL.sumi; ctx.lineWidth = Math.max(2.5, r * 0.22); ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(r, -r); ctx.lineTo(-r, r); ctx.stroke(); }
    else if (name === 'hoshi') {
      for (i = 0; i < 10; i++) { a = -Math.PI / 2 + i * Math.PI / 5; p.push([Math.cos(a) * (i % 2 ? r * 0.48 : r * 1.15), Math.sin(a) * (i % 2 ? r * 0.48 : r * 1.15)]); }
      poly(ctx, p, colorFill || COL.ki, COL.sumi, Math.max(2, r * 0.12));
    }
  }
  CM.drawShape = drawShape;

  /* ================= 点と線（てんせん・かがみ・かさねる で共通） =================
     N×N の点。点は (x,y) 0..N-1。線分は 単位（となり・ななめ1つ）に分けて持つ。
     sig＝線分の集合の文字列（順番に よらない） */
  function segKey(a, b) {
    var k1 = a[0] + ',' + a[1], k2 = b[0] + ',' + b[1];
    return (k1 < k2) ? k1 + '-' + k2 : k2 + '-' + k1;
  }
  CM.segKey = segKey;
  /* a→b が たて・よこ・ななめ45度なら 単位線分の並びを返す。ちがえば null */
  function unitSegs(a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], n, sx, sy, i, out = [], x = a[0], y = a[1];
    if (dx === 0 && dy === 0) { return []; }
    if (!(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) { return null; }
    n = Math.max(Math.abs(dx), Math.abs(dy)); sx = dx / n; sy = dy / n;
    for (i = 0; i < n; i++) { out.push([[x, y], [x + sx, y + sy]]); x += sx; y += sy; }
    return out;
  }
  CM.unitSegs = unitSegs;
  function segSetSig(set) { var ks = [], k; for (k in set) { if (set.hasOwnProperty(k)) { ks.push(k); } } ks.sort(); return ks.join('|'); }
  function segsToSet(segs) { var s = {}, i; for (i = 0; i < segs.length; i++) { s[segKey(segs[i][0], segs[i][1])] = segs[i]; } return s; }
  function setToSegs(set) { var out = [], k; for (k in set) { if (set.hasOwnProperty(k)) { out.push(set[k]); } } return out; }
  function segCount(set) { var n = 0, k; for (k in set) { if (set.hasOwnProperty(k)) { n++; } } return n; }
  CM.segSetSig = segSetSig; CM.segsToSet = segsToSet; CM.setToSegs = setToSegs;
  /* 点の変換 */
  function flipX(p, n) { return [n - 1 - p[0], p[1]]; }
  function flipY(p, n) { return [p[0], n - 1 - p[1]]; }
  function rot180(p, n) { return [n - 1 - p[0], n - 1 - p[1]]; }
  function rot90(p, n) { return [n - 1 - p[1], p[0]]; }
  function mapSegs(segs, fn, n) { var out = [], i; for (i = 0; i < segs.length; i++) { out.push([fn(segs[i][0], n), fn(segs[i][1], n)]); } return out; }
  CM.mapSegs = mapSegs; CM.flipX = flipX; CM.flipY = flipY; CM.rot180 = rot180; CM.rot90 = rot90;

  /* つながった 線を 1本 作る（ランダムウォーク）。n×n・count 本の 単位線分・diag＝ななめを使う・maxLen＝1歩の長さ */
  var DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  function makePath(n, count, diag, maxLen) {
    var tries, set, p, d, len, segs, k, q, i, got, cur, prev, dirs;
    for (tries = 0; tries < 300; tries++) {
      set = {}; got = 0; cur = [ri(n), ri(n)]; prev = null;
      dirs = diag ? DIRS8 : DIRS8.slice(0, 4);
      for (k = 0; k < count * 6 && got < count; k++) {
        d = pick(dirs); len = 1 + ri(maxLen);
        if (prev && d[0] === -prev[0] && d[1] === -prev[1]) { continue; }   /* すぐ もどらない */
        q = [cur[0] + d[0] * len, cur[1] + d[1] * len];
        if (q[0] < 0 || q[1] < 0 || q[0] >= n || q[1] >= n) { continue; }
        segs = unitSegs(cur, q);
        for (i = 0; i < segs.length; i++) { if (set[segKey(segs[i][0], segs[i][1])]) { break; } }
        if (i < segs.length) { continue; }
        if (got + segs.length > count) { continue; }
        for (i = 0; i < segs.length; i++) { set[segKey(segs[i][0], segs[i][1])] = segs[i]; }
        got += segs.length; cur = q; prev = d;
      }
      if (got === count) { return set; }
    }
    /* 保険＝よこ1本 */
    p = [[0, 0], [1, 0]]; set = {}; set[segKey(p[0], p[1])] = p; return set;
  }
  CM.makePath = makePath;
  /* 1本だけ ちがう かたち（1本 消して 1本 足す）。もとと 同じなら null */
  function perturb(set, n) {
    var segs = setToSegs(set), tries, out, idx, a, d, b, k, i;
    for (tries = 0; tries < 60; tries++) {
      out = {}; idx = ri(segs.length);
      for (i = 0; i < segs.length; i++) { if (i !== idx) { out[segKey(segs[i][0], segs[i][1])] = segs[i]; } }
      a = pick(segs)[ri(2)]; d = pick(DIRS8); b = [a[0] + d[0], a[1] + d[1]];
      if (b[0] < 0 || b[1] < 0 || b[0] >= n || b[1] >= n) { continue; }
      k = segKey(a, b);
      if (set[k] || out[k]) { continue; }
      out[k] = [a, b];
      if (segSetSig(out) !== segSetSig(set)) { return out; }
    }
    return null;
  }
  CM.perturb = perturb;

  /* 点と線を 描く。ctx の (0,0)＝左上。size＝1辺。opts.color・opts.ghost（うすく）・opts.dots（点を出す） */
  function drawDots(ctx, n, size, set, opts) {
    var pad = size * 0.12, step = (size - pad * 2) / (n - 1), i, j, segs, s, x1, y1, x2, y2;
    opts = opts || {};
    if (opts.dots !== false) {
      for (i = 0; i < n; i++) { for (j = 0; j < n; j++) { circle(ctx, pad + i * step, pad + j * step, Math.max(2.5, size * 0.016), opts.dotColor || COL.usui); } }
    }
    segs = setToSegs(set);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (s = 0; s < segs.length; s++) {
      x1 = pad + segs[s][0][0] * step; y1 = pad + segs[s][0][1] * step; x2 = pad + segs[s][1][0] * step; y2 = pad + segs[s][1][1] * step;
      line(ctx, x1, y1, x2, y2, opts.color || COL.sumi, opts.lw || Math.max(3, size * 0.03));
    }
    return { pad: pad, step: step };
  }
  CM.drawDots = drawDots;

  /* ================= 1 てんせん（点図形の 模写）＝点を タップして 同じ形を つくる ================= */
  var TEN_LV = { 1: { n: 4, count: 3, diag: false, maxLen: 1 }, 2: { n: 5, count: 5, diag: true, maxLen: 1 }, 3: { n: 5, count: 7, diag: true, maxLen: 2 } };
  function makeTen(level) {
    var lv = TEN_LV[level], set = makePath(lv.n, lv.count, lv.diag, lv.maxLen);
    return { g: 'ten', level: level, n: lv.n, model: set, modelSig: segSetSig(set), kind: 'tap' };
  }

  /* ================= 2 かがみ・みずうみ ================= */
  var KAGAMI_LV = { 1: { n: 4, count: 3, diag: false, maxLen: 1, axes: ['x'] }, 2: { n: 4, count: 4, diag: true, maxLen: 1, axes: ['x', 'y'] }, 3: { n: 5, count: 6, diag: true, maxLen: 2, axes: ['x', 'y'] } };
  function makeKagami(level) {
    var lv = KAGAMI_LV[level], tries, set, segs, axis, correct, cands, seen, sig, i, list, v, q, idx;
    for (tries = 0; tries < 80; tries++) {
      set = makePath(lv.n, lv.count, lv.diag, lv.maxLen); segs = setToSegs(set);
      axis = pick(lv.axes);
      correct = segsToSet(mapSegs(segs, axis === 'x' ? flipX : flipY, lv.n));
      if (segSetSig(correct) === segSetSig(set)) { continue; }     /* 映しても 同じ形は だめ */
      seen = {}; seen[segSetSig(correct)] = true; cands = [];
      list = [set, segsToSet(mapSegs(segs, rot180, lv.n)), segsToSet(mapSegs(segs, axis === 'x' ? flipY : flipX, lv.n)), segsToSet(mapSegs(segs, rot90, lv.n))];
      if (level >= 2) { v = perturb(correct, lv.n); if (v) { list.splice(1, 0, v); } }
      for (i = 0; i < list.length && cands.length < 3; i++) {
        sig = segSetSig(list[i]);
        if (seen[sig]) { continue; }
        seen[sig] = true; cands.push(list[i]);
      }
      if (cands.length < 3) { continue; }
      cands = shuffle([correct].concat(cands));
      idx = -1; for (i = 0; i < 4; i++) { if (segSetSig(cands[i]) === segSetSig(correct)) { idx = i; } }
      q = { g: 'kagami', level: level, n: lv.n, model: set, axis: axis, choices: cands, answerIndex: idx, kind: 'choose' };
      return q;
    }
    return null;
  }

  /* ================= 3 かぞえる ================= */
  var KAZOE_LV = { 1: { total: [8, 10], target: [3, 6], kinds: 2 }, 2: { total: [13, 16], target: [5, 9], kinds: 3 }, 3: { total: [18, 22], target: [8, 13], kinds: 4 } };
  var KAZOE_KINDS = ['kuro', 'maru', 'sankaku', 'batsu', 'shikaku', 'hoshi'];
  function makeKazoe(level) {
    var lv = KAZOE_LV[level], total, target, kinds, items = [], spots = [], i, k, r, c, n = 5, kindList;
    total = lv.total[0] + ri(lv.total[1] - lv.total[0] + 1);
    target = lv.target[0] + ri(lv.target[1] - lv.target[0] + 1);
    if (target > total - 2) { target = total - 2; }
    kindList = shuffle(KAZOE_KINDS); kinds = kindList.slice(0, lv.kinds + 1);
    k = kinds[0];
    for (i = 0; i < n * n; i++) { spots.push(i); }
    spots = shuffle(spots).slice(0, total);
    for (i = 0; i < total; i++) {
      r = Math.floor(spots[i] / n); c = spots[i] % n;
      items.push({ x: (c + 0.5) / n + (rnd() - 0.5) * 0.09, y: (r + 0.5) / n + (rnd() - 0.5) * 0.09, kind: i < target ? k : kinds[1 + ri(kinds.length - 1)] });
    }
    items = shuffle(items);
    return { g: 'kazoe', level: level, items: items, target: k, answer: target, choices: uniqNums(target, 4, 1, 25), answerIndex: -1, kind: 'choose', numeric: true };
  }

  /* ================= 4 シーソー ================= */
  var SHISO_KINDS = ['kuro', 'sankaku', 'shikaku', 'hoshi', 'maru'];
  var SHISO_LV = { 1: { items: 3, asks: ['heavy'] }, 2: { items: 4, asks: ['heavy', 'light'] }, 3: { items: 4, asks: ['heavy', 'light', 'second'] } };
  function makeShiso(level) {
    var lv = SHISO_LV[level], kinds = shuffle(SHISO_KINDS).slice(0, lv.items), order = shuffle(kinds), pairs = [], i, ask, answer, choices, q;
    /* order[0] が いちばん おもい。となり同士の くらべ（鎖）で ぜんぶ 決まる */
    for (i = 0; i < order.length - 1; i++) {
      pairs.push(rnd() < 0.5 ? { left: order[i], right: order[i + 1], down: 'left' } : { left: order[i + 1], right: order[i], down: 'right' });
    }
    pairs = shuffle(pairs);
    ask = pick(lv.asks);
    answer = ask === 'heavy' ? order[0] : (ask === 'light' ? order[order.length - 1] : order[1]);
    choices = shuffle(kinds);
    q = { g: 'shiso', level: level, pairs: pairs, order: order, ask: ask, choices: choices, answerIndex: choices.indexOf(answer), kind: 'choose', shapeChoices: true };
    return q;
  }

  /* ================= 5 トンネル（ブラックボックス） ================= */
  var TON_KINDS = ['hoshi', 'kuro', 'shikaku', 'sankaku'];
  var TON_LV = { 1: { boxes: 2, chain: 1, deltas: [1, 2, -1] }, 2: { boxes: 3, chain: 2, deltas: [1, 2, 3, -1, -2] }, 3: { boxes: 3, chain: 3, deltas: [1, 2, 3, -1, -2, -3] } };
  function makeTonneru(level) {
    var lv = TON_LV[level], kinds = shuffle(TON_KINDS).slice(0, lv.boxes), rules = [], i, tries, start, chain, v, k, ok, examples, d, deltas;
    deltas = shuffle(lv.deltas);
    for (i = 0; i < lv.boxes; i++) { rules.push({ kind: kinds[i], delta: deltas[i % deltas.length] }); }
    for (tries = 0; tries < 100; tries++) {
      start = 1 + ri(5); chain = []; v = start; ok = true;
      for (i = 0; i < lv.chain; i++) { k = ri(lv.boxes); if (i > 0 && k === chain[i - 1]) { k = (k + 1) % lv.boxes; } chain.push(k); v += rules[k].delta; if (v < 0 || v > 9) { ok = false; break; } }
      if (!ok) { continue; }
      examples = [];
      for (i = 0; i < lv.boxes; i++) { d = rules[i].delta; examples.push({ box: i, inN: d < 0 ? 2 + ri(3) + (-d) : 1 + ri(4), outN: 0 }); examples[i].outN = examples[i].inN + d; }
      return { g: 'tonneru', level: level, rules: rules, examples: examples, start: start, chain: chain, answer: v, choices: uniqNums(v, 4, 0, 9), answerIndex: -1, kind: 'choose', numeric: true };
    }
    return null;
  }

  /* ================= 6 おなじ かたち（3×3の ますに しるし） =================
     しるし＝maru/kuro/shikaku/batsu（向きなし）・sankaku（4向き）・hanbun（4向き）・sen（2向き） */
  var MARKS = {
    maru: { period: 1 }, kuro: { period: 1 }, shikaku: { period: 1 }, batsu: { period: 1 },
    sankaku: { period: 4 }, hanbun: { period: 4 }, sen: { period: 2 }
  };
  var MARK_NAMES = ['maru', 'kuro', 'shikaku', 'batsu', 'sankaku', 'hanbun', 'sen'];
  var ORIENTED = ['sankaku', 'hanbun', 'sen'];
  function transformGrid(fig, rot) {
    var n = fig.n, out = [], i, cell, r, c, o, k, nr, nc;
    for (i = 0; i < fig.cells.length; i++) {
      cell = fig.cells[i]; r = cell.r; c = cell.c; o = cell.o;
      for (k = 0; k < rot; k++) { nr = c; nc = n - 1 - r; r = nr; c = nc; o = (o + 1) % MARKS[cell.m].period; }
      out.push({ r: r, c: c, m: cell.m, o: o });
    }
    return { n: n, cells: out };
  }
  CM.transformGrid = transformGrid;
  function gridSig(fig) {
    var parts = [], i, cell;
    for (i = 0; i < fig.cells.length; i++) { cell = fig.cells[i]; parts.push(cell.r + ',' + cell.c + ',' + cell.m + ',' + cell.o); }
    parts.sort(); return 'g' + fig.n + ':' + parts.join(';');
  }
  CM.gridSig = gridSig;
  function gridDistinctRot(fig) { var seen = {}, k, s; for (k = 0; k < 4; k++) { s = gridSig(transformGrid(fig, k)); if (seen[s]) { return false; } seen[s] = true; } return true; }
  function makeGrid(n, count) {
    var tries, spots, i, cells, m, fig, hasO;
    for (tries = 0; tries < 200; tries++) {
      spots = []; for (i = 0; i < n * n; i++) { spots.push(i); }
      spots = shuffle(spots).slice(0, count); cells = []; hasO = false;
      for (i = 0; i < spots.length; i++) {
        m = (i === 0) ? pick(ORIENTED) : pick(MARK_NAMES);
        if (ORIENTED.indexOf(m) >= 0) { hasO = true; }
        cells.push({ r: Math.floor(spots[i] / n), c: spots[i] % n, m: m, o: ri(MARKS[m].period) });
      }
      fig = { n: n, cells: cells };
      if (hasO && gridDistinctRot(fig)) { return fig; }
    }
    return { n: 3, cells: [{ r: 0, c: 0, m: 'sankaku', o: 1 }, { r: 1, c: 1, m: 'kuro', o: 0 }, { r: 2, c: 1, m: 'sen', o: 0 }] };
  }
  function cloneGrid(fig) { var out = [], i; for (i = 0; i < fig.cells.length; i++) { out.push({ r: fig.cells[i].r, c: fig.cells[i].c, m: fig.cells[i].m, o: fig.cells[i].o }); } return { n: fig.n, cells: out }; }
  function gridOneTurn(fig) {   /* 1つの しるしの 向きだけ ちがう */
    var c = cloneGrid(fig), idx = [], i, p;
    for (i = 0; i < c.cells.length; i++) { if (MARKS[c.cells[i].m].period > 1) { idx.push(i); } }
    if (!idx.length) { return null; }
    p = pick(idx); c.cells[p].o = (c.cells[p].o + 1 + ri(MARKS[c.cells[p].m].period - 1)) % MARKS[c.cells[p].m].period;
    return c;
  }
  function gridOneMove(fig) {   /* 1つの しるしの 場所だけ ちがう */
    var c = cloneGrid(fig), used = {}, i, p, tries, r, cc;
    for (i = 0; i < c.cells.length; i++) { used[c.cells[i].r + ',' + c.cells[i].c] = true; }
    p = ri(c.cells.length);
    for (tries = 0; tries < 30; tries++) { r = ri(c.n); cc = ri(c.n); if (!used[r + ',' + cc]) { c.cells[p].r = r; c.cells[p].c = cc; return c; } }
    return null;
  }
  function gridSwapKind(fig) {  /* 1つの しるしの 種類だけ ちがう */
    var c = cloneGrid(fig), p = ri(c.cells.length), m = pick(MARK_NAMES), tries = 0;
    while (m === c.cells[p].m && tries < 10) { m = pick(MARK_NAMES); tries++; }
    if (m === c.cells[p].m) { return null; }
    c.cells[p].m = m; c.cells[p].o = c.cells[p].o % MARKS[m].period; return c;
  }
  var ONAJI_LV = { 1: { count: 3, rots: [0] }, 2: { count: 4, rots: [0, 1, 3] }, 3: { count: 4, rots: [1, 2, 3] } };
  function makeOnaji(level) {
    var lv = ONAJI_LV[level], tries, base, rot, correct, pool, cands, seen, i, s, q, idx;
    for (tries = 0; tries < 60; tries++) {
      base = makeGrid(3, lv.count); rot = pick(lv.rots); correct = transformGrid(base, rot);
      /* 問いは「まわした ものは どれ？」＝回す回数を言わないので、もとの形の どの回転も 正しい答えになる。
         まちがいの候補は base の 4回転の どれとも 一致しないものだけ（査読 2026-10-31 指摘1） */
      seen = {}; for (i = 0; i < 4; i++) { seen[gridSig(transformGrid(base, i))] = true; } cands = [];
      pool = shuffle([gridOneTurn(correct), gridOneMove(correct), gridSwapKind(correct), gridOneTurn(correct), gridOneMove(correct)]);
      for (i = 0; i < pool.length && cands.length < 3; i++) {
        if (!pool[i]) { continue; }
        s = gridSig(pool[i]); if (seen[s]) { continue; } seen[s] = true; cands.push(pool[i]);
      }
      if (cands.length < 3) { continue; }
      cands = shuffle([correct].concat(cands));
      idx = -1; for (i = 0; i < 4; i++) { if (gridSig(cands[i]) === gridSig(correct)) { idx = i; } }
      q = { g: 'onaji', level: level, base: base, rot: rot, choices: cands, answerIndex: idx, kind: 'choose', gridChoices: true };
      return q;
    }
    return null;
  }

  /* ================= 7 かさねる（重ね図形）＝3×3の点に 線を かいた 3まいを かさねる ================= */
  var KASANE_LV = { 1: { sheets: 2, per: [1, 2], diag: false }, 2: { sheets: 3, per: [1, 2], diag: true }, 3: { sheets: 3, per: [2, 3], diag: true } };
  function makeKasane(level) {
    var lv = KASANE_LV[level], tries, sheets, i, j, union, k, cands, seen, s, q, idx, v, segs, pool, n = 3, set, cnt;
    for (tries = 0; tries < 80; tries++) {
      sheets = []; union = {};
      for (i = 0; i < lv.sheets; i++) {
        cnt = lv.per[0] + ri(lv.per[1] - lv.per[0] + 1);
        set = makePath(n, cnt, lv.diag, 1);
        sheets.push(set);
        for (k in set) { if (set.hasOwnProperty(k)) { union[k] = set[k]; } }
      }
      /* かさねて 線が ふえていないと つまらない */
      if (segCount(union) < 3) { continue; }
      cnt = 0; for (i = 0; i < sheets.length; i++) { cnt += segCount(sheets[i]); }
      if (cnt === segCount(union) && level >= 2 && rnd() < 0.6) { continue; }
      seen = {}; seen[segSetSig(union)] = true; cands = []; pool = [];
      /* まちがい＝1本 たりない・1本 多い・1本 ずれている・1まいが 抜けている */
      segs = setToSegs(union);
      v = {}; j = ri(segs.length); for (i = 0; i < segs.length; i++) { if (i !== j) { v[segKey(segs[i][0], segs[i][1])] = segs[i]; } } pool.push(v);
      v = perturb(union, n); if (v) { pool.push(v); }
      v = {}; for (k in union) { if (union.hasOwnProperty(k)) { v[k] = union[k]; } }
      (function () { var a = [ri(n), ri(n)], d = pick(lv.diag ? DIRS8 : DIRS8.slice(0, 4)), b = [a[0] + d[0], a[1] + d[1]], kk; if (b[0] >= 0 && b[1] >= 0 && b[0] < n && b[1] < n) { kk = segKey(a, b); if (!union[kk]) { v[kk] = [a, b]; pool.push(v); } } })();
      if (sheets.length >= 3) { v = {}; for (i = 1; i < sheets.length; i++) { for (k in sheets[i]) { if (sheets[i].hasOwnProperty(k)) { v[k] = sheets[i][k]; } } } pool.push(v); }
      pool = shuffle(pool);
      for (i = 0; i < pool.length && cands.length < 3; i++) { s = segSetSig(pool[i]); if (seen[s] || segCount(pool[i]) === 0) { continue; } seen[s] = true; cands.push(pool[i]); }
      if (cands.length < 3) { continue; }
      cands = shuffle([union].concat(cands));
      idx = -1; for (i = 0; i < 4; i++) { if (segSetSig(cands[i]) === segSetSig(union)) { idx = i; } }
      q = { g: 'kasane', level: level, n: n, sheets: sheets, union: union, choices: cands, answerIndex: idx, kind: 'choose' };
      return q;
    }
    return null;
  }

  /* ================= もんだいの 入口 ================= */
  /* ================= え の もんだい（きせつ・なかま／ことば／おはなし）＝絵 66枚（img/<id>.png） =================
     m＝音（しりとり・おとの かず に つかう）。ふつうの 1音は 1文字。「ちゅ」「ぎょ」「しゃ」「ー」「っ」は 数え方が ゆれるので、しりとり・音数には つかわない */
  var ITEMS = [
    { id: 'sakura', name: 'さくら', m: ['さ', 'く', 'ら'], season: 'haru' },
    { id: 'tulip', name: 'ちゅーりっぷ', m: ['ちゅ', 'ー', 'り', 'っ', 'ぷ'], season: 'haru' },
    { id: 'koinobori', name: 'こいのぼり', m: ['こ', 'い', 'の', 'ぼ', 'り'], season: 'haru' },
    { id: 'tanpopo', name: 'たんぽぽ', m: ['た', 'ん', 'ぽ', 'ぽ'], season: 'haru' },
    { id: 'ichigo', name: 'いちご', m: ['い', 'ち', 'ご'], season: 'haru', food: true },
    { id: 'hinamatsuri', name: 'ひなにんぎょう', m: ['ひ', 'な', 'に', 'ん', 'ぎょ', 'う'], season: 'haru' },
    { id: 'suika', name: 'すいか', m: ['す', 'い', 'か'], season: 'natsu', food: true },
    { id: 'himawari', name: 'ひまわり', m: ['ひ', 'ま', 'わ', 'り'], season: 'natsu' },
    { id: 'semi', name: 'せみ', m: ['せ', 'み'], season: 'natsu', animal: true },
    { id: 'asagao', name: 'あさがお', m: ['あ', 'さ', 'が', 'お'], season: 'natsu' },
    { id: 'kakigori', name: 'かきごおり', m: ['か', 'き', 'ご', 'お', 'り'], season: 'natsu', food: true },
    { id: 'tanabata', name: 'たなばた', m: ['た', 'な', 'ば', 'た'], season: 'natsu' },
    { id: 'kaki', name: 'かき', m: ['か', 'き'], season: 'aki', food: true },
    { id: 'kuri', name: 'くり', m: ['く', 'り'], season: 'aki', food: true },
    { id: 'momiji', name: 'もみじ', m: ['も', 'み', 'じ'], season: 'aki' },
    { id: 'tonbo', name: 'とんぼ', m: ['と', 'ん', 'ぼ'], season: 'aki', animal: true },
    { id: 'otsukimi', name: 'おつきみ', m: ['お', 'つ', 'き', 'み'], season: 'aki' },
    { id: 'kosumosu', name: 'こすもす', m: ['こ', 'す', 'も', 'す'], season: 'aki' },
    { id: 'yukidaruma', name: 'ゆきだるま', m: ['ゆ', 'き', 'だ', 'る', 'ま'], season: 'fuyu' },
    { id: 'mikan', name: 'みかん', m: ['み', 'か', 'ん'], season: 'fuyu', food: true },
    { id: 'tsubaki', name: 'つばき', m: ['つ', 'ば', 'き'], season: 'fuyu' },
    { id: 'kagamimochi', name: 'かがみもち', m: ['か', 'が', 'み', 'も', 'ち'], season: 'fuyu' },
    { id: 'setsubun', name: 'せつぶん', m: ['せ', 'つ', 'ぶ', 'ん'], season: 'fuyu' },
    { id: 'christmas_tree', name: 'くりすますつりー', m: ['く', 'り', 'す', 'ま', 'す', 'つ', 'り', 'ー'], season: 'fuyu' },
    { id: 'hato', name: 'はと', m: ['は', 'と'], cat: 'tori', animal: true },
    { id: 'karasu', name: 'からす', m: ['か', 'ら', 'す'], cat: 'tori', animal: true },
    { id: 'suzume', name: 'すずめ', m: ['す', 'ず', 'め'], cat: 'tori', animal: true },
    { id: 'kabutomushi', name: 'かぶとむし', m: ['か', 'ぶ', 'と', 'む', 'し'], cat: 'mushi', animal: true },
    { id: 'tentoumushi', name: 'てんとうむし', m: ['て', 'ん', 'と', 'う', 'む', 'し'], cat: 'mushi', animal: true },
    { id: 'kamakiri', name: 'かまきり', m: ['か', 'ま', 'き', 'り'], cat: 'mushi', animal: true },
    { id: 'tai', name: 'たい', m: ['た', 'い'], cat: 'sakana', animal: true },
    { id: 'kingyo', name: 'きんぎょ', m: ['き', 'ん', 'ぎょ'], cat: 'sakana', animal: true },
    { id: 'unagi', name: 'うなぎ', m: ['う', 'な', 'ぎ'], cat: 'sakana', animal: true },
    { id: 'tokage', name: 'とかげ', m: ['と', 'か', 'げ'], cat: 'hachu', animal: true },
    { id: 'kaeru', name: 'かえる', m: ['か', 'え', 'る'], cat: 'hachu', animal: true },
    { id: 'kame', name: 'かめ', m: ['か', 'め'], cat: 'hachu', animal: true },
    { id: 'inu', name: 'いぬ', m: ['い', 'ぬ'], cat: 'kemono', animal: true },
    { id: 'saru', name: 'さる', m: ['さ', 'る'], cat: 'kemono', animal: true },
    { id: 'zou', name: 'ぞう', m: ['ぞ', 'う'], cat: 'kemono', animal: true },
    { id: 'densha', name: 'でんしゃ', m: ['で', 'ん', 'しゃ'], cat: 'norimono', ride: true },
    { id: 'jitensha', name: 'じてんしゃ', m: ['じ', 'て', 'ん', 'しゃ'], cat: 'norimono', ride: true },
    { id: 'kuruma', name: 'くるま', m: ['く', 'る', 'ま'], cat: 'norimono', ride: true },
    { id: 'ringo', name: 'りんご', m: ['り', 'ん', 'ご'], food: true },
    { id: 'gorira', name: 'ごりら', m: ['ご', 'り', 'ら'], animal: true },
    { id: 'rappa', name: 'らっぱ', m: ['ら', 'っ', 'ぱ'], carry: true },
    { id: 'panda', name: 'ぱんだ', m: ['ぱ', 'ん', 'だ'], animal: true },
    { id: 'daikon', name: 'だいこん', m: ['だ', 'い', 'こ', 'ん'], food: true },
    { id: 'nezumi', name: 'ねずみ', m: ['ね', 'ず', 'み'], animal: true },
    { id: 'enpitsu', name: 'えんぴつ', m: ['え', 'ん', 'ぴ', 'つ'], carry: true },
    { id: 'hon', name: 'ほん', m: ['ほ', 'ん'], carry: true },
    { id: 'kasa', name: 'かさ', m: ['か', 'さ'], carry: true },
    { id: 'tsukue', name: 'つくえ', m: ['つ', 'く', 'え'] },
    { id: 'neko', name: 'ねこ', m: ['ね', 'こ'], animal: true },
    { id: 'kutsu', name: 'くつ', m: ['く', 'つ'], carry: true },
    { id: 'ki', name: 'き', m: ['き'] },
    { id: 'hana', name: 'はな', m: ['は', 'な'] },
    { id: 'tsumiki', name: 'つみき', m: ['つ', 'み', 'き'], carry: true },
    { id: 'boushi', name: 'ぼうし', m: ['ぼ', 'う', 'し'], carry: true },
    { id: 'tokei', name: 'とけい', m: ['と', 'け', 'い'], carry: true },
    { id: 'isu', name: 'いす', m: ['い', 'す'] },
    { id: 'uchiwa', name: 'うちわ', m: ['う', 'ち', 'わ'], carry: true },
    { id: 'kuma', name: 'くま', m: ['く', 'ま'], animal: true },
    { id: 'banana', name: 'ばなな', m: ['ば', 'な', 'な'], food: true },
    { id: 'terebi', name: 'てれび', m: ['て', 'れ', 'び'] },
    { id: 'hasami', name: 'はさみ', m: ['は', 'さ', 'み'], carry: true },
    { id: 'basu', name: 'ばす', m: ['ば', 'す'], ride: true }
  ];
  CM.ITEMS = ITEMS;
  var ITEM_BY_ID = {};
  (function () { var i; for (i = 0; i < ITEMS.length; i++) { ITEM_BY_ID[ITEMS[i].id] = ITEMS[i]; } })();
  CM.itemById = function (id) { return ITEM_BY_ID[id]; };
  var SEASON_NAME = { haru: 'はる', natsu: 'なつ', aki: 'あき', fuyu: 'ふゆ' };
  var CAT_NAME = { tori: 'とり', mushi: 'むし', sakana: 'さかな', hachu: 'かえるや かめの なかま', kemono: 'けもの', norimono: 'のりもの' };
  CM.SEASON_NAME = SEASON_NAME; CM.CAT_NAME = CAT_NAME;
  var SEASONS = ['haru', 'natsu', 'aki', 'fuyu'], CATS = ['tori', 'mushi', 'sakana', 'hachu', 'kemono', 'norimono'];
  var EASY_SEASON = { sakura: 1, tulip: 1, koinobori: 1, ichigo: 1, hinamatsuri: 1, suika: 1, himawari: 1, semi: 1, kakigori: 1, kaki: 1, kuri: 1, momiji: 1, tonbo: 1, yukidaruma: 1, mikan: 1, christmas_tree: 1, kagamimochi: 1 };
  function itemsWhere(fn) { var i, out = []; for (i = 0; i < ITEMS.length; i++) { if (fn(ITEMS[i])) { out.push(ITEMS[i]); } } return out; }
  function idsOf(arr) { var i, out = []; for (i = 0; i < arr.length; i++) { out.push(arr[i].id); } return out; }
  function plainMora(s) { return s.length === 1 && s !== 'ん' && s !== 'ー' && s !== 'っ'; }
  function firstMora(it) { return it.m[0]; }
  function lastMora(it) { return it.m[it.m.length - 1]; }
  function plainWord(it) { var i; for (i = 0; i < it.m.length; i++) { if (!plainMora(it.m[i]) && it.m[i] !== 'ん') { return false; } } return true; }   /* 「ん」は まんなかに あってよい */
  function finishChoose(q, answer, others) {
    var ch = shuffle([answer].concat(others)), i;
    q.choices = idsOf(ch); q.answerIndex = -1;
    for (i = 0; i < ch.length; i++) { if (ch[i].id === answer.id) { q.answerIndex = i; } }
    q.kind = 'choose'; q.imgChoices = true;
    return q;
  }
  /* きせつ・なかま＝ひだりの 絵と おなじ きせつ（なかま）の 絵を えらぶ。まちがいは べつの きせつ（なかま）から 1つずつ */
  function makeKisetsu(level) {
    var sub, stem, answer, others, pool, keys, k, i, q;
    sub = (level === 1) ? 'season' : (level === 2 ? (rnd() < 0.5 ? 'season' : 'nakama') : (rnd() < 0.4 ? 'season' : 'nakama'));
    if (sub === 'season') {
      pool = itemsWhere(function (it) { return !!it.season && (level > 1 || EASY_SEASON[it.id]); });
      stem = pick(pool);
      answer = pick(itemsWhere(function (it) { return it.season === stem.season && it.id !== stem.id && (level > 1 || EASY_SEASON[it.id]); }));
      keys = shuffle(SEASONS.slice()); others = [];
      for (i = 0; i < keys.length; i++) { k = keys[i]; if (k !== stem.season && others.length < 3) { others.push(pick(itemsWhere(function (it) { return it.season === k; }))); } }
      q = { g: 'kisetsu', level: level, sub: 'season', stem: stem.id, key: stem.season };
    } else {
      stem = pick(itemsWhere(function (it) { return !!it.cat; }));
      answer = pick(itemsWhere(function (it) { return it.cat === stem.cat && it.id !== stem.id; }));
      keys = shuffle(CATS.slice()); others = [];
      for (i = 0; i < keys.length; i++) { k = keys[i]; if (k !== stem.cat && others.length < 3) { others.push(pick(itemsWhere(function (it) { return it.cat === k; }))); } }
      q = { g: 'kisetsu', level: level, sub: 'nakama', stem: stem.id, key: stem.cat };
    }
    q.imgStem = true;
    return finishChoose(q, answer, others);
  }
  /* ことば＝1 はじめの おと／2 しりとり／3 おとの かず・おわりの おと */
  function makeKotoba(level) {
    var sub, words, target, others, q, chain, c1, c2, last, cands, i, nums, n, tries;
    words = itemsWhere(function (it) { return plainWord(it) && plainMora(firstMora(it)); });
    sub = (level === 1) ? 'hajime' : (level === 2 ? 'shiritori' : (rnd() < 0.5 ? 'onsu' : 'owari'));
    if (sub === 'hajime' || sub === 'owari') {
      target = pick(itemsWhere(function (it) { return plainMora(firstMora(it)) && (sub === 'hajime' || plainMora(lastMora(it))); }));
      others = shuffle(itemsWhere(function (it) {
        return it.id !== target.id && (sub === 'hajime' ? firstMora(it) !== firstMora(target) : lastMora(it) !== lastMora(target));
      })).slice(0, 3);
      q = { g: 'kotoba', level: level, sub: sub, sound: sub === 'hajime' ? firstMora(target) : lastMora(target), target: target.id };
      return finishChoose(q, target, others);
    }
    if (sub === 'onsu') {
      target = pick(words);
      n = target.m.length;
      nums = uniqNums(n, 4, 1, 7);
      return { g: 'kotoba', level: level, sub: 'onsu', target: target.id, answer: n, choices: nums, answerIndex: -1, kind: 'choose', numeric: true, imgStem: true, stem: target.id };
    }
    /* しりとり＝c1 → c2 → ？（c2 の さいごの おとで はじまる ものを えらぶ） */
    for (tries = 0; tries < 60; tries++) {
      c1 = pick(itemsWhere(function (it) { return plainMora(lastMora(it)) && plainMora(firstMora(it)); }));
      cands = itemsWhere(function (it) { return it.id !== c1.id && firstMora(it) === lastMora(c1) && plainMora(lastMora(it)); });
      if (!cands.length) { continue; }
      c2 = pick(cands);
      last = lastMora(c2);
      cands = itemsWhere(function (it) { return it.id !== c1.id && it.id !== c2.id && firstMora(it) === last; });
      if (!cands.length) { continue; }
      target = pick(cands);
      others = shuffle(itemsWhere(function (it) { return it.id !== c1.id && it.id !== c2.id && it.id !== target.id && firstMora(it) !== last; })).slice(0, 3);
      chain = [c1.id, c2.id];
      q = { g: 'kotoba', level: level, sub: 'shiritori', chain: chain, sound: last, target: target.id, imgStem: true };
      return finishChoose(q, target, others);
    }
    return null;
  }
  /* おはなし＝みじかい おはなしを きいて（よんで）、あとから 2〜4問。いちばん上は「いれなかった もの」の ひっかけ */
  var STORY_NAMES = ['たろうくん', 'はなちゃん', 'けんくん', 'ももちゃん'];
  function makeOhanashi(level) {
    var name = pick(STORY_NAMES), rides, ride, carries, c1, c2, nc, animals, a, foods, f, sitems, si, story, parts = [], others, q, ans, i, seasonAns, keys, k;
    rides = itemsWhere(function (it) { return !!it.ride; }); ride = pick(rides);
    carries = shuffle(itemsWhere(function (it) { return !!it.carry; })); c1 = carries[0]; c2 = carries[1]; nc = carries[2];
    animals = itemsWhere(function (it) { return !!it.animal; }); a = pick(animals);
    foods = itemsWhere(function (it) { return !!it.food; }); f = pick(foods);
    sitems = itemsWhere(function (it) { return !!it.season && !it.animal && !it.food; }); si = pick(sitems);
    story = 'きょうは ' + name + ' が ' + ride.name + ' に のって、おばあちゃんの いえに いきます。';
    if (level >= 2) { story += 'かばんに ' + c1.name + ' と ' + c2.name + ' を いれました。'; }
    if (level >= 3) { story += nc.name + ' は いれませんでした。'; }
    story += 'えきで ' + a.name + ' を みました。おひるに ' + f.name + ' を たべました。';
    if (level >= 3) { story += 'おばあちゃんの いえには ' + si.name + ' が ありました。'; }
    function part(ask, answer, pool, extra) {
      var os = shuffle(itemsWhere(function (it) { return pool(it) && it.id !== answer.id && (!extra || it.id !== extra.id) && story.indexOf(it.name) < 0; })).slice(0, extra ? 2 : 3);   /* まちがいは おはなしに 出てこない もの（なまえの 一部が かぶる ものも 外す） */
      if (extra) { os.push(extra); }
      return finishChoose({ g: 'ohanashi', level: level, ask: ask, why: '' }, answer, os);
    }
    if (level >= 2) {
      parts.push(part('かばんに いれた ものは どれ？', rnd() < 0.5 ? c1 : c2, function (it) { return !!it.carry && it.id !== c1.id && it.id !== c2.id; }, level >= 3 ? nc : null));
      parts[parts.length - 1].why = 'かばんに いれたのは ' + c1.name + ' と ' + c2.name;
    }
    parts.push(part('えきで みた いきものは どれ？', a, function (it) { return !!it.animal; }, null));
    parts[parts.length - 1].why = 'えきで みたのは ' + a.name;
    parts.push(part('おひるに たべた ものは どれ？', f, function (it) { return !!it.food; }, null));
    parts[parts.length - 1].why = 'たべたのは ' + f.name;
    if (level === 1 || level === 3) {
      parts.push(part(name + ' が のった のりものは どれ？', ride, function (it) { return !!it.ride; }, null));
      parts[parts.length - 1].why = 'のったのは ' + ride.name;
    }
    if (level >= 3) {
      seasonAns = pick(itemsWhere(function (it) { return it.season === si.season && it.id !== si.id; }));
      keys = shuffle(SEASONS.slice()); others = [];
      for (i = 0; i < keys.length; i++) { k = keys[i]; if (k !== si.season && others.length < 3) { others.push(pick(itemsWhere(function (it) { return it.season === k; }))); } }
      q = finishChoose({ g: 'ohanashi', level: level, ask: 'おはなしの きせつと おなじ ものは どれ？', why: si.name + ' は ' + SEASON_NAME[si.season] + ' の もの' }, seasonAns, others);
      parts.push(q);
    }
    if (level === 1) { parts = shuffle(parts).slice(0, 2); }
    for (i = 0; i < parts.length; i++) { parts[i].partIdx = i; parts[i].storyText = story; parts[i].nParts = parts.length; }
    ans = parts[0]; ans.parts = parts;
    return ans;
  }
  CM.makeOhanashi = makeOhanashi;
  CM.makeKisetsu = makeKisetsu; CM.makeKotoba = makeKotoba;

  /* ================= 制限時間（秒）＝過去問の〈時間〉を 1問あたりに ならした値（解答解説編・2022〜2025年度）
     てんせん＝模写 2〜5分/枚 → やさしい 90・ふつう 75・むずかしい 60
     かがみ・おなじ・かさねる＝図形 1分/4問前後 → 45・35・30    かぞえる＝数量 1〜2分/数問 → 45・35・30
     シーソー＝推理 各15秒 → 30・20・15    トンネル＝1分/数問 → 45・35・30
     きせつ・なかま＝常識 30〜80秒/数問 → 30・25・20    ことば＝言語 1〜2分/数問 → 40・30・30    おはなし＝各10〜30秒 → 30・25・20 */
  var TIME_SEC = {
    ten: { 1: 90, 2: 75, 3: 60 }, kagami: { 1: 45, 2: 35, 3: 30 }, kazoe: { 1: 45, 2: 35, 3: 30 }, shiso: { 1: 30, 2: 20, 3: 15 },
    tonneru: { 1: 45, 2: 35, 3: 30 }, onaji: { 1: 45, 2: 35, 3: 30 }, kasane: { 1: 45, 2: 35, 3: 30 },
    kisetsu: { 1: 30, 2: 25, 3: 20 }, kotoba: { 1: 40, 2: 30, 3: 30 }, ohanashi: { 1: 30, 2: 25, 3: 20 }
  };
  CM.TIME_SEC = TIME_SEC;
  CM.timeFor = function (q) { var t = TIME_SEC[q.g]; return (t && t[q.level]) ? t[q.level] : 30; };

  var GENRES = [
    { id: 'ten', name: 'てんせん', sub: 'おなじ かたちを てんで かく', make: makeTen },
    { id: 'kagami', name: 'かがみ', sub: 'かがみに うつすと どれ？', make: makeKagami },
    { id: 'kazoe', name: 'かぞえる', sub: 'えらんで かぞえる', make: makeKazoe },
    { id: 'shiso', name: 'シーソー', sub: 'どれが いちばん おもい？', make: makeShiso },
    { id: 'tonneru', name: 'トンネル', sub: 'とおると かずが かわる', make: makeTonneru },
    { id: 'onaji', name: 'おなじ かたち', sub: 'おなじ かたちは どれ？', make: makeOnaji },
    { id: 'kasane', name: 'かさねる', sub: 'かさねると どうなる？', make: makeKasane },
    { id: 'kisetsu', name: 'きせつ・なかま', sub: 'おなじ きせつ、おなじ なかまは どれ？', make: makeKisetsu },
    { id: 'kotoba', name: 'ことば', sub: 'はじめの おと・しりとり・おとの かず', make: makeKotoba },
    { id: 'ohanashi', name: 'おはなし', sub: 'きいて おぼえて こたえる', make: makeOhanashi }
  ];
  CM.GENRES = GENRES;
  var GENRE_BY_ID = {};
  (function () { var i; for (i = 0; i < GENRES.length; i++) { GENRE_BY_ID[GENRES[i].id] = GENRES[i]; } })();
  CM.genreById = function (id) { return GENRE_BY_ID[id]; };
  CM.LEVEL_NAME = { 1: 'やさしい', 2: 'ふつう', 3: 'むずかしい' };

  function makeQuestion(gid, level) {
    var q = null, tries, g = GENRE_BY_ID[gid];
    for (tries = 0; tries < 5 && !q; tries++) { q = g.make(level); }
    if (!q) { q = makeKazoe(1); }
    if (q.numeric) { q.answerIndex = q.choices.indexOf(q.answer); }
    return q;
  }
  CM.makeQuestion = makeQuestion;

  /* ================= もんだい文（よみあげ にも つかう） ================= */
  function questionText(q) {
    var t;
    if (q.g === 'ten') { return 'ひだりと おなじ かたちに なるように、みぎの てんを じゅんばんに タップしてね'; }
    if (q.g === 'kagami') { return (q.axis === 'x' ? 'かがみに うつすと、どの かたちに なる？' : 'みずうみに うつすと、どの かたちに なる？'); }
    if (q.g === 'kazoe') { return SHAPE_NAMES[q.target] + ' は いくつ ある？'; }
    if (q.g === 'shiso') {
      t = q.ask === 'heavy' ? 'いちばん おもい' : (q.ask === 'light' ? 'いちばん かるい' : '2ばんめに おもい');
      return 'シーソーを みて、' + t + ' かたちを えらんでね';
    }
    if (q.g === 'tonneru') { return 'おやくそくの とおり トンネルを とおると、ボールは いくつに なる？'; }
    if (q.g === 'onaji') { return q.rot === 0 ? 'ひだりと おなじ かたちは どれ？' : 'ひだりの かたちを まわした ものは どれ？'; }
    if (q.g === 'kasane') { return 'うえの かみを ぜんぶ かさねると、どの かたちに なる？'; }
    if (q.g === 'kisetsu') { return q.sub === 'season' ? 'ひだりの えと おなじ きせつの ものは どれ？' : 'ひだりの えと おなじ なかまは どれ？'; }
    if (q.g === 'kotoba') {
      if (q.sub === 'hajime') { return '「' + q.sound + '」で はじまる ものは どれ？'; }
      if (q.sub === 'owari') { return '「' + q.sound + '」で おわる ものは どれ？'; }
      if (q.sub === 'onsu') { return '「' + ITEM_BY_ID[q.target].name + '」は、おとが いくつ？'; }
      return 'しりとり。' + ITEM_BY_ID[q.chain[0]].name + '、' + ITEM_BY_ID[q.chain[1]].name + '、つぎは どれ？';
    }
    if (q.g === 'ohanashi') { return q.ask; }
    return '';
  }
  CM.questionText = questionText;

  /* ================= わからないときの 支え（足場かけ・学習理論に基づく 3段） =================
     0 まず 自分で 答える（取り出し練習・生産的失敗）
     1 1回目の まちがい＝「やり方」の ヒント（手順の言葉＋見る場所を 絵で しぼる。答えは 見せない）
     2 2回目の まちがい＝解き方つきの 答え（例題）→ すぐ 同じ型の 似た問題を もう1問（例題のあとの 練習）
     ほめ言葉＝「やり方」を ほめる（能力でなく 過程・Dweck の process praise） */
  var PRAISE = ['よく みくらべたね', 'じゅんばんに みたね', 'さいごまで たしかめたね', 'おちついて えらべたね', 'ていねいに やったね'];
  CM.praise = function () { return pick(PRAISE); };
  /* ヒントの 言葉（型ごとの「手順」） */
  function hintText(q) {
    if (q.g === 'ten') { return 'うすい いろが おてほん。はじめの てんの ばしょから あわせてね'; }
    if (q.g === 'kagami') { return q.axis === 'x' ? 'かがみは みぎと ひだりが いれかわるよ。だいだいの せんが どこへ うつるか さがしてね' : 'みずうみは うえと したが いれかわるよ。だいだいの せんが どこへ うつるか さがしてね'; }
    if (q.g === 'kazoe') { return 'うえの だんから じゅんばんに、' + SHAPE_NAMES[q.target] + ' だけを ゆびで さして かぞえてね'; }
    if (q.g === 'shiso') { return 'さがっている ほう（まるで かこんだ ほう）が おもいよ。ぜんぶの シーソーを つなげて かんがえてね'; }
    if (q.g === 'tonneru') { return 'トンネルの よこに、ふえる かず・へる かずを かいたよ。じゅんばんに たして ひいてね'; }
    if (q.g === 'onaji') { return 'まるで かこんだ ますが ちがうよ。しるしの ばしょと むきを 1つずつ くらべてね'; }
    if (q.g === 'kasane') { return 'みぎはしに、さいごの 1まい いがいを かさねた かたちを だしたよ。あと 1まいを たしてね'; }
    if (q.g === 'kisetsu') {
      return q.sub === 'season' ? 'ひだりの ' + ITEM_BY_ID[q.stem].name + ' は「' + SEASON_NAME[q.key] + '」の もの。えを 1つずつ「いつの きせつ？」と きいてみてね'
        : 'ひだりの ' + ITEM_BY_ID[q.stem].name + ' は「' + CAT_NAME[q.key] + '」。えを 1つずつ「なんの なかま？」と きいてみてね';
    }
    if (q.g === 'kotoba') {
      if (q.sub === 'hajime') { return 'えの なまえを ゆっくり いって、はじめの おとが「' + q.sound + '」か たしかめてね'; }
      if (q.sub === 'owari') { return 'えの なまえを ゆっくり いって、さいごの おとが「' + q.sound + '」か たしかめてね'; }
      if (q.sub === 'onsu') { return 'ゆびを 1ぽんずつ おりながら「' + ITEM_BY_ID[q.target].name + '」と ゆっくり いってね'; }
      return ITEM_BY_ID[q.chain[1]].name + ' の さいごの おとは「' + q.sound + '」。「' + q.sound + '」で はじまる えを さがしてね';
    }
    if (q.g === 'ohanashi') { return 'おはなしを もういちど きいて（よんで）から こたえてね'; }
    return 'もういちど よく みてね';
  }
  CM.hintText = hintText;
  /* 答えの あとの ひとこと（え の もんだい） */
  CM.whyTextImg = function (q) {
    var a;
    if (q.g === 'kisetsu') { a = ITEM_BY_ID[q.choices[q.answerIndex]]; return a.name + ' は ' + (q.sub === 'season' ? SEASON_NAME[q.key] + ' の もの' : CAT_NAME[q.key] + ' の なかま') + ' だよ'; }
    if (q.g === 'kotoba') {
      if (q.sub === 'onsu') { return '「' + ITEM_BY_ID[q.target].name + '」は ' + ITEM_BY_ID[q.target].m.join('・') + ' で ' + q.answer + 'つ'; }
      a = ITEM_BY_ID[q.choices[q.answerIndex]];
      return '「' + a.name + '」だよ';
    }
    if (q.g === 'ohanashi') { return q.why; }
    return '';
  };

  /* ================= 絵を 描く ================= */
  function setupCanvas(canvas) {
    var css = canvas.clientWidth || parseInt(canvas.getAttribute('width'), 10) || 120, dpr = global.devicePixelRatio || 1, ctx, px = Math.round(css * dpr), h = canvas.clientHeight || css, py = Math.round(h * dpr);
    /* 見た目の大きさを CSS で固定してから 中の画素数を dpr 倍にする。固定しないと、画素数を増やした分だけ 見た目も広がり、描くたびに 2倍・4倍… と育つ（きめこまかい画面＝iPad で実測・2026-11-01） */
    if (!canvas.style.width) { canvas.style.width = css + 'px'; canvas.style.height = h + 'px'; }
    if (canvas.width !== px || canvas.height !== py) { canvas.width = px; canvas.height = py; }
    ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.scale(dpr, dpr);
    return { ctx: ctx, w: css, h: h };
  }
  CM.setupCanvas = setupCanvas;
  function paper(ctx, w, h, frame) {
    ctx.fillStyle = COL.kami; ctx.strokeStyle = frame || COL.sumi; ctx.lineWidth = Math.max(2, w * 0.015);
    roundRect(ctx, 1.5, 1.5, w - 3, h - 3, w * 0.06); ctx.fill(); ctx.stroke();
  }
  /* 点の かたち 1まい */
  function paintDotFig(canvas, n, set, opts) {
    var c = setupCanvas(canvas), s = Math.min(c.w, c.h);
    paper(c.ctx, c.w, c.h, opts && opts.frame);
    c.ctx.translate((c.w - s) / 2, (c.h - s) / 2);
    return drawDots(c.ctx, n, s, set, opts);
  }
  CM.paintDotFig = paintDotFig;
  /* かがみ の もと＝右（または 下）に 鏡の線 */
  function paintKagamiStem(canvas, q, hint) {
    var c = setupCanvas(canvas), s = Math.min(c.w, c.h) * 0.86, m, first, ghost;
    paper(c.ctx, c.w, c.h);
    c.ctx.save(); c.ctx.translate(q.axis === 'x' ? 2 : (c.w - s) / 2, q.axis === 'x' ? (c.h - s) / 2 : 2);
    m = drawDots(c.ctx, q.n, s, q.model, {});
    if (hint) {
      /* 足場＝1ぽんめだけ うつした線を うすく 見せる（例題の 一部＝完成問題） */
      first = setToSegs(q.model)[0];
      ghost = {}; ghost[segKey(first[0], first[1])] = first;
      drawDots(c.ctx, q.n, s, ghost, { color: COL.daidai, lw: Math.max(5, s * 0.045), dots: false });
    }
    c.ctx.restore();
    c.ctx.setLineDash && c.ctx.setLineDash([8, 6]);
    if (q.axis === 'x') { line(c.ctx, s + 6, 8, s + 6, c.h - 8, COL.ao, 5); } else { line(c.ctx, 8, s + 6, c.w - 8, s + 6, COL.ao, 5); }
    c.ctx.setLineDash && c.ctx.setLineDash([]);
    return m;
  }
  CM.paintKagamiStem = paintKagamiStem;
  /* かぞえる の ばらばらの かたち */
  function paintKazoe(canvas, q, hint) {
    var c = setupCanvas(canvas), i, it, r = Math.min(c.w, c.h) * 0.045;
    paper(c.ctx, c.w, c.h);
    if (hint) {
      /* 足場＝だんに 分ける うすい線と 左→右の うすい やじるし（「数える方向を 決める」） */
      for (i = 1; i < 5; i++) { line(c.ctx, 8, c.h * i / 5, c.w - 8, c.h * i / 5, '#f3c98a', 2); }
      for (i = 0; i < 5; i++) { line(c.ctx, 10, c.h * (i + 0.1) / 5, 40, c.h * (i + 0.1) / 5, COL.daidai, 2); poly(c.ctx, [[46, c.h * (i + 0.1) / 5], [38, c.h * (i + 0.1) / 5 - 5], [38, c.h * (i + 0.1) / 5 + 5]], COL.daidai, COL.daidai, 1); }
    }
    for (i = 0; i < q.items.length; i++) {
      it = q.items[i];
      c.ctx.save(); c.ctx.translate(it.x * c.w, it.y * c.h); drawShape(c.ctx, it.kind, r); c.ctx.restore();
    }
  }
  CM.paintKazoe = paintKazoe;
  /* かたち 1こ（えらびし） */
  function paintShape(canvas, kind, fill) {
    var c = setupCanvas(canvas), r = Math.min(c.w, c.h) * 0.3;
    c.ctx.translate(c.w / 2, c.h / 2); drawShape(c.ctx, kind, r, fill);
  }
  CM.paintShape = paintShape;
  /* シーソー ぜんぶ（たてに ならべる） */
  function paintShiso(canvas, q, hint) {
    var c = setupCanvas(canvas), i, p, rowH = c.h / q.pairs.length, cx = c.w / 2, half = c.w * 0.36, tilt = 0.2, cy, r = Math.min(rowH * 0.22, c.w * 0.08), dx, dy;
    paper(c.ctx, c.w, c.h);
    for (i = 0; i < q.pairs.length; i++) {
      p = q.pairs[i]; cy = rowH * (i + 0.62);
      /* だい */
      poly(c.ctx, [[cx, cy - rowH * 0.02], [cx - rowH * 0.16, cy + rowH * 0.3], [cx + rowH * 0.16, cy + rowH * 0.3]], COL.hai, COL.sumi, 2);
      dy = half * tilt * (p.down === 'left' ? 1 : -1);   /* 左が 下がる＝左の端が 下 */
      line(c.ctx, cx - half, cy + dy, cx + half, cy - dy, COL.sumi, 5);
      dx = half * 0.86;
      c.ctx.save(); c.ctx.translate(cx - dx, cy + dy * 0.86 - r * 1.3); drawShape(c.ctx, p.left, r); c.ctx.restore();
      c.ctx.save(); c.ctx.translate(cx + dx, cy - dy * 0.86 - r * 1.3); drawShape(c.ctx, p.right, r); c.ctx.restore();
      if (hint) {
        /* 足場＝さがっている 側（おもい 側）を 輪で かこむ */
        c.ctx.save(); c.ctx.translate(p.down === 'left' ? cx - dx : cx + dx, (p.down === 'left' ? cy + dy : cy - dy) * 0.86 + (p.down === 'left' ? cy : cy) * 0.14 - r * 1.3);
        circle(c.ctx, 0, 0, r * 1.7, null, COL.daidai, 4); c.ctx.restore();
      }
    }
  }
  CM.paintShiso = paintShiso;
  /* トンネル＝おやくそく（例）と もんだいの 列 */
  function drawBalls(ctx, x, y, n, r) {
    var i, perRow = 5, cx, cy;
    if (n === 0) { ctx.save(); ctx.font = 'bold ' + Math.round(r * 2.4) + 'px sans-serif'; ctx.fillStyle = COL.usui; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('0', x, y); ctx.restore(); return; }
    for (i = 0; i < n; i++) {
      cx = x + ((i % perRow) - Math.min(n, perRow) / 2 + 0.5) * r * 2.3; cy = y + (Math.floor(i / perRow) - (Math.ceil(n / perRow) - 1) / 2) * r * 2.3;
      circle(ctx, cx, cy, r, COL.shiro, COL.sumi, 2);
    }
  }
  function drawTunnel(ctx, x, y, w, h, kind) {
    ctx.save();
    ctx.fillStyle = COL.sumi; ctx.beginPath(); ctx.moveTo(x - w / 2, y + h / 2); ctx.lineTo(x - w / 2, y - h / 6); ctx.arc(x - w / 2 + h / 3, y - h / 6, h / 3, Math.PI, Math.PI * 1.5); ctx.lineTo(x + w / 2, y - h / 2); ctx.lineTo(x + w / 2, y + h / 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = COL.kami; ctx.fillRect(x - w / 2 + h / 3, y - h / 2 + 3, w / 2 + h / 6 - 3, h - 6);
    ctx.translate(x + w / 4 + h / 6, y); drawShape(ctx, kind, h * 0.2);
    ctx.restore();
  }
  function paintTonneru(canvas, q, hint) {
    var c = setupCanvas(canvas), i, rows = q.rules.length + 1, rowH = c.h / rows, y, r = Math.min(rowH * 0.11, c.w * 0.028), ex, tw = c.w * 0.2, th = rowH * 0.62, x, step, d;
    function delta(dx, dy, k) { d = q.rules[k].delta; c.ctx.save(); c.ctx.fillStyle = COL.daidai; c.ctx.font = 'bold ' + Math.round(rowH * 0.26) + 'px sans-serif'; c.ctx.fillText((d > 0 ? '+' : '−') + Math.abs(d), dx, dy); c.ctx.restore(); }
    paper(c.ctx, c.w, c.h);
    c.ctx.font = 'bold ' + Math.round(rowH * 0.3) + 'px sans-serif'; c.ctx.textAlign = 'center'; c.ctx.textBaseline = 'middle';
    function arrow(ax, ay) { line(c.ctx, ax - rowH * 0.16, ay, ax + rowH * 0.12, ay, COL.sumi, 3); poly(c.ctx, [[ax + rowH * 0.2, ay], [ax + rowH * 0.06, ay - rowH * 0.09], [ax + rowH * 0.06, ay + rowH * 0.09]], COL.sumi, COL.sumi, 1); }
    /* おやくそく */
    for (i = 0; i < q.examples.length; i++) {
      ex = q.examples[i]; y = rowH * (i + 0.5);
      drawBalls(c.ctx, c.w * 0.17, y, ex.inN, r);
      arrow(c.w * 0.35, y);
      drawTunnel(c.ctx, c.w * 0.5, y, tw, th, q.rules[ex.box].kind);
      if (hint) { delta(c.w * 0.5, y - th * 0.72, ex.box); }   /* 足場＝例から 読み取る 規則を 数で */
      arrow(c.w * 0.65, y);
      drawBalls(c.ctx, c.w * 0.83, y, ex.outN, r);
    }
    line(c.ctx, 10, rowH * q.examples.length, c.w - 10, rowH * q.examples.length, COL.usui, 2);
    /* もんだい */
    y = rowH * (rows - 0.5); step = (c.w - 40) / (q.chain.length + 2);
    drawBalls(c.ctx, 20 + step * 0.5, y, q.start, r);
    for (i = 0; i < q.chain.length; i++) {
      x = 20 + step * (i + 1.5);
      arrow(x - step / 2, y);
      drawTunnel(c.ctx, x, y, Math.min(tw, step * 0.7), th, q.rules[q.chain[i]].kind);
      if (hint) { delta(x, y - th * 0.72, q.chain[i]); }
    }
    x = 20 + step * (q.chain.length + 1.5);
    arrow(x - step / 2, y);
    c.ctx.strokeStyle = COL.ao; c.ctx.lineWidth = 3; c.ctx.strokeRect(x - rowH * 0.28, y - rowH * 0.28, rowH * 0.56, rowH * 0.56);
    c.ctx.fillStyle = COL.ao; c.ctx.fillText('？', x, y);
  }
  CM.paintTonneru = paintTonneru;
  /* ますの しるし */
  function drawMark(ctx, m, o, s) {
    var h = s * 0.32, k;
    ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (m === 'maru') { ctx.beginPath(); ctx.arc(0, 0, h, 0, Math.PI * 2); ctx.strokeStyle = COL.ao; ctx.stroke(); }
    else if (m === 'kuro') { ctx.beginPath(); ctx.arc(0, 0, h, 0, Math.PI * 2); ctx.fillStyle = COL.murasaki; ctx.fill(); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2; ctx.stroke(); }
    else if (m === 'shikaku') { ctx.beginPath(); ctx.rect(-h, -h, h * 2, h * 2); ctx.fillStyle = COL.mizu; ctx.fill(); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2; ctx.stroke(); }
    else if (m === 'batsu') { ctx.strokeStyle = COL.sumi; ctx.beginPath(); ctx.moveTo(-h, -h); ctx.lineTo(h, h); ctx.moveTo(h, -h); ctx.lineTo(-h, h); ctx.stroke(); }
    else if (m === 'sankaku') { ctx.save(); ctx.rotate(o * Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -h * 1.1); ctx.lineTo(h * 1.05, h * 0.8); ctx.lineTo(-h * 1.05, h * 0.8); ctx.closePath(); ctx.fillStyle = COL.daidai; ctx.fill(); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    else if (m === 'hanbun') { k = s * 0.36; ctx.save(); ctx.rotate(o * Math.PI / 2); ctx.beginPath(); ctx.rect(-k, -k, k * 2, k * 2); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(-k, -k); ctx.lineTo(k, -k); ctx.lineTo(-k, k); ctx.closePath(); ctx.fillStyle = COL.midori; ctx.fill(); ctx.restore(); }
    else if (m === 'sen') { ctx.save(); ctx.rotate(o * Math.PI / 2); ctx.strokeStyle = COL.sumi; ctx.lineWidth = Math.max(3, s * 0.12); ctx.beginPath(); ctx.moveTo(-h * 1.1, 0); ctx.lineTo(h * 1.1, 0); ctx.stroke(); ctx.restore(); }
  }
  CM.drawMark = drawMark;
  function paintGridFig(canvas, fig, extraRot, diffWith) {
    var c = setupCanvas(canvas), s = Math.min(c.w, c.h) * 0.8, n = fig.n, cs = s / n, i, cell, mine, theirs, r, cc;
    paper(c.ctx, c.w, c.h);
    c.ctx.translate(c.w / 2, c.h / 2); c.ctx.rotate(extraRot || 0);
    c.ctx.strokeStyle = COL.usui; c.ctx.lineWidth = 1.5;
    for (i = 1; i < n; i++) { line(c.ctx, -s / 2 + cs * i, -s / 2, -s / 2 + cs * i, s / 2, COL.usui, 1.5); line(c.ctx, -s / 2, -s / 2 + cs * i, s / 2, -s / 2 + cs * i, COL.usui, 1.5); }
    c.ctx.strokeStyle = COL.sumi; c.ctx.lineWidth = 2.5; c.ctx.strokeRect(-s / 2, -s / 2, s, s);
    for (i = 0; i < fig.cells.length; i++) {
      cell = fig.cells[i]; c.ctx.save(); c.ctx.translate(-s / 2 + cs * (cell.c + 0.5), -s / 2 + cs * (cell.r + 0.5)); drawMark(c.ctx, cell.m, cell.o, cs); c.ctx.restore();
    }
    if (diffWith) {
      /* 足場＝正解の かたち（diffWith）と ちがう ますを 輪で かこむ */
      mine = {}; theirs = {};
      for (i = 0; i < fig.cells.length; i++) { mine[fig.cells[i].r + ',' + fig.cells[i].c] = fig.cells[i].m + fig.cells[i].o; }
      for (i = 0; i < diffWith.cells.length; i++) { theirs[diffWith.cells[i].r + ',' + diffWith.cells[i].c] = diffWith.cells[i].m + diffWith.cells[i].o; }
      for (r = 0; r < n; r++) { for (cc = 0; cc < n; cc++) { if ((mine[r + ',' + cc] || '') !== (theirs[r + ',' + cc] || '')) { circle(c.ctx, -s / 2 + cs * (cc + 0.5), -s / 2 + cs * (r + 0.5), cs * 0.46, null, COL.daidai, 4); } } }
    }
  }
  CM.paintGridFig = paintGridFig;
  /* かさねる＝3まいを よこに ならべて ＋ で つなぐ */
  function paintKasaneStem(canvas, q, hint) {
    var c = setupCanvas(canvas), k = q.sheets.length, cols = hint ? k + 1 : k, s = Math.min(c.h * 0.9, (c.w - 20 * (cols - 1)) / cols), i, x0 = (c.w - (s * cols + 20 * (cols - 1))) / 2, part, key;
    paper(c.ctx, c.w, c.h);
    if (hint) {
      /* 足場＝さいごの 1まい いがいを かさねた 途中の形（完成問題＝あと1まい） */
      part = {};
      for (i = 0; i < k - 1; i++) { for (key in q.sheets[i]) { if (q.sheets[i].hasOwnProperty(key)) { part[key] = q.sheets[i][key]; } } }
      c.ctx.save(); c.ctx.translate(x0 + k * (s + 20), (c.h - s) / 2);
      c.ctx.strokeStyle = COL.daidai; c.ctx.lineWidth = 3; c.ctx.strokeRect(0, 0, s, s);
      drawDots(c.ctx, q.n, s, part, { color: COL.daidai });
      c.ctx.restore();
    }
    c.ctx.font = 'bold ' + Math.round(s * 0.3) + 'px sans-serif'; c.ctx.fillStyle = COL.sumi; c.ctx.textAlign = 'center'; c.ctx.textBaseline = 'middle';
    for (i = 0; i < k; i++) {
      c.ctx.save(); c.ctx.translate(x0 + i * (s + 20), (c.h - s) / 2);
      c.ctx.strokeStyle = COL.hai; c.ctx.lineWidth = 2; c.ctx.strokeRect(0, 0, s, s);
      drawDots(c.ctx, q.n, s, q.sheets[i], {});
      c.ctx.restore();
      if (i < k - 1) { c.ctx.fillText('＋', x0 + i * (s + 20) + s + 10, c.h / 2); }
    }
  }
  CM.paintKasaneStem = paintKasaneStem;

  /* ================= おと（ファイルを使わず その場で つくる） ================= */
  var NOTE = { C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, B5: 987.8,
    C6: 1046.5, D6: 1174.7, E6: 1318.5, F6: 1396.9, G6: 1568.0, A6: 1760.0, C7: 2093.0, E4: 329.6, G4: 392.0, A4: 440.0 };
  CM.NOTE = NOTE;
  var SOUNDS = {
    tap: [['A5', 0, 0.06, 0.35, 'triangle']],
    dot: [['E6', 0, 0.05, 0.3, 'triangle']],
    ok: [['C6', 0, 0.09, 0.6, 'square'], ['E6', 0.08, 0.09, 0.6, 'square'], ['G6', 0.16, 0.09, 0.6, 'square'], ['C7', 0.24, 0.28, 0.6, 'square'], ['G6', 0.24, 0.28, 0.35, 'triangle']],
    ok2: [['E6', 0, 0.09, 0.5, 'square'], ['A6', 0.09, 0.22, 0.5, 'square']],
    oshii: [['G5', 0, 0.12, 0.45, 'sine'], ['E5', 0.13, 0.2, 0.45, 'sine']],
    kotae: [['A4', 0, 0.16, 0.4, 'sine'], ['C5', 0.16, 0.16, 0.4, 'sine'], ['E5', 0.32, 0.26, 0.4, 'sine']],
    round: [['C5', 0, 0.12, 0.55, 'square'], ['E5', 0.13, 0.12, 0.55, 'square'], ['G5', 0.26, 0.12, 0.55, 'square'], ['C6', 0.42, 0.55, 0.5, 'square'], ['E6', 0.42, 0.55, 0.35, 'triangle'], ['G5', 0.42, 0.55, 0.35, 'triangle']],
    perfect: [['C5', 0, 0.1, 0.55, 'square'], ['E5', 0.1, 0.1, 0.55, 'square'], ['G5', 0.2, 0.1, 0.55, 'square'], ['C6', 0.3, 0.1, 0.55, 'square'], ['E6', 0.4, 0.1, 0.55, 'square'], ['G6', 0.5, 0.1, 0.55, 'square'], ['C7', 0.62, 0.7, 0.5, 'square'], ['E6', 0.62, 0.7, 0.35, 'triangle'], ['G6', 0.62, 0.7, 0.35, 'triangle']],
    grow: [['G5', 0, 0.08, 0.45, 'triangle'], ['C6', 0.07, 0.08, 0.45, 'triangle'], ['E6', 0.14, 0.08, 0.45, 'triangle'], ['G6', 0.21, 0.08, 0.45, 'triangle'], ['C7', 0.28, 0.08, 0.45, 'triangle'], ['E6', 0.36, 0.08, 0.4, 'triangle'], ['G6', 0.43, 0.08, 0.4, 'triangle'], ['C7', 0.5, 0.45, 0.5, 'triangle']],
    combo: [['C6', 0, 0.07, 0.5, 'square'], ['E6', 0.07, 0.07, 0.5, 'square'], ['G6', 0.14, 0.07, 0.5, 'square'], ['C7', 0.21, 0.07, 0.5, 'square'], ['E6', 0.3, 0.2, 0.45, 'triangle'], ['G6', 0.3, 0.2, 0.45, 'triangle'], ['C7', 0.3, 0.3, 0.45, 'triangle']]
  };
  CM.SOUNDS = SOUNDS;
  var snd = { ctx: null, on: true, vol: 0.22, keep: null };
  CM.snd = snd;
  function audioClass() { return global.AudioContext || global.webkitAudioContext || null; }
  /* 音の ない 短い WAV（8000Hz・16bit・0.25びょう）。消音スイッチ対策の ために ながしつづける（こころの じゅんび と 同じ） */
  function silentWav() {
    var n = 2000, len = n * 2, h, i;
    function u32(v) { return String.fromCharCode(v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255); }
    function u16(v) { return String.fromCharCode(v & 255, (v >> 8) & 255); }
    h = 'RIFF' + u32(36 + len) + 'WAVE' + 'fmt ' + u32(16) + u16(1) + u16(1) + u32(8000) + u32(16000) + u16(2) + u16(16) + 'data' + u32(len);
    for (i = 0; i < len; i++) { h += String.fromCharCode(0); }
    return 'data:audio/wav;base64,' + global.btoa(h);
  }
  CM.silentWav = silentWav;
  /* 音の しくみが 止まっていたら 起こしなおす（K4）。iPad は 画面を 消したり ほかの アプリへ 行くと 止まる。
     鳴らす 入口で 毎回 見る（とまっていなければ 何もしない）。失敗しても 止まらない */
  function wake(ctx) {
    var p;
    try {
      if (ctx && ctx.state && ctx.state !== 'running' && ctx.resume) {
        p = ctx.resume();
        if (p && typeof p.then === 'function') { p.then(function () {}, function () {}); }
        return true;
      }
    } catch (e) { /* 鳴らなくても つかえる */ }
    return false;
  }
  CM.wakeAudio = wake;
  /* さいしょの タッチで 音の しくみを おこす（iOS 10 は タッチの 中で ないと 鳴らない）。
     iPad の 消音（よこの スイッチ・コントロールセンター）が 入って いると、合成の 音（Web Audio）だけ 消される。
     音の ない audio を 1つ ながしつづけると、ページが「再生」あつかいに なり、合成の 音も 鳴る（推定・実機で 確かめる） */
  snd.unlock = function () {
    var AC, b, src, a;
    try {
      if (!snd.keep && global.Audio) {
        a = new global.Audio(); a.src = silentWav(); a.loop = true;
        snd.keep = a;
      }
      if (snd.keep && snd.on && snd.keep.paused) {
        b = snd.keep.play();
        if (b && typeof b.then === 'function') { b.then(function () {}, function () {}); }   /* 鳴らせない ときの 知らせを 受けとめて おく */
      }
    } catch (e0) { /* 鳴らなくても つかえる */ }
    try {
      if (!snd.ctx) {
        AC = audioClass(); if (!AC) { return false; }
        snd.ctx = new AC();
        b = snd.ctx.createBuffer(1, 1, 22050);
        src = snd.ctx.createBufferSource(); src.buffer = b; src.connect(snd.ctx.destination);
        if (src.start) { src.start(0); } else if (src.noteOn) { src.noteOn(0); }
      }
      wake(snd.ctx);
      return true;
    } catch (e) { return false; }
  };
  function tone(ctx, freq, at, dur, vol, type) {
    var o = ctx.createOscillator(), g = ctx.createGain(), peak = Math.max(0.0002, vol * snd.vol);
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ctx.destination);
    if (o.start) { o.start(at); o.stop(at + dur + 0.03); } else { o.noteOn(at); o.noteOff(at + dur + 0.03); }
  }
  snd.play = function (name, delay) {
    var ctx = snd.ctx, seq = SOUNDS[name], t0, i, n;
    if (!snd.on || !ctx || !seq) { return false; }
    wake(ctx);
    try {
      t0 = ctx.currentTime + 0.01 + (delay || 0);
      for (i = 0; i < seq.length; i++) { n = seq[i]; tone(ctx, NOTE[n[0]], t0 + n[1], n[2], n[3], n[4]); }
      return true;
    } catch (e) { return false; }
  };
  /* よみあげ（端末の こえ。無ければ 何もしない） */
  snd.say = function (text) {
    var u;
    if (!snd.on || snd.voice === false) { return false; }
    try {
      if (!global.speechSynthesis || !global.SpeechSynthesisUtterance) { return false; }
      global.speechSynthesis.cancel();
      u = new global.SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; u.rate = 0.9;
      global.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  };

  /* ================= きろく（端末内保存） ================= */
  function freshState() {
    var g = {}, i;
    for (i = 0; i < GENRES.length; i++) { g[GENRES[i].id] = { level: 1, rounds: 0, q: 0, ok: 0 }; }
    return { schema: CM.SCHEMA, name: '', perRound: 5, total: 0, cIndex: 0, cLeaves: 0, zukan: [], lap: 0, g: g, mix: { rounds: 0, q: 0, ok: 0 } };
  }
  CM.freshState = freshState;
  function loadState() {
    var raw = null, s, i;
    try { raw = global.localStorage ? global.localStorage.getItem(CM.STORE_KEY) : null; } catch (e) { raw = null; }
    if (!raw) { return freshState(); }
    try { s = JSON.parse(raw); } catch (e2) { return freshState(); }
    if (!s || s.schema !== CM.SCHEMA) { return freshState(); }
    for (i = 0; i < GENRES.length; i++) { if (!s.g[GENRES[i].id]) { s.g[GENRES[i].id] = { level: 1, rounds: 0, q: 0, ok: 0 }; } }
    return s;
  }
  function saveState(s) { try { if (global.localStorage) { global.localStorage.setItem(CM.STORE_KEY, JSON.stringify(s)); } } catch (e) { /* 保存できなくても あそべる */ } }
  CM.loadState = loadState; CM.saveState = saveState;

  /* 1まわりの あとの レベルの 上げ下げ（純粋な計算）＝5もん中 4もん 以上 はじめて正解なら 上へ・2もん 以下なら 下へ */
  function nextLevel(level, firstOk, total) {
    if (firstOk >= Math.ceil(total * 0.8) && level < 3) { return level + 1; }
    if (firstOk <= Math.floor(total * 0.4) && level > 1) { return level - 1; }
    return level;
  }
  CM.nextLevel = nextLevel;

  /* ================= いきもの（ごほうび） ================= */
  var GROW = [0, 6, 14, 24];
  CM.GROW = GROW;
  function stageOf(leaves) { if (leaves >= GROW[3]) { return 3; } if (leaves >= GROW[2]) { return 2; } if (leaves >= GROW[1]) { return 1; } return 0; }
  CM.stageOf = stageOf;
  var STAGE_NAME = ['たまご', 'ようちゅう', 'さなぎ', 'せいちゅう'];
  CM.STAGE_NAME = STAGE_NAME;
  var PICS = [
    { id: 'sakana', name: 'さかな', draw: function (ctx) {
      poly(ctx, [[-26, 0], [-42, -15], [-42, 15]], COL.ao, COL.sumi, 2);
      poly(ctx, [[-16, -11], [-4, -36], [14, -11]], COL.mizu, COL.sumi, 2);
      ellipse(ctx, -4, 0, 26, 14, COL.ao, COL.sumi, 2);
      circle(ctx, 10, -4, 4.5, COL.shiro, COL.sumi, 1.5); circle(ctx, 11, -4, 2, COL.sumi);
      line(ctx, 17, 5, 22, 3, COL.sumi, 2);
    } },
    { id: 'katatsumuri', name: 'かたつむり', draw: function (ctx) {
      ellipse(ctx, 6, 18, 30, 8, COL.murasaki, COL.sumi, 2); circle(ctx, 26, 8, 9, COL.murasaki, COL.sumi, 2);
      line(ctx, 29, 0, 33, -12, COL.sumi, 2.5); circle(ctx, 33, -13, 2.5, COL.sumi); line(ctx, 23, 0, 21, -10, COL.sumi, 2.5); circle(ctx, 21, -11, 2.5, COL.sumi);
      circle(ctx, -10, -2, 20, COL.daidai, COL.sumi, 2);
      ctx.beginPath(); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2.5; ctx.arc(-10, -2, 12, 0, Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(-8, -4, 5, 0, Math.PI * 1.5); ctx.stroke(); circle(ctx, 29, 6, 1.8, COL.sumi);
    } },
    { id: 'tentoumushi', name: 'てんとうむし', draw: function (ctx) {
      line(ctx, -16, -6, -30, -14, COL.sumi, 2.5); line(ctx, -20, 6, -34, 8, COL.sumi, 2.5); line(ctx, -14, 18, -26, 28, COL.sumi, 2.5);
      line(ctx, 16, -6, 30, -14, COL.sumi, 2.5); line(ctx, 20, 6, 34, 8, COL.sumi, 2.5); line(ctx, 14, 18, 26, 28, COL.sumi, 2.5);
      circle(ctx, 0, 4, 23, COL.aka, COL.sumi, 2); circle(ctx, 0, -18, 10, COL.sumi); line(ctx, 0, -10, 0, 27, COL.sumi, 2);
      circle(ctx, -11, -2, 5.5, COL.sumi); circle(ctx, 10, 9, 5.5, COL.sumi); circle(ctx, -8, 16, 4.5, COL.sumi); circle(ctx, 11, -4, 4, COL.sumi);
    } },
    { id: 'kotori', name: 'ことり', draw: function (ctx) {
      poly(ctx, [[-16, 2], [-38, -10], [-34, 8]], COL.mizu, COL.sumi, 2);
      line(ctx, 4, 18, 4, 30, COL.sumi, 2.5); line(ctx, -6, 18, -6, 30, COL.sumi, 2.5);
      ellipse(ctx, 0, 4, 21, 15, COL.mizu, COL.sumi, 2); ellipse(ctx, -3, 3, 12, 6, COL.ao, COL.sumi, 1.5);
      circle(ctx, 17, -13, 11, COL.mizu, COL.sumi, 2); poly(ctx, [[26, -15], [38, -11], [26, -7]], COL.daidai, COL.sumi, 1.5); circle(ctx, 19, -15, 2.2, COL.sumi);
    } },
    { id: 'imomushi', name: 'いもむし', draw: function (ctx) {
      circle(ctx, -28, 10, 9, COL.midori, COL.sumi, 2); circle(ctx, -13, 7, 10, COL.midori, COL.sumi, 2); circle(ctx, 3, 5, 11, COL.midori, COL.sumi, 2);
      line(ctx, 25, -10, 30, -24, COL.sumi, 2.5); circle(ctx, 30, -25, 2.5, COL.sumi); line(ctx, 18, -10, 16, -22, COL.sumi, 2.5); circle(ctx, 16, -23, 2.5, COL.sumi);
      circle(ctx, 22, 1, 13, COL.midori, COL.sumi, 2); circle(ctx, 27, -3, 2.5, COL.sumi); line(ctx, 27, 5, 31, 7, COL.sumi, 2);
    } },
    { id: 'kabutomushi', name: 'かぶとむし', draw: function (ctx) {
      line(ctx, -12, -2, -30, -12, COL.sumi, 3); line(ctx, -14, 8, -34, 12, COL.sumi, 3); line(ctx, -8, 18, -26, 30, COL.sumi, 3);
      line(ctx, 12, -2, 30, -12, COL.sumi, 3); line(ctx, 14, 8, 34, 12, COL.sumi, 3); line(ctx, 8, 18, 26, 30, COL.sumi, 3);
      ellipse(ctx, 0, 8, 20, 24, '#5a3b1e', COL.sumi, 2); line(ctx, 0, -10, 0, 30, COL.sumi, 1.5);
      ellipse(ctx, 0, -18, 12, 9, '#5a3b1e', COL.sumi, 2);
      line(ctx, 0, -24, 0, -40, COL.sumi, 4); line(ctx, 0, -40, -9, -48, COL.sumi, 3.5); line(ctx, 0, -40, 9, -48, COL.sumi, 3.5);
      circle(ctx, -5, -19, 1.8, COL.shiro); circle(ctx, 5, -19, 1.8, COL.shiro);
    } },
    { id: 'kaeru', name: 'かえる', draw: function (ctx) {
      ellipse(ctx, -24, 18, 12, 7, COL.midori, COL.sumi, 2); ellipse(ctx, 24, 18, 12, 7, COL.midori, COL.sumi, 2);
      ellipse(ctx, 0, 6, 28, 20, COL.midori, COL.sumi, 2);
      circle(ctx, -13, -14, 9, COL.midori, COL.sumi, 2); circle(ctx, 13, -14, 9, COL.midori, COL.sumi, 2);
      circle(ctx, -13, -14, 4.5, COL.shiro, COL.sumi, 1); circle(ctx, 13, -14, 4.5, COL.shiro, COL.sumi, 1); circle(ctx, -12, -14, 2, COL.sumi); circle(ctx, 14, -14, 2, COL.sumi);
      ctx.beginPath(); ctx.arc(0, 2, 12, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2; ctx.stroke();
    } },
    { id: 'chou', name: 'ちょう', draw: function (ctx) {
      ellipse(ctx, -20, -10, 18, 15, COL.daidai, COL.sumi, 2); ellipse(ctx, 20, -10, 18, 15, COL.daidai, COL.sumi, 2);
      ellipse(ctx, -16, 14, 13, 11, COL.ki, COL.sumi, 2); ellipse(ctx, 16, 14, 13, 11, COL.ki, COL.sumi, 2);
      circle(ctx, -22, -10, 5, COL.shiro, COL.sumi, 1.5); circle(ctx, 22, -10, 5, COL.shiro, COL.sumi, 1.5);
      ellipse(ctx, 0, 2, 5, 22, COL.sumi); line(ctx, -2, -20, -10, -34, COL.sumi, 2); line(ctx, 2, -20, 10, -34, COL.sumi, 2);
    } }
  ];
  /* 9つ目から＝ChatGPT の絵（img/zukan/<id>.png・甲虫44種）。絵は 読めたら 描く。読めるまでは たまごの印 */
  var ZUKAN_IMGS = [
    ['herakuresu_ookabuto', 'ヘラクレスオオカブト'], ['kookasasu_ookabuto', 'コーカサスオオカブト'], ['atorasu_ookabuto', 'アトラスオオカブト'], ['neputyuun_ookabuto', 'ネプチューンオオカブト'], ['satan_ookabuto', 'サタンオオカブト'],
    ['guranto_shirokabuto', 'グラントシロカブト'], ['gohonzuno_kabuto', 'ゴホンヅノカブト'], ['akuteon_zoukabuto', 'アクティオンゾウカブト'], ['kentaurusu_ookabuto', 'ケンタウルスオオカブト'], ['sai_kabuto', 'サイカブト'],
    ['nokogiri_kuwagata', 'ノコギリクワガタ'], ['ookuwagata', 'オオクワガタ'], ['miyama_kuwagata', 'ミヤマクワガタ'], ['kokuwagata', 'コクワガタ'], ['hirata_kuwagata', 'ヒラタクワガタ'],
    ['akaashi_kuwagata', 'アカアシクワガタ'], ['suji_kuwagata', 'スジクワガタ'], ['girafa_nokogiri', 'ギラファノコギリクワガタ'], ['nijiiro_kuwagata', 'ニジイロクワガタ'], ['tarandusu_ootsuya', 'タランドゥスオオツヤクワガタ'],
    ['parawan_oohirata', 'パラワンオオヒラタクワガタ'], ['sumatora_oohirata', 'スマトラオオヒラタクワガタ'], ['ougon_oni_kuwagata', 'オウゴンオニクワガタ'], ['erafusu_hosoaka', 'エラフスホソアカクワガタ'], ['mengata_kuwagata', 'メンガタクワガタ'],
    ['mandiburarisu_futamata', 'マンディブラリスフタマタクワガタ'], ['antaeusu_ookuwagata', 'アンタエウスオオクワガタ'], ['yooroppa_miyama', 'ヨーロッパミヤマクワガタ'], ['rakodaaru_tsuya', 'ラコダールツヤクワガタ'],
    ['goraiasu_ootsunohanamuguri', 'ゴライアスオオツノハナムグリ'], ['tenaga_kogane', 'テナガコガネ'], ['kanabun', 'カナブン'], ['yamato_tamamushi', 'ヤマトタマムシ'], ['gengorou', 'ゲンゴロウ'],
    ['genji_botaru', 'ゲンジボタル'], ['gomadara_kamikiri', 'ゴマダラカミキリ'], ['ruriboshi_kamikiri', 'ルリボシカミキリ'], ['oo_osamushi', 'オオオサムシ'], ['hanmyou', 'ハンミョウ'],
    ['midori_senchikogane', 'ミドリセンチコガネ'], ['daikoku_kogane', 'ダイコクコガネ'], ['sukarabe', 'スカラベ'], ['oozoumushi', 'オオゾウムシ'], ['mizusumashi', 'ミズスマシ']
  ];
  var ZIMG = {};
  CM.onImgReady = null;
  function zimg(id) {
    var im;
    if (!ZIMG[id]) {
      im = new global.Image();
      im.onload = function () { if (CM.onImgReady) { try { CM.onImgReady(id); } catch (e) { /* 描き直しは 任意 */ } } };
      im.src = 'img/zukan/' + id + '.png';
      ZIMG[id] = im;
    }
    return ZIMG[id];
  }
  CM.preloadZukan = function () { var i; for (i = 0; i < ZUKAN_IMGS.length; i++) { zimg(ZUKAN_IMGS[i][0]); } };
  function drawZukanImg(ctx, id) {
    var im = zimg(id);
    if (im.complete && im.naturalWidth > 0) { ctx.drawImage(im, -50, -50, 100, 100); }
    else { circle(ctx, 0, 0, 36, COL.kami, COL.sumi, 2.5); ctx.fillStyle = COL.sumi; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 2); }
  }
  (function () {
    var i;
    for (i = 0; i < ZUKAN_IMGS.length; i++) {
      PICS.push({ id: ZUKAN_IMGS[i][0], name: ZUKAN_IMGS[i][1], img: true, draw: (function (id) { return function (ctx) { drawZukanImg(ctx, id); }; })(ZUKAN_IMGS[i][0]) });
    }
  })();
  CM.ZUKAN_IMGS = ZUKAN_IMGS;
  CM.PICS = PICS;
  var PIC_BY_ID = {};
  (function () { var i; for (i = 0; i < PICS.length; i++) { PIC_BY_ID[PICS[i].id] = PICS[i]; } })();
  CM.picById = function (id) { return PIC_BY_ID[id]; };

  function addLeaves(s, n) {
    var events = [], before = stageOf(s.cLeaves), after, id;
    s.total += n; s.cLeaves += n;
    while (s.cLeaves >= GROW[3]) {
      id = PICS[s.cIndex % PICS.length].id;
      s.zukan.push(id); events.push({ kind: 'adult', id: id });
      s.cLeaves -= GROW[3]; s.cIndex += 1;
      if (s.cIndex % PICS.length === 0) { s.lap += 1; events.push({ kind: 'lap', lap: s.lap }); }
      before = 0;
    }
    after = stageOf(s.cLeaves);
    if (after > before) { events.push({ kind: 'stage', stage: after }); }
    return events;
  }
  CM.addLeaves = addLeaves;
  var RANKS = [[0, 'もりの みならい'], [20, 'もりの なかま'], [50, 'もりの めいじん'], [100, 'もりの はかせ'], [200, 'もりの たつじん']];
  function rankOf(total) { var i, name = RANKS[0][1]; for (i = 0; i < RANKS.length; i++) { if (total >= RANKS[i][0]) { name = RANKS[i][1]; } } return name; }
  CM.rankOf = rankOf;
  function nextRankAt(total) { var i; for (i = 0; i < RANKS.length; i++) { if (total < RANKS[i][0]) { return RANKS[i][0]; } } return null; }
  CM.nextRankAt = nextRankAt;

  function drawStage(ctx, size, stage, picId) {
    var s = size / 100;
    ctx.save(); ctx.scale(s, s); ctx.lineJoin = 'round';
    if (stage === 0) { ellipse(ctx, 0, 2, 24, 30, COL.kami, COL.sumi, 2.5); circle(ctx, -8, -6, 4, COL.ki); circle(ctx, 9, 4, 5, COL.ki); circle(ctx, -4, 16, 3.5, COL.ki); }
    else if (stage === 1) { circle(ctx, -24, 8, 9, COL.ki, COL.sumi, 2); circle(ctx, -10, 6, 10, COL.ki, COL.sumi, 2); circle(ctx, 5, 4, 10, COL.ki, COL.sumi, 2); circle(ctx, 22, 2, 12, COL.ki, COL.sumi, 2); circle(ctx, 26, -2, 2.2, COL.sumi); }
    else if (stage === 2) {
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.quadraticCurveTo(26, -6, 16, 24); ctx.quadraticCurveTo(0, 40, -16, 24); ctx.quadraticCurveTo(-26, -6, 0, -34); ctx.closePath();
      ctx.fillStyle = COL.daidai; ctx.fill(); ctx.strokeStyle = COL.sumi; ctx.lineWidth = 2.5; ctx.stroke();
      line(ctx, -10, -4, 10, -4, COL.sumi, 2); line(ctx, -12, 8, 12, 8, COL.sumi, 2); line(ctx, -8, 20, 8, 20, COL.sumi, 2); line(ctx, 0, -34, 0, -44, COL.sumi, 3);
    } else { PIC_BY_ID[picId].draw(ctx); }
    ctx.restore();
  }
  CM.drawStage = drawStage;
  function paintStage(canvas, stage, picId) {
    var c = setupCanvas(canvas);
    c.ctx.translate(c.w / 2, c.h / 2); drawStage(c.ctx, Math.min(c.w, c.h) * 0.9, stage, picId);
  }
  CM.paintStage = paintStage;

  /* ================= 自己点検（tools/test.html から 呼ぶ） ================= */
  CM.selfTest = function (doc) {
    var out = [], pass = 0, fail = 0;
    function ok(cond, label) { if (cond) { pass++; } else { fail++; out.push('FAIL ' + label); } }
    var i, j, g, lvl, q, s, set, sigs, dup, u, canvas, ctx, k, cnt, levels, v, segs, a, b;

    CM.seed(4242);
    /* T1 点と線の きまり */
    u = unitSegs([0, 0], [2, 0]); ok(u && u.length === 2 && segKey(u[1][0], u[1][1]) === '1,0-2,0', 'T1 よこ2＝単位2本');
    u = unitSegs([0, 0], [2, 2]); ok(u && u.length === 2, 'T1 ななめ2＝単位2本');
    ok(unitSegs([0, 0], [2, 1]) === null, 'T1 ななめでない線は だめ');
    ok(segKey([1, 2], [0, 0]) === segKey([0, 0], [1, 2]), 'T1 線の むきに よらない');
    set = makePath(5, 6, true, 2); ok(segCount(set) === 6, 'T1 6本の 線');
    segs = setToSegs(set); ok(segSetSig(segsToSet(mapSegs(mapSegs(segs, flipX, 5), flipX, 5))) === segSetSig(set), 'T1 2回うつすと もどる');
    ok(segSetSig(segsToSet(mapSegs(mapSegs(mapSegs(mapSegs(segs, rot90, 5), rot90, 5), rot90, 5), rot90, 5))) === segSetSig(set), 'T1 4回まわすと もどる');
    a = perturb(set, 5); ok(a === null || (segCount(a) === segCount(set) && segSetSig(a) !== segSetSig(set)), 'T1 1本ちがい は 本数が同じで 形がちがう');

    /* T6 え の もんだい＝正解が 条件に あい、まちがいは 条件に あわない（300問ずつ）・絵の 一覧 66 */
    ok(ITEMS.length === 66, 'T6 絵は 66');
    (function () {
      var seen = {}, n, w, p, t, it;
      for (n = 0; n < ITEMS.length; n++) { ok(!seen[ITEMS[n].id], 'T6 id 重複 ' + ITEMS[n].id); seen[ITEMS[n].id] = true; ok(ITEMS[n].m.join('') === ITEMS[n].name, 'T6 音と なまえが 一致 ' + ITEMS[n].id); }
      for (lvl = 1; lvl <= 3; lvl++) {
        for (n = 0; n < 300; n++) {
          q = makeKisetsu(lvl);
          it = ITEM_BY_ID[q.stem];
          ok(q.choices.indexOf(q.stem) < 0, 'T6 kisetsu おてほんは えらびしに ない');
          for (j = 0; j < q.choices.length; j++) {
            w = ITEM_BY_ID[q.choices[j]];
            t = (q.sub === 'season') ? (w.season === it.season) : (w.cat === it.cat);
            ok(t === (j === q.answerIndex), 'T6 kisetsu ' + q.sub + ' lv' + lvl + ' 正解だけが 同じ ' + q.stem + '→' + w.id);
          }
          q = makeKotoba(lvl);
          ok(!!q, 'T6 kotoba 作れる lv' + lvl);
          if (q.sub === 'onsu') { ok(ITEM_BY_ID[q.target].m.length === q.answer && q.choices.indexOf(q.answer) >= 0, 'T6 onsu 音の数'); }
          else {
            for (j = 0; j < q.choices.length; j++) {
              w = ITEM_BY_ID[q.choices[j]];
              if (q.sub === 'hajime' || q.sub === 'shiritori') { t = (firstMora(w) === q.sound); } else { t = (lastMora(w) === q.sound); }
              ok(t === (j === q.answerIndex), 'T6 kotoba ' + q.sub + ' lv' + lvl + ' 正解だけが 音に あう ' + w.id + ' ' + q.sound);
            }
            if (q.sub === 'shiritori') { ok(firstMora(ITEM_BY_ID[q.chain[1]]) === lastMora(ITEM_BY_ID[q.chain[0]]), 'T6 しりとりの くさりが つながる'); }
          }
          q = makeOhanashi(lvl);
          ok(q.parts.length === (lvl === 1 ? 2 : (lvl === 2 ? 3 : 5)), 'T6 ohanashi もんだいの 数 lv' + lvl + ' =' + q.parts.length);
          for (p = 0; p < q.parts.length; p++) {
            w = ITEM_BY_ID[q.parts[p].choices[q.parts[p].answerIndex]];
            if (q.parts[p].ask.indexOf('きせつ') < 0) { ok(q.storyText.indexOf(w.name) >= 0, 'T6 ohanashi 正解は おはなしに 出てくる ' + w.id); }
            for (j = 0; j < q.parts[p].choices.length; j++) {
              if (j === q.parts[p].answerIndex || q.parts[p].ask.indexOf('きせつ') >= 0 || q.parts[p].ask.indexOf('かばん') >= 0) { continue; }
              ok(q.storyText.indexOf(ITEM_BY_ID[q.parts[p].choices[j]].name) < 0, 'T6 ohanashi まちがいは おはなしに 出てこない ' + q.parts[p].choices[j]);
            }
          }
        }
      }
    })();
    /* T2 もんだい＝全部の型・レベルで 300問ずつ＝正解が1つ・えらびしに 同じものなし */
    for (g = 0; g < GENRES.length; g++) {
      for (lvl = 1; lvl <= 3; lvl++) {
        for (i = 0; i < 300; i++) {
          q = makeQuestion(GENRES[g].id, lvl);
          ok(q && q.g === GENRES[g].id, 'T2 ' + GENRES[g].id + ' lv' + lvl + ' 作れる');
          if (q.kind === 'tap') {
            ok(segCount(q.model) === TEN_LV[lvl].count, 'T2 ten 本数 lv' + lvl);
            ok(q.modelSig === segSetSig(q.model), 'T2 ten sig');
            continue;
          }
          ok(q.choices.length === 4 || (q.g === 'shiso' && q.choices.length === 3), 'T2 ' + q.g + ' えらびし 4つ lv' + lvl + ' =' + q.choices.length);
          ok(q.answerIndex >= 0 && q.answerIndex < q.choices.length, 'T2 ' + q.g + ' 正解が ある lv' + lvl);
          sigs = {}; dup = 0;
          for (j = 0; j < q.choices.length; j++) {
            if (q.g === 'kagami' || q.g === 'kasane') { s = segSetSig(q.choices[j]); }
            else if (q.g === 'onaji') { s = gridSig(q.choices[j]); }
            else { s = String(q.choices[j]); }
            if (sigs[s]) { dup++; } sigs[s] = true;
          }
          ok(dup === 0, 'T2 ' + q.g + ' 同じ えらびし なし lv' + lvl);
          if (q.g === 'kagami') {
            ok(segSetSig(q.choices[q.answerIndex]) === segSetSig(segsToSet(mapSegs(setToSegs(q.model), q.axis === 'x' ? flipX : flipY, q.n))), 'T2 kagami 正解＝うつした形');
            ok(segSetSig(q.choices[q.answerIndex]) !== segSetSig(q.model), 'T2 kagami 正解は 元と ちがう');
            if (lvl === 1) { ok(q.axis === 'x', 'T2 kagami やさしい は かがみ だけ'); }
          }
          if (q.g === 'kazoe') {
            cnt = 0; for (j = 0; j < q.items.length; j++) { if (q.items[j].kind === q.target) { cnt++; } }
            ok(cnt === q.answer && q.choices[q.answerIndex] === cnt, 'T2 kazoe 数が あう lv' + lvl);
            ok(q.items.length >= KAZOE_LV[lvl].total[0] && q.items.length <= KAZOE_LV[lvl].total[1], 'T2 kazoe 全部の数 lv' + lvl);
            ok(cnt < q.items.length, 'T2 kazoe ちがう かたちも ある');
          }
          if (q.g === 'shiso') {
            /* くらべの 鎖から 順が 一通りに 決まる＝order[0] は 全部の くらべで 下がった側 にしか 出ない */
            v = q.choices[q.answerIndex];
            if (q.ask === 'heavy') { ok(v === q.order[0], 'T2 shiso いちばん おもい'); }
            if (q.ask === 'light') { ok(v === q.order[q.order.length - 1], 'T2 shiso いちばん かるい'); }
            if (q.ask === 'second') { ok(v === q.order[1], 'T2 shiso 2ばんめ'); }
            for (j = 0; j < q.pairs.length; j++) {
              a = q.order.indexOf(q.pairs[j].left); b = q.order.indexOf(q.pairs[j].right);
              ok((a < b) === (q.pairs[j].down === 'left'), 'T2 shiso さがる側が おもい');
            }
            ok(q.pairs.length === q.order.length - 1, 'T2 shiso くらべの数');
            if (lvl === 1) { ok(q.ask === 'heavy' && q.choices.length === 3, 'T2 shiso やさしい'); }
          }
          if (q.g === 'tonneru') {
            v = q.start; for (j = 0; j < q.chain.length; j++) { v += q.rules[q.chain[j]].delta; }
            ok(v === q.answer && q.choices[q.answerIndex] === v && v >= 0 && v <= 9, 'T2 tonneru 答え lv' + lvl);
            for (j = 0; j < q.examples.length; j++) { ok(q.examples[j].outN === q.examples[j].inN + q.rules[q.examples[j].box].delta && q.examples[j].outN >= 0 && q.examples[j].inN >= 1, 'T2 tonneru おやくそくの例'); }
            ok(q.chain.length === TON_LV[lvl].chain, 'T2 tonneru 通る数 lv' + lvl);
            for (j = 1; j < q.chain.length; j++) { ok(q.chain[j] !== q.chain[j - 1], 'T2 tonneru 同じトンネルが 続かない'); }
          }
          if (q.g === 'onaji') {
            ok(gridSig(q.choices[q.answerIndex]) === gridSig(transformGrid(q.base, q.rot)), 'T2 onaji 正解＝まわした形');
            /* まちがいの選択肢は もとの形の どの回転とも ちがう（正しい答えが 2つに ならない） */
            for (j = 0; j < q.choices.length; j++) { if (j === q.answerIndex) { continue; } for (k = 0; k < 4; k++) { ok(gridSig(q.choices[j]) !== gridSig(transformGrid(q.base, k)), 'T2 onaji まちがいは base の回転でない lv' + lvl); } }
            ok(gridDistinctRot(q.base), 'T2 onaji 4回の回転が 全部ちがう');
            if (lvl === 1) { ok(q.rot === 0, 'T2 onaji やさしい は まわさない'); }
            if (lvl === 3) { ok(q.rot !== 0, 'T2 onaji むずかしい は まわす'); }
          }
          if (q.g === 'kasane') {
            u = {}; for (j = 0; j < q.sheets.length; j++) { for (k in q.sheets[j]) { if (q.sheets[j].hasOwnProperty(k)) { u[k] = 1; } } }
            ok(segSetSig(q.choices[q.answerIndex]) === segSetSig(q.union) && segCount(u) === segCount(q.union), 'T2 kasane 正解＝かさねた形');
            ok(q.sheets.length === KASANE_LV[lvl].sheets, 'T2 kasane まいすう lv' + lvl);
          }
        }
      }
    }

    /* T3 絵が ぜんぶ 描ける（例外なし） */
    if (doc && doc.createElement) {
      canvas = doc.createElement('canvas'); canvas.width = 200; canvas.height = 200; canvas.style.width = '200px'; canvas.style.height = '200px';
      for (g = 0; g < GENRES.length; g++) {
        for (lvl = 1; lvl <= 3; lvl++) {
          q = makeQuestion(GENRES[g].id, lvl);
          try {
            if (q.g === 'ten') { paintDotFig(canvas, q.n, q.model, {}); }
            if (q.g === 'kagami') { paintKagamiStem(canvas, q); paintDotFig(canvas, q.n, q.choices[0], {}); }
            if (q.g === 'kazoe') { paintKazoe(canvas, q); }
            if (q.g === 'shiso') { paintShiso(canvas, q); paintShape(canvas, q.choices[0]); }
            if (q.g === 'tonneru') { paintTonneru(canvas, q); }
            if (q.g === 'onaji') { paintGridFig(canvas, q.base, 0); paintGridFig(canvas, q.choices[0], 0); }
            if (q.g === 'kasane') { paintKasaneStem(canvas, q); paintDotFig(canvas, q.n, q.choices[0], {}); }
            ok(true, 'T3');
          } catch (e) { ok(false, 'T3 ' + q.g + ' lv' + lvl + ' ' + e); }
        }
      }
      ctx = canvas.getContext('2d');
      for (i = 0; i < PICS.length; i++) { try { ctx.save(); ctx.translate(100, 100); drawStage(ctx, 100, 3, PICS[i].id); ctx.restore(); ok(true, 'T3 pic'); } catch (e2) { ok(false, 'T3 pic ' + PICS[i].id + ' ' + e2); } }
      for (i = 0; i < 3; i++) { try { ctx.save(); ctx.translate(100, 100); drawStage(ctx, 100, i, PICS[0].id); ctx.restore(); ok(true, 'T3 stage'); } catch (e3) { ok(false, 'T3 stage ' + i + ' ' + e3); } }
      for (i = 0; i < MARK_NAMES.length; i++) { for (j = 0; j < MARKS[MARK_NAMES[i]].period; j++) { try { ctx.save(); drawMark(ctx, MARK_NAMES[i], j, 30); ctx.restore(); ok(true, 'T3 mark'); } catch (e4) { ok(false, 'T3 mark ' + e4); } } }
      /* T3b ますの しるし＝向きのある しるしは 画素で 見分けられる */
      for (i = 0; i < ORIENTED.length; i++) {
        levels = [];
        for (j = 0; j < MARKS[ORIENTED[i]].period; j++) {
          ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 200, 200); ctx.translate(100, 100); drawMark(ctx, ORIENTED[i], j, 120);
          levels.push(ctx.getImageData(0, 0, 200, 200).data);
        }
        for (a = 0; a < levels.length; a++) { for (b = a + 1; b < levels.length; b++) { cnt = 0; for (k = 0; k < levels[a].length; k += 4) { if (Math.abs(levels[a][k] - levels[b][k]) + Math.abs(levels[a][k + 1] - levels[b][k + 1]) + Math.abs(levels[a][k + 2] - levels[b][k + 2]) > 60) { cnt++; } } ok(cnt > 200 * 200 * 0.01, 'T3b ' + ORIENTED[i] + ' 向き' + a + 'と' + b + ' の差=' + cnt); } }
      }
    }

    /* T4 はっぱ・レベル・もんだい文 */
    s = freshState();
    ok(addLeaves(s, 5).length === 0 && stageOf(s.cLeaves) === 0, 'T4 5まいは たまご');
    ok(addLeaves(s, 1)[0].kind === 'stage', 'T4 6まいで ようちゅう');
    addLeaves(s, 18); ok(s.zukan.length === 1 && s.zukan[0] === PICS[0].id && s.cLeaves === 0, 'T4 24まいで ずかんへ');
    ok(nextLevel(1, 4, 5) === 2 && nextLevel(3, 5, 5) === 3 && nextLevel(2, 2, 5) === 1 && nextLevel(1, 1, 5) === 1 && nextLevel(2, 3, 5) === 2, 'T4 レベルの 上げ下げ');
    ok(rankOf(0) === 'もりの みならい' && rankOf(250) === 'もりの たつじん' && nextRankAt(0) === 20 && nextRankAt(200) === null, 'T4 かんむり');
    for (g = 0; g < GENRES.length; g++) { q = makeQuestion(GENRES[g].id, 2); ok(questionText(q).length > 5, 'T4 もんだい文 ' + q.g); }
    ok(uniqNums(5, 4, 1, 25).length === 4 && uniqNums(0, 4, 0, 9).indexOf(0) >= 0, 'T4 数の えらびし');
    /* T5 おと */
    (function () {
      var name, seq, n, bad = 0, types = { sine: 1, square: 1, triangle: 1 }, keep = snd.ctx;
      for (name in SOUNDS) { if (!SOUNDS.hasOwnProperty(name)) { continue; } seq = SOUNDS[name]; for (i = 0; i < seq.length; i++) { n = seq[i]; if (!NOTE[n[0]] || !(n[1] >= 0) || !(n[2] > 0) || !(n[3] > 0 && n[3] <= 1) || !types[n[4]]) { bad++; } } }
      ok(bad === 0, 'T5 おとの ならび');
      snd.ctx = null; ok(snd.play('ok') === false, 'T5 おとの しくみが ない ときは ならさず とまらない'); snd.ctx = keep;
    })();
    /* K4 音の 起こしなおし＝止まった 音の しくみ（にせもの）で 鳴らすと resume が よばれる・動いて いれば よばない */
    (function () {
      var keep = snd.ctx, keepOn = snd.on, called = 0, fake, r1, r2, r3, c1, c2, wav;
      function nop() {}
      function node() { return { type: '', frequency: { setValueAtTime: nop }, gain: { setValueAtTime: nop, linearRampToValueAtTime: nop, exponentialRampToValueAtTime: nop }, connect: nop, start: nop, stop: nop }; }
      fake = { state: 'suspended', currentTime: 0, destination: {}, createOscillator: node, createGain: node,
        resume: function () { called++; fake.state = 'running'; } };
      snd.on = true; snd.ctx = fake;
      r1 = snd.play('tap'); c1 = called;
      r2 = snd.play('tap'); c2 = called;
      fake.state = 'interrupted'; r3 = snd.play('ok');
      snd.ctx = keep; snd.on = keepOn;
      ok(r1 === true && c1 === 1, 'K4 とまった しくみで ならすと resume が よばれる（よばれた ' + c1 + 'かい）');
      ok(r2 === true && c2 === 1, 'K4 うごいて いる ときは resume を よばない（' + c2 + 'かい）');
      ok(r3 === true && called === 2, 'K4 interrupted でも おこしなおす（' + called + 'かい）');
      fake = { state: 'suspended', resume: function () { throw new Error('x'); } };
      ok(wake(fake) === false, 'K4 resume が しっぱい しても とまらない');
      wav = silentWav();
      ok(wav.indexOf('data:audio/wav;base64,UklGR') === 0 && wav.length > 5000, 'K4 むおんの WAV が つくれる（' + wav.length + 'もじ）');
      out.push('K4 ' + (c1 === 1 && c2 === 1 && called === 2 ? 'OK' : 'NG') + ' おとの しくみが とまって いたら ならす まえに resume（suspended→' + c1 + 'かい・running→ふえない・interrupted→' + called + 'かい）');
    })();
    CM.seed(null);
    out.unshift('PASS=' + pass + ' FAIL=' + fail);
    return out;
  };

  global.CM = CM;
})(typeof window !== 'undefined' ? window : this);
