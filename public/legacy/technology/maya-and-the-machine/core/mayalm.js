/* Maya-LM runtime: the real tiny transformer, running in the browser.
   Same maths as the Python training code: learned positions, pre-norm RMSNorm,
   4 heads × 4 layers, GELU MLP, tied embeddings. */
(function () {
  const MM = (window.MM = window.MM || {});

  function f16(b64) {
    const bin = atob(b64);
    const n = bin.length >> 1;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const h = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8);
      const s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
      out[i] = e === 0 ? s * 6.103515625e-5 * (f / 1024) : e === 31 ? (f ? NaN : s * Infinity) : s * Math.pow(2, e - 15) * (1 + f / 1024);
    }
    return out;
  }

  function Model(data) {
    this.cfg = data.config;
    this.vocab = data.vocab;
    this.stoi = Object.create(null);
    data.vocab.forEach((w, i) => (this.stoi[w] = i));
    const all = f16(data.weights_f16);
    this.w = {};
    let off = 0;
    for (const [name, shape] of data.manifest) {
      const n = shape.reduce((a, b) => a * b, 1);
      this.w[name] = { a: all.subarray(off, off + n), shape };
      off += n;
    }
  }

  const P = Model.prototype;
  P.encode = function (text) {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const ids = [0], unknown = [];
    words.forEach((w) => {
      const id = this.stoi[w];
      if (id === undefined) { unknown.push(w); ids.push(1); } else ids.push(id);
    });
    return { ids, unknown, words };
  };
  P.has = function (w) { return this.stoi[w] !== undefined; };

  function rms(x, g, d) {
    let s = 0;
    for (let i = 0; i < d; i++) s += x[i] * x[i];
    const r = 1 / Math.sqrt(s / d + 1e-5);
    const o = new Float32Array(d);
    for (let i = 0; i < d; i++) o[i] = x[i] * r * g[i];
    return o;
  }
  function matvec(x, W, rows, cols, bias) {
    // x (rows) · W (rows × cols) → (cols)
    const o = new Float32Array(cols);
    if (bias) o.set(bias);
    for (let i = 0; i < rows; i++) {
      const xi = x[i];
      if (xi === 0) continue;
      const base = i * cols;
      for (let j = 0; j < cols; j++) o[j] += xi * W[base + j];
    }
    return o;
  }
  const C0 = Math.sqrt(2 / Math.PI);
  const gelu = (z) => 0.5 * z * (1 + Math.tanh(C0 * (z + 0.044715 * z * z * z)));

  /* Run the model over a token sequence.
     opts: zeroPos, noMask, noScale, ablate (Set of "layer.head"), want: {attn, streams, qkv, mlp}
     returns logits for every position, plus whatever was asked for. */
  P.run = function (ids, opts) {
    opts = opts || {};
    const { d, H, L, mlp } = this.cfg;
    const dh = d / H, T = ids.length, w = this.w;
    const tok = w.tok.a, pos = w.pos.a;
    let x = [];
    for (let t = 0; t < T; t++) {
      const v = new Float32Array(d);
      for (let i = 0; i < d; i++) v[i] = tok[ids[t] * d + i] + (opts.zeroPos ? 0 : pos[t * d + i]);
      x.push(v);
    }
    const out = { attn: [], streams: [x.map((v) => v.slice())], qkv: [], mlpAct: [], headOut: [] };
    const scale = opts.noScale ? 1 : 1 / Math.sqrt(dh);
    for (let l = 0; l < L; l++) {
      const W = (k) => w[`l${l}.${k}`].a;
      const h = x.map((v) => rms(v, W("g1"), d));
      const q = h.map((v) => matvec(v, W("wq"), d, d));
      const k = h.map((v) => matvec(v, W("wk"), d, d));
      const vv = h.map((v) => matvec(v, W("wv"), d, d));
      if (opts.want && opts.want.qkv) out.qkv.push({ q, k, v: vv });
      const layerAtt = [];
      const mixed = x.map(() => new Float32Array(d));
      for (let hd = 0; hd < H; hd++) {
        const A = [];
        const off = hd * dh;
        for (let t = 0; t < T; t++) {
          const sc = new Float32Array(T);
          let mx = -Infinity;
          for (let s = 0; s < T; s++) {
            if (!opts.noMask && s > t) { sc[s] = -Infinity; continue; }
            let dot = 0;
            for (let i = 0; i < dh; i++) dot += q[t][off + i] * k[s][off + i];
            sc[s] = dot * scale;
            if (sc[s] > mx) mx = sc[s];
          }
          let sum = 0;
          for (let s = 0; s < T; s++) { sc[s] = sc[s] === -Infinity ? 0 : Math.exp(sc[s] - mx); sum += sc[s]; }
          for (let s = 0; s < T; s++) sc[s] /= sum;
          A.push(sc);
          if (opts.ablate && opts.ablate.has(l + "." + hd)) continue;
          for (let s = 0; s < T; s++) {
            const a = sc[s];
            if (!a) continue;
            for (let i = 0; i < dh; i++) mixed[t][off + i] += a * vv[s][off + i];
          }
        }
        layerAtt.push(A);
      }
      out.attn.push(layerAtt);
      for (let t = 0; t < T; t++) {
        const o = matvec(mixed[t], W("wo"), d, d);
        for (let i = 0; i < d; i++) x[t][i] += o[i];
      }
      out.streams.push(x.map((v) => v.slice()));
      for (let t = 0; t < T; t++) {
        const h2 = rms(x[t], W("g2"), d);
        const z = matvec(h2, W("w1"), d, mlp, W("b1"));
        for (let i = 0; i < mlp; i++) z[i] = gelu(z[i]);
        if (opts.want && opts.want.mlp && t === T - 1) out.mlpAct.push(z.slice());
        const m = matvec(z, W("w2"), mlp, d, W("b2"));
        for (let i = 0; i < d; i++) x[t][i] += m[i];
      }
      out.streams.push(x.map((v) => v.slice()));
    }
    out.logits = x.map((v) => this.unembed(v));
    return out;
  };


  /* KV cache: process one new token, reusing saved keys and values of earlier tokens (M9). */
  P.cacheStart = function () { return { len: 0, K: Array.from({ length: this.cfg.L }, () => []), V: Array.from({ length: this.cfg.L }, () => []) }; };
  P.stepCached = function (cache, id) {
    const { d, H, L, mlp } = this.cfg, dh = d / H, w = this.w, t = cache.len;
    if (t >= this.cfg.ctx) throw new Error("Maya-LM only has " + this.cfg.ctx + " positions");
    const x = new Float32Array(d);
    for (let i = 0; i < d; i++) x[i] = w.tok.a[id * d + i] + w.pos.a[t * d + i];
    const scale = 1 / Math.sqrt(dh);
    for (let l = 0; l < L; l++) {
      const W = (k) => w[`l${l}.${k}`].a;
      const h1 = rms(x, W("g1"), d);
      const q = matvec(h1, W("wq"), d, d), kk = matvec(h1, W("wk"), d, d), vv = matvec(h1, W("wv"), d, d);
      cache.K[l].push(kk); cache.V[l].push(vv);
      const mixed = new Float32Array(d);
      for (let hd = 0; hd < H; hd++) {
        const off = hd * dh, sc = new Float32Array(t + 1);
        let mx = -Infinity;
        for (let s = 0; s <= t; s++) { let dot = 0; const ks = cache.K[l][s]; for (let i = 0; i < dh; i++) dot += q[off + i] * ks[off + i]; sc[s] = dot * scale; if (sc[s] > mx) mx = sc[s]; }
        let sum = 0;
        for (let s = 0; s <= t; s++) { sc[s] = Math.exp(sc[s] - mx); sum += sc[s]; }
        for (let s = 0; s <= t; s++) { const a = sc[s] / sum, vs = cache.V[l][s]; for (let i = 0; i < dh; i++) mixed[off + i] += a * vs[off + i]; }
      }
      const o = matvec(mixed, W("wo"), d, d);
      for (let i = 0; i < d; i++) x[i] += o[i];
      const h2 = rms(x, W("g2"), d);
      const z = matvec(h2, W("w1"), d, mlp, W("b1"));
      for (let i = 0; i < mlp; i++) z[i] = gelu(z[i]);
      const m = matvec(z, W("w2"), mlp, d, W("b2"));
      for (let i = 0; i < d; i++) x[i] += m[i];
    }
    cache.len++;
    return this.unembed(x);
  };

  P.unembed = function (v) {
    const { d } = this.cfg, Vn = this.vocab.length, tok = this.w.tok.a;
    const f = rms(v, this.w.gf.a, d);
    const lg = new Float32Array(Vn);
    for (let j = 0; j < Vn; j++) {
      let s = 0;
      for (let i = 0; i < d; i++) s += f[i] * tok[j * d + i];
      lg[j] = s;
    }
    return lg;
  };

  P.softmax = function (lg, temp) {
    const t = temp === undefined ? 1 : Math.max(temp, 1e-6);
    let mx = -Infinity;
    for (const z of lg) if (z > mx) mx = z;
    const p = new Float64Array(lg.length);
    let s = 0;
    for (let i = 0; i < lg.length; i++) { p[i] = Math.exp((lg[i] - mx) / t); s += p[i]; }
    for (let i = 0; i < p.length; i++) p[i] /= s;
    return p;
  };

  P.top = function (probs, k, logits) {
    const idx = Array.from(probs.keys()).sort((a, b) => probs[b] - probs[a]).slice(0, k || 8);
    return idx.map((i) => ({ id: i, word: this.vocab[i], p: probs[i], logit: logits ? logits[i] : undefined }));
  };

  /* Next-token distribution after a text. */
  P.next = function (text, opts) {
    const e = this.encode(text);
    const r = this.run(e.ids.slice(-this.cfg.ctx), opts);
    const lg = r.logits[r.logits.length - 1];
    return { logits: lg, probs: this.softmax(lg, opts && opts.temperature), run: r, enc: e };
  };

  /* Logit lens: decode the residual stream at one position after every half-layer. */
  P.lens = function (text, position, k) {
    const e = this.encode(text);
    const r = this.run(e.ids);
    const t = position === undefined ? e.ids.length - 1 : position;
    return r.streams.map((s, i) => {
      const lg = this.unembed(s[t]);
      return { stage: i === 0 ? "embedding" : `layer ${Math.ceil(i / 2)} ${i % 2 ? "after attention" : "after MLP"}`, top: this.top(this.softmax(lg), k || 5) };
    });
  };

  /* the normalised final vector that the unembedding compares with every token (M10's nudge demo) */
  P.finalVec = function (text) { const e = this.encode(text); const r = this.run(e.ids); const x = r.streams[r.streams.length - 1][e.ids.length - 1]; return rms(x, this.w.gf.a, this.cfg.d); };

  P.embedding = function (word) {
    const id = this.stoi[word], d = this.cfg.d;
    return id === undefined ? null : this.w.tok.a.slice(id * d, id * d + d);
  };

  P.neighbours = function (word, k) {
    const v = this.embedding(word);
    if (!v) return [];
    const d = this.cfg.d, tok = this.w.tok.a, n = this.vocab.length;
    const norm = (a, off) => { let s = 0; for (let i = 0; i < d; i++) s += a[off + i] * a[off + i]; return Math.sqrt(s); };
    const nv = norm(v, 0);
    const out = [];
    for (let j = 2; j < n; j++) {
      let s = 0;
      for (let i = 0; i < d; i++) s += v[i] * tok[j * d + i];
      out.push({ word: this.vocab[j], cos: s / (nv * norm(tok, j * d)) });
    }
    return out.filter((o) => o.word !== word).sort((a, b) => b.cos - a.cos).slice(0, k || 8);
  };

  /* Seeded random numbers, so sampling demos can be replayed exactly. */
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  MM.rng = rng;

  /* Shape a distribution with temperature, top-k, top-p and min-p, exactly as samplers do. */
  P.shape = function (logits, s) {
    s = s || {};
    const probs = this.softmax(logits, s.temperature === undefined ? 1 : s.temperature);
    const order = Array.from(probs.keys()).sort((a, b) => probs[b] - probs[a]);
    const keep = new Set();
    let cum = 0;
    const top = probs[order[0]];
    for (let r = 0; r < order.length; r++) {
      const i = order[r];
      if (s.topK && r >= s.topK) break;
      if (s.minP && probs[i] < s.minP * top) break;
      keep.add(i);
      cum += probs[i];
      if (s.topP && cum >= s.topP) break;
    }
    let z = 0;
    for (const i of keep) z += probs[i];
    const shaped = new Float64Array(probs.length);
    for (const i of keep) shaped[i] = probs[i] / z;
    return { probs: shaped, raw: probs, kept: keep, order };
  };

  P.sampleFrom = function (probs, rand) {
    let r = rand(), c = 0;
    for (let i = 0; i < probs.length; i++) { c += probs[i]; if (r < c) return i; }
    let best = 0;
    for (let i = 1; i < probs.length; i++) if (probs[i] > probs[best]) best = i;
    return best;
  };

  /* Generate text one token at a time (the generation loop of M9). */
  P.generate = function (prompt, n, s) {
    s = s || {};
    const e = this.encode(prompt);
    let ids = e.ids.slice();
    const rand = rng(s.seed === undefined ? 7 : s.seed);
    const steps = [];
    for (let i = 0; i < n; i++) {
      const ctx = ids.slice(-this.cfg.ctx);
      const r = this.run(ctx);
      let lg = r.logits[r.logits.length - 1];
      if (s.repPenalty && s.repPenalty !== 1) {
        lg = lg.slice();
        const seen = new Set(ctx.slice(1));
        seen.forEach((j) => { lg[j] = lg[j] > 0 ? lg[j] / s.repPenalty : lg[j] * s.repPenalty; });
      }
      let next;
      if (s.greedy || s.temperature === 0) {
        next = 0; for (let j = 1; j < lg.length; j++) if (lg[j] > lg[next]) next = j;
      } else {
        next = this.sampleFrom(this.shape(lg, s).probs, rand);
      }
      ids.push(next);
      steps.push({ id: next, word: this.vocab[next], p: this.softmax(lg)[next] });
      if (s.stopAtPeriod && this.vocab[next] === ".") break;
    }
    return { text: steps.map((x) => x.word).join(" "), steps, ids };
  };

  MM.MayaLM = Model;
  MM.loadMayaLM = function () {
    if (MM._lm) return Promise.resolve(MM._lm);
    return MM.load("data/maya_lm.js").then(() => (MM._lm = new Model(window.MM_DATA.mayalm)));
  };
})();
