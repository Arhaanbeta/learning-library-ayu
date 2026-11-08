/* Retrieval engine: real GloVe vectors, Maya-Embed (trained contrastively for this course),
   BM25 keyword search, rank fusion, chunking and a real HNSW index. Used by M12 and A8. */
(function () {
  const MM = window.MM;
  const R = (MM.rag = {});
  const TOK = /[a-zà-ÿ]+(?:[-'][a-zà-ÿ]+)*|\d+(?:[.:]\d+)?/g;
  const STOP = new Set("the a an of to in on at is are and or for it its this that my i you your be by from with as was were do does can will what when where which how".split(" "));
  R.words = (t) => (String(t).toLowerCase().replace(/’/g, "'").match(TOK) || []);
  R.sentences = (t) => String(t).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

  let ready = null;
  R.load = function () {
    if (ready) return ready;
    ready = MM.loadData("rag").then((d) => {
      R.d = d;
      const V = d.vocab.length, D = d.dim;
      R.idx = new Map(d.vocab.map((w, i) => [w, i]));
      const bin = atob(d.vec_i8);
      R.G = new Float32Array(V * D);
      for (let i = 0; i < V; i++) for (let j = 0; j < D; j++) { let b = bin.charCodeAt(i * D + j); if (b > 127) b -= 256; R.G[i * D + j] = b * d.scale[i]; }
      R.W = Float32Array.from(d.weight);
      R.u = Float32Array.from(d.common);
      const e = d.embed, H = e.hidden, O = e.out;
      const f = f16(e.weights_f16);
      let o = 0;
      R.E = { W1: f.subarray(o, (o += D * H)), b1: f.subarray(o, (o += H)), W2: f.subarray(o, (o += H * O)), W0: f.subarray(o, (o += D * O)), H, O, scale: e.scale };
      return R;
    });
    return ready;
  };
  function f16(b64) {
    const bin = atob(b64), n = bin.length >> 1, out = new Float32Array(n);
    for (let i = 0; i < n; i++) { const hh = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); const s = hh & 0x8000 ? -1 : 1, ex = (hh >> 10) & 31, fr = hh & 1023; out[i] = ex === 0 ? s * 6.103515625e-5 * (fr / 1024) : ex === 31 ? 0 : s * Math.pow(2, ex - 15) * (1 + fr / 1024); }
    return out;
  }
  function avg(t) {
    const D = R.d.dim, v = new Float32Array(D);
    const ids = R.words(t).map((w) => R.idx.get(w)).filter((i) => i !== undefined);
    if (!ids.length) return { v, known: 0 };
    ids.forEach((i) => { const w = R.W[i]; for (let j = 0; j < D; j++) v[j] += R.G[i * D + j] * w; });
    for (let j = 0; j < D; j++) v[j] /= ids.length;
    return { v, known: ids.length };
  }
  const norm = (v) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1; return v.map((x) => x / s); };
  /* untrained baseline: SIF-weighted GloVe average, common direction removed */
  R.glove = function (t) { const { v } = avg(t); let p = 0; for (let j = 0; j < v.length; j++) p += v[j] * R.u[j]; return norm(v.map((x, j) => x - p * R.u[j])); };
  /* Maya-Embed: the same input, through a small network trained contrastively */
  R.maya = function (t) {
    const { v } = avg(t), E = R.E, D = R.d.dim;
    const x = v.map((a) => a * E.scale);
    const hdn = new Float32Array(E.H);
    for (let i = 0; i < D; i++) { const xi = x[i]; if (!xi) continue; for (let j = 0; j < E.H; j++) hdn[j] += xi * E.W1[i * E.H + j]; }
    for (let j = 0; j < E.H; j++) hdn[j] = Math.tanh(hdn[j] + E.b1[j]);
    const y = new Float32Array(E.O);
    for (let i = 0; i < E.H; i++) { const a = hdn[i]; for (let j = 0; j < E.O; j++) y[j] += a * E.W2[i * E.O + j]; }
    for (let i = 0; i < D; i++) { const a = x[i]; if (!a) continue; for (let j = 0; j < E.O; j++) y[j] += a * E.W0[i * E.O + j]; }
    return norm(y);
  };
  R.known = (t) => { const ws = R.words(t); return { total: ws.length, unknown: ws.filter((w) => !R.idx.has(w)) }; };
  R.dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

  /* chunks: Maya's documents (and optional extras) cut into groups of sentences */
  R.chunk = function (docs, size, overlap) {
    const out = [];
    docs.forEach((doc) => {
      const ss = R.sentences(doc.text), step = Math.max(1, size - (overlap || 0));
      for (let i = 0; i < ss.length; i += step) { out.push({ doc: doc.id, title: doc.title, text: ss.slice(i, i + size).join(" ") }); if (i + size >= ss.length) break; }
    });
    return out;
  };

  /* BM25 keyword scoring (k1 = 1.2, b = 0.75) */
  R.bm25 = function (chunks, q) {
    const toks = chunks.map((c) => R.words(c.text).filter((w) => !STOP.has(w)));
    const N = toks.length, avgL = toks.reduce((a, t) => a + t.length, 0) / N, df = new Map();
    toks.forEach((t) => new Set(t).forEach((w) => df.set(w, (df.get(w) || 0) + 1)));
    const qs = R.words(q).filter((w) => !STOP.has(w));
    return toks.map((t) => { let s = 0; qs.forEach((w) => { const n = df.get(w); if (!n) return; const f = t.filter((x) => x === w).length; if (!f) return; const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5)); s += idf * f * 2.2 / (f + 1.2 * (0.25 + 0.75 * t.length / avgL)); }); return s; });
  };

  /* search: mode = vectors | keywords | hybrid; model = maya | glove */
  R.search = function (chunks, q, mode, model) {
    const emb = model === "glove" ? R.glove : R.maya;
    let vs = null, ks = null;
    if (mode !== "keywords") { const qv = emb(q); vs = chunks.map((c) => { c._v = c._v && c._m === model ? c._v : emb(c.text); c._m = model; return R.dot(qv, c._v); }); }
    if (mode !== "vectors") ks = R.bm25(chunks, q);
    let score;
    if (mode === "vectors") score = vs;
    else if (mode === "keywords") score = ks;
    else {
      score = chunks.map(() => 0);
      [vs, ks].forEach((arr) => arr.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).forEach(([, i], rank) => (score[i] += 1 / (60 + rank))));
    }
    return chunks.map((c, i) => ({ c, score: score[i], v: vs ? vs[i] : null, k: ks ? ks[i] : null })).sort((a, b) => b.score - a.score);
  };

  /* HNSW: a real (small) hierarchical navigable small-world index */
  R.hnsw = function (vecs, M, efC, seed) {
    M = M || 5; efC = efC || 20;
    const rand = MM.rng(seed || 3), mL = 1 / Math.log(M), nodes = [];
    let entry = -1, maxL = -1, comps = 0;
    const sim = (q, i) => { comps++; return R.dot(q, vecs[i]); };
    function searchLayer(q, eps, ef, l) {
      const seen = new Set(eps), cand = eps.map((i) => ({ id: i, s: sim(q, i) })), best = cand.slice();
      while (cand.length) {
        cand.sort((a, b) => b.s - a.s);
        const c = cand.shift();
        best.sort((a, b) => b.s - a.s);
        if (best.length >= ef && c.s < best[best.length - 1].s) break;
        (nodes[c.id].nbr[l] || []).forEach((n) => { if (seen.has(n)) return; seen.add(n); const s = sim(q, n); if (best.length < ef || s > best[best.length - 1].s) { cand.push({ id: n, s }); best.push({ id: n, s }); best.sort((a, b) => b.s - a.s); if (best.length > ef) best.pop(); } });
      }
      return best.sort((a, b) => b.s - a.s);
    }
    vecs.forEach((v, i) => {
      const lvl = Math.min(3, Math.floor(-Math.log(Math.max(rand(), 1e-9)) * mL));
      nodes.push({ lvl, nbr: Array.from({ length: lvl + 1 }, () => []) });
      if (entry < 0) { entry = i; maxL = lvl; return; }
      let ep = entry;
      for (let l = maxL; l > lvl; l--) ep = searchLayer(v, [ep], 1, l)[0].id;
      for (let l = Math.min(lvl, maxL); l >= 0; l--) {
        const cand = searchLayer(v, [ep], efC, l), sel = cand.filter((c) => c.id !== i).slice(0, M);
        nodes[i].nbr[l] = sel.map((c) => c.id);
        sel.forEach((c) => { const nb = nodes[c.id].nbr[l]; nb.push(i); if (nb.length > 2 * M) { nodes[c.id].nbr[l] = nb.map((n) => ({ n, s: R.dot(vecs[c.id], vecs[n]) })).sort((a, b) => b.s - a.s).slice(0, 2 * M).map((x) => x.n); } });
        ep = cand[0].id;
      }
      if (lvl > maxL) { maxL = lvl; entry = i; }
    });
    return {
      nodes, maxL, entry,
      search(q, ef, k) {
        comps = 0;
        const path = [];
        let ep = entry;
        for (let l = maxL; l > 0; l--) {
          let cur = ep, curS = sim(q, cur), moved = true;
          path.push({ l, id: cur });
          while (moved) { moved = false; for (const n of nodes[cur].nbr[l] || []) { const s = sim(q, n); if (s > curS) { cur = n; curS = s; moved = true; } } if (moved) path.push({ l, id: cur }); }
          ep = cur;
        }
        const res = searchLayer(q, [ep], ef || 16, 0).slice(0, k || 5);
        path.push({ l: 0, id: res[0].id });
        return { res, path, comps };
      } };
  };

  /* 2-D layout for pictures: the two directions with the most spread (power iteration) */
  R.pca2 = function (vecs) {
    const n = vecs.length, D = vecs[0].length, mean = new Float32Array(D);
    vecs.forEach((v) => v.forEach((x, j) => (mean[j] += x / n)));
    const X = vecs.map((v) => v.map((x, j) => x - mean[j]));
    const comps = [];
    for (let c = 0; c < 2; c++) {
      let w = Array.from({ length: D }, (_, j) => Math.sin(j * 1.7 + c));
      for (let it = 0; it < 60; it++) {
        const nw = new Float32Array(D);
        X.forEach((x) => { let p = 0; for (let j = 0; j < D; j++) p += x[j] * w[j]; for (let j = 0; j < D; j++) nw[j] += p * x[j]; });
        comps.forEach((u) => { let p = 0; for (let j = 0; j < D; j++) p += nw[j] * u[j]; for (let j = 0; j < D; j++) nw[j] -= p * u[j]; });
        let s = 0; for (const x of nw) s += x * x; s = Math.sqrt(s) || 1; w = Array.from(nw, (x) => x / s);
      }
      comps.push(w);
    }
    return X.map((x) => comps.map((u) => { let p = 0; for (let j = 0; j < D; j++) p += x[j] * u[j]; return p; }));
  };
})();
