/* The maths kernel: real computations behind the labs, plus the Toolkit mini-labs. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s;
  const k = (MM.k = {});

  k.dot = (a, b) => a.reduce((t, x, i) => t + x * b[i], 0);
  k.norm = (a) => Math.sqrt(k.dot(a, a));
  k.cos = (a, b) => k.dot(a, b) / (k.norm(a) * k.norm(b) || 1);
  k.softmax = (z, T) => { const t = T === undefined ? 1 : Math.max(T, 1e-6); const m = Math.max(...z); const e = z.map((x) => Math.exp((x - m) / t)); const S = e.reduce((a, b) => a + b, 0); return e.map((x) => x / S); };
  k.bits = (p) => -Math.log2(p);
  k.entropy = (ps) => ps.reduce((t, p) => t + (p > 0 ? -p * Math.log2(p) : 0), 0);
  k.gauss = (rand) => { let u = 0, v = 0; while (!u) u = rand(); while (!v) v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  /* ---------------- counting (n-gram) model */
  k.words = (text) => text.toLowerCase().replace(/([.,!?])/g, " $1 ").split(/\s+/).filter(Boolean);
  k.ngram = function (text, n) {
    const w = ["<s>"].concat(k.words(text));
    const table = new Map();
    for (let i = n - 1; i < w.length; i++) {
      const ctx = w.slice(i - n + 1, i).join(" ");
      if (!table.has(ctx)) table.set(ctx, new Map());
      const row = table.get(ctx);
      row.set(w[i], (row.get(w[i]) || 0) + 1);
    }
    return { n, table, words: w };
  };
  k.ngramNext = function (model, history) {
    const ctx = history.slice(-(model.n - 1)).join(" ");
    const row = model.n === 1 ? model.table.get("") : model.table.get(ctx);
    if (!row) return { ctx, total: 0, items: [] };
    const total = [...row.values()].reduce((a, b) => a + b, 0);
    return { ctx, total, items: [...row.entries()].map(([w, c]) => ({ word: w, count: c, p: c / total })).sort((a, b) => b.count - a.count) };
  };
  k.ngramGenerate = function (model, start, n, rand) {
    const out = start.slice();
    for (let i = 0; i < n; i++) {
      const nx = k.ngramNext(model, out);
      if (!nx.items.length) { out.push("∅"); break; }
      let r = rand(), c = 0, pick = nx.items[0].word;
      for (const it of nx.items) { c += it.p; if (r < c) { pick = it.word; break; } }
      out.push(pick);
    }
    return out;
  };

  /* ---------------- byte-pair encoding, trained live */
  k.bpeTrain = function (text, merges) {
    let words = text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean).map((w) => ["·"].concat(w.split("")));
    const history = [];
    for (let m = 0; m < merges; m++) {
      const counts = new Map();
      words.forEach((w) => { for (let i = 0; i < w.length - 1; i++) { const key = w[i] + "\u0001" + w[i + 1]; counts.set(key, (counts.get(key) || 0) + 1); } });
      let best = null, bc = 0;
      counts.forEach((c, key) => { if (c > bc) { bc = c; best = key; } });
      if (!best || bc < 2) break;
      const [a, b] = best.split("\u0001");
      history.push({ a, b, merged: a + b, count: bc });
      words = words.map((w) => { const o = []; for (let i = 0; i < w.length; i++) { if (i < w.length - 1 && w[i] === a && w[i + 1] === b) { o.push(a + b); i++; } else o.push(w[i]); } return o; });
    }
    return history;
  };
  k.bpeEncode = function (text, history, upto) {
    const H = history.slice(0, upto === undefined ? history.length : upto);
    return text.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean).map((wd) => {
      let w = ["·"].concat(wd.split(""));
      H.forEach(({ a, b }) => { const o = []; for (let i = 0; i < w.length; i++) { if (i < w.length - 1 && w[i] === a && w[i + 1] === b) { o.push(a + b); i++; } else o.push(w[i]); } w = o; });
      return w;
    });
  };

  /* ---------------- a tiny neural network: 2 inputs → hidden → 1 output, trained by backprop */
  k.Net = function (hidden, rand, act) {
    this.H = hidden; this.act = act || "tanh";
    const g = () => k.gauss(rand) * 0.8;
    this.W1 = Array.from({ length: hidden }, () => [g(), g()]);
    this.b1 = Array.from({ length: hidden }, () => g() * 0.3);
    this.W2 = Array.from({ length: hidden }, () => g() * 0.6);
    this.b2 = 0;
  };
  const sig = (z) => 1 / (1 + Math.exp(-z));
  k.Net.prototype.f = function (z) { return this.act === "none" ? z : this.act === "relu" ? Math.max(0, z) : Math.tanh(z); };
  k.Net.prototype.df = function (z, a) { return this.act === "none" ? 1 : this.act === "relu" ? (z > 0 ? 1 : 0) : 1 - a * a; };
  k.Net.prototype.forward = function (x) {
    const z1 = this.W1.map((w, i) => w[0] * x[0] + w[1] * x[1] + this.b1[i]);
    const a1 = z1.map((z) => this.f(z));
    const z2 = a1.reduce((t, a, i) => t + a * this.W2[i], this.b2);
    return { z1, a1, p: sig(z2) };
  };
  k.Net.prototype.loss = function (data) {
    let L = 0;
    data.forEach(([x, y]) => { const p = Math.min(1 - 1e-7, Math.max(1e-7, this.forward(x).p)); L += -(y * Math.log(p) + (1 - y) * Math.log(1 - p)); });
    return L / data.length;
  };
  k.Net.prototype.step = function (data, lr) {
    const gW1 = this.W1.map(() => [0, 0]), gb1 = this.b1.map(() => 0), gW2 = this.W2.map(() => 0);
    let gb2 = 0;
    data.forEach(([x, y]) => {
      const { z1, a1, p } = this.forward(x);
      const d2 = p - y;
      gb2 += d2;
      for (let i = 0; i < this.H; i++) {
        gW2[i] += d2 * a1[i];
        const d1 = d2 * this.W2[i] * this.df(z1[i], a1[i]);
        gW1[i][0] += d1 * x[0]; gW1[i][1] += d1 * x[1]; gb1[i] += d1;
      }
    });
    const n = data.length;
    for (let i = 0; i < this.H; i++) { this.W1[i][0] -= lr * gW1[i][0] / n; this.W1[i][1] -= lr * gW1[i][1] / n; this.b1[i] -= lr * gb1[i] / n; this.W2[i] -= lr * gW2[i] / n; }
    this.b2 -= lr * gb2 / n;
    return this.loss(data);
  };

  /* ---------------- a tiny line chart in SVG, drawn to scale */
  k.chart = function (series, o) {
    o = o || {};
    const W = o.W || 520, H = o.H || 220, P = { l: 46, r: 14, t: 14, b: 32 };
    const xs = series.flatMap((sr) => sr.pts.map((p) => p[0])), ys = series.flatMap((sr) => sr.pts.map((p) => p[1])).filter((v) => v != null && isFinite(v));
    const x0 = o.xmin !== undefined ? o.xmin : Math.min(...xs), x1 = o.xmax !== undefined ? o.xmax : Math.max(...xs);
    const y0 = o.ymin !== undefined ? o.ymin : Math.min(0, ...ys), y1 = o.ymax !== undefined ? o.ymax : Math.max(...ys) * 1.05;
    const lx = (v) => o.logx ? Math.log10(v) : v, ly = (v) => o.logy ? Math.log10(v) : v;
    const X = (v) => P.l + (lx(v) - lx(x0)) / (lx(x1) - lx(x0) || 1) * (W - P.l - P.r);
    const Y = (v) => H - P.b - (ly(v) - ly(y0)) / (ly(y1) - ly(y0) || 1) * (H - P.t - P.b);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "figure", style: `max-width:${o.maxW || Math.round(W * 1.25)}px`, role: "img", "aria-label": o.label || "chart" });
    const ticks = (a, b, n, log) => { if (log) { const out = []; for (let e = Math.ceil(Math.log10(a)); e <= Math.floor(Math.log10(b)); e++) out.push(Math.pow(10, e)); return out; } const st = niceStep((b - a) / n); const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(10)); return out; };
    ticks(y0, y1, 4, o.logy).forEach((v) => { svg.append(s("line", { x1: P.l, x2: W - P.r, y1: Y(v), y2: Y(v), stroke: "var(--rule-2)" }), s("text", { x: P.l - 6, y: Y(v) + 4, "text-anchor": "end", "font-size": 11, class: "t-mono", fill: "var(--ink-3)", text: o.yfmt ? o.yfmt(v) : fmtNum(v) })); });
    ticks(x0, x1, 5, o.logx).forEach((v) => svg.append(s("text", { x: X(v), y: H - P.b + 16, "text-anchor": "middle", "font-size": 11, class: "t-mono", fill: "var(--ink-3)", text: o.xfmt ? o.xfmt(v) : fmtNum(v) })));
    svg.append(s("line", { x1: P.l, x2: W - P.r, y1: H - P.b, y2: H - P.b, stroke: "var(--ink-3)" }));
    if (o.xlabel) svg.append(s("text", { x: W - P.r, y: H - 4, "text-anchor": "end", "font-size": 11, fill: "var(--ink-2)", text: o.xlabel }));
    if (o.ylabel) svg.append(s("text", { x: P.l + 4, y: P.t + 2, "font-size": 11, fill: "var(--ink-2)", text: o.ylabel }));
    series.forEach((sr) => {
      let d = "", pen = false;
      sr.pts.forEach(([x, y]) => { if (y == null || !isFinite(y)) { pen = false; return; } const yy = Math.max(P.t - 6, Math.min(H - P.b, Y(Math.min(y, y1 * 1.2)))); d += (pen ? "L" : "M") + X(x).toFixed(1) + " " + yy.toFixed(1); pen = true; });
      svg.append(s("path", { d, fill: "none", stroke: sr.color || "var(--seine)", "stroke-width": sr.width || 2.2, "stroke-dasharray": sr.dash || null, "stroke-linejoin": "round" }));
      if (sr.label) { const last = sr.pts.filter((p) => p[1] != null && isFinite(p[1])).slice(-1)[0]; if (last) svg.append(s("text", { x: Math.min(X(last[0]) - 4, W - P.r - 2), y: Y(Math.min(last[1], y1)) - 6, "text-anchor": "end", "font-size": 11.5, class: "t-disp", fill: sr.color || "var(--seine)", style: "paint-order:stroke;stroke:var(--sheet);stroke-width:4px", text: sr.label })); }
      (sr.dots || []).forEach(([x, y]) => svg.append(s("circle", { cx: X(x), cy: Y(y), r: 4, fill: sr.color || "var(--seine)" })));
    });
    (o.marks || []).forEach((m) => svg.append(s("line", { x1: X(m.x), x2: X(m.x), y1: P.t, y2: H - P.b, stroke: m.color || "var(--line1)", "stroke-dasharray": "4 3" }), s("text", { x: X(m.x) + 4, y: P.t + 10, "font-size": 11, fill: "var(--ink-2)", text: m.label })));
    svg.X = X; svg.Y = Y;
    return svg;
  };
  function niceStep(r) { const p = Math.pow(10, Math.floor(Math.log10(r || 1))); const f = r / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; }
  function fmtNum(v) { const a = Math.abs(v); if (a >= 1e9) return (v / 1e9).toFixed(0) + "B"; if (a >= 1e6) return (v / 1e6).toFixed(0) + "M"; if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "k"; if (a > 0 && a < 0.01) return v.toExponential(0); return String(+v.toFixed(2)); }
  k.fmt = fmtNum;
  k.big = (n) => { const a = Math.abs(n); return a >= 1e12 ? (n / 1e12).toFixed(2) + " trillion" : a >= 1e9 ? (n / 1e9).toFixed(2) + " billion" : a >= 1e6 ? (n / 1e6).toFixed(1) + " million" : Math.round(n).toLocaleString("en-GB"); };

  /* ================================================================ Toolkit mini-labs */
  const L = (MM.toolLabs = {});
  const out = (txt) => h("div", { class: "mono", style: "font-size:.92rem;margin-top:8px", "aria-live": "polite" }, txt);

  L.t1 = function (el) {
    const a = [2, 1], b = [1, 2];
    const svg = s("svg", { viewBox: "-110 -110 220 220", style: "max-width:240px", class: "figure", role: "img", "aria-label": "Two vectors and their dot product" });
    const o = out("");
    const meter = h("div", { class: "bar" }, h("span", { class: "lbl" }, "match"), h("span", { class: "track" }, h("span", { class: "fill" })), h("span", { class: "v" }));
    function draw() {
      svg.innerHTML = "";
      svg.append(s("line", { x1: -100, x2: 100, y1: 0, y2: 0, stroke: "var(--rule)" }), s("line", { y1: -100, y2: 100, x1: 0, x2: 0, stroke: "var(--rule)" }));
      [[a, "var(--pos)", "a"], [b, "var(--neg)", "b"]].forEach(([v, c, n]) => svg.append(s("line", { x1: 0, y1: 0, x2: v[0] * 30, y2: -v[1] * 30, stroke: c, "stroke-width": 4, "stroke-linecap": "round" }), s("text", { x: v[0] * 33, y: -v[1] * 33, "font-size": 14, class: "t-disp", fill: c, text: n })));
      const d = k.dot(a, b), c = k.cos(a, b);
      o.textContent = `a·b = ${a[0]}×${b[0]} + ${a[1]}×${b[1]} = ${d}   ·   cosine = ${c.toFixed(2)}   ·   angle ≈ ${(Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI).toFixed(0)}°`;
      meter.querySelector(".fill").style.width = ((c + 1) / 2 * 100).toFixed(0) + "%";
      meter.querySelector(".v").textContent = c.toFixed(2);
    }
    const sl = (v, i, name) => MM.slider({ label: name, min: -3, max: 3, step: 1, value: v[i], onInput: (x) => { v[i] = x; draw(); } });
    el.append(h("div", { class: "two" }, svg, h("div", { class: "stack" }, sl(a, 0, "a x"), sl(a, 1, "a y"), sl(b, 0, "b x"), sl(b, 1, "b y"), meter)), o);
    draw();
  };
  L.t2 = function (el) {
    const M = [[1, 0], [1, 1]], v = [3, 4];
    const o = out("");
    const draw = () => { const r = [M[0][0] * v[0] + M[0][1] * v[1], M[1][0] * v[0] + M[1][1] * v[1]]; o.textContent = `row 1 · v = ${M[0][0]}×${v[0]} + ${M[0][1]}×${v[1]} = ${r[0]}\nrow 2 · v = ${M[1][0]}×${v[0]} + ${M[1][1]}×${v[1]} = ${r[1]}\nSo [${v}] becomes [${r}]. Each output number is one dot product.`; o.style.whiteSpace = "pre-wrap"; };
    const sl = (i, j) => MM.slider({ label: `row ${i + 1}, col ${j + 1}`, min: -2, max: 2, value: M[i][j], onInput: (x) => { M[i][j] = x; draw(); } });
    el.append(h("div", { class: "two" }, h("div", { class: "stack" }, sl(0, 0), sl(0, 1)), h("div", { class: "stack" }, sl(1, 0), sl(1, 1))), o);
    draw();
  };
  L.t3 = function (el) {
    const ps = [0.1, 0.3, 0.2];
    const o = out("");
    const draw = () => { const prod = ps.reduce((a, b) => a * b, 1); o.style.whiteSpace = "pre-wrap"; o.textContent = `P(it) × P(would | it) × P(rain | it would)\n= ${ps.join(" × ")} = ${prod.toPrecision(3)}\nlog₂: ${ps.map((p) => Math.log2(p).toFixed(2)).join(" + ")} = ${Math.log2(prod).toFixed(2)}`; };
    ["P(it)", "P(would | it)", "P(rain | it would)"].forEach((n, i) => el.append(MM.slider({ label: n, min: 0.01, max: 1, step: 0.01, value: ps[i], fmt: (x) => x.toFixed(2), onInput: (x) => { ps[i] = x; draw(); } })));
    el.append(o); draw();
  };
  L.t4 = function (el) {
    const z = [2, 1, 0], names = ["rain", "be", "snow"];
    const bars = h("div"), o = out("");
    const draw = () => { const p = k.softmax(z), e = z.map(Math.exp), S = e.reduce((a, b) => a + b, 0); bars.innerHTML = ""; bars.append(MM.bars(names.map((n, i) => ({ label: n, p: p[i] })), { scale: 1 })); o.style.whiteSpace = "pre-wrap"; o.textContent = `e^score: ${e.map((x) => x.toFixed(2)).join(", ")}   total ${S.toFixed(2)}\nsoftmax: ${p.map((x) => x.toFixed(3)).join(", ")}`; };
    names.forEach((n, i) => el.append(MM.slider({ label: "score " + n, min: -3, max: 5, step: 0.1, value: z[i], fmt: (x) => x.toFixed(1), onInput: (x) => { z[i] = x; draw(); } })));
    el.append(bars, o); draw();
  };
  L.t5 = function (el) {
    const o = out("");
    const f = (p) => { o.textContent = `chance ${p.toFixed(3)} → surprise −log₂(${p.toFixed(3)}) = ${k.bits(p).toFixed(2)} bits`; };
    el.append(MM.slider({ label: "chance", min: 0.001, max: 1, step: 0.001, value: 0.5, fmt: (x) => x.toFixed(3), onInput: f }), o); f(0.5);
  };
  L.t6 = function (el) {
    let a = 3, b = 2;
    const o = out("");
    const f = () => { o.textContent = `y = ${a}·x, z = ${b}·y → z moves ${a} × ${b} = ${a * b} for every 1 that x moves. Slopes multiply along a chain.`; };
    el.append(MM.slider({ label: "dy/dx", min: -3, max: 3, step: 0.5, value: a, onInput: (x) => { a = x; f(); } }), MM.slider({ label: "dz/dy", min: -3, max: 3, step: 0.5, value: b, onInput: (x) => { b = x; f(); } }), o); f();
  };
  L.t7 = function (el) {
    const o = h("div");
    const f = (n) => { o.innerHTML = ""; const rows = [["linear  n", n], ["quadratic  n²", n * n], ["power law  n^0.5", Math.sqrt(n)], ["exponential  2^(n/100)", Math.pow(2, n / 100)]]; const mx = Math.max(...rows.map((r) => r[1])); o.append(MM.bars(rows.map(([l, v]) => ({ label: l, p: v / mx })), { scale: 1, plain: true, total: false, fmt: (it) => k.fmt(rows.find((r) => r[0] === it.label)[1]) })); };
    el.append(MM.slider({ label: "tokens n", min: 100, max: 4000, step: 100, value: 1000, onInput: f }), o); f(1000);
  };
  L.t8 = function (el) {
    const o = h("div"), rand = MM.rng(5);
    const f = (d) => { const cs = []; for (let t = 0; t < 300; t++) { const a = Array.from({ length: d }, () => k.gauss(rand)), b = Array.from({ length: d }, () => k.gauss(rand)); cs.push(k.cos(a, b)); } const bins = Array(10).fill(0); cs.forEach((c) => bins[Math.min(9, Math.floor((c + 1) / 0.2))]++); o.innerHTML = ""; o.append(MM.bars(bins.map((n, i) => ({ label: (-1 + i * 0.2).toFixed(1) + "…" + (-0.8 + i * 0.2).toFixed(1), p: n / 300 })), { scale: Math.max(...bins) / 300, plain: true, total: false, fmt: (it) => Math.round(it.p * 300) + "" }), h("div", { class: "mono", style: "font-size:.9rem;margin-top:6px" }, `cosine of 300 random pairs in ${d} dimensions: most fall within ±${(2 / Math.sqrt(d)).toFixed(2)}`)); };
    el.append(MM.slider({ label: "dimensions", min: 2, max: 1000, step: 1, value: 3, onInput: f }), o); f(3);
  };
  L.t9 = function (el) {
    let state = "writer", n = 0;
    const o = out("");
    const btn = h("button", { class: "btn small" }, "Take one step");
    const f = () => { o.textContent = `Now at: ${state}   (revisions ${n})   What can happen next: ${state === "writer" ? "→ critic" : state === "critic" ? (n >= 3 ? "→ END (cap reached)" : "→ writer, or → END") : "nothing: finished"}`; };
    btn.onclick = () => { if (state === "writer") { state = "critic"; n++; } else if (state === "critic") state = n >= 2 ? "END" : "writer"; f(); };
    el.append(btn, h("button", { class: "btn small ghost", onclick: () => { state = "writer"; n = 0; f(); } }, "Reset"), o); f();
  };
  L.t10 = function (el) {
    let p = 0.95, n = 10, kk = 3;
    const o = out("");
    const f = () => { o.style.whiteSpace = "pre-wrap"; o.textContent = `${n} steps at ${(p * 100).toFixed(0)}% each → all right ${(Math.pow(p, n) * 100).toFixed(1)}% of the time\nif one try succeeds with chance q = ${(Math.pow(p, n) * 100).toFixed(1)}%:\n  pass@${kk} (at least one of ${kk} works) = ${((1 - Math.pow(1 - Math.pow(p, n), kk)) * 100).toFixed(1)}%\n  pass^${kk} (all ${kk} work) = ${(Math.pow(Math.pow(p, n), kk) * 100).toFixed(1)}%`; };
    el.append(MM.slider({ label: "step success", min: 0.5, max: 1, step: 0.01, value: p, fmt: (x) => (x * 100).toFixed(0) + "%", onInput: (x) => { p = x; f(); } }), MM.slider({ label: "steps", min: 1, max: 30, value: n, onInput: (x) => { n = x; f(); } }), MM.slider({ label: "tries k", min: 1, max: 8, value: kk, onInput: (x) => { kk = x; f(); } }), o); f();
  };
  L.t11 = function (el) {
    let red = false;
    const o = out("");
    const f = () => { o.textContent = red ? "hotels: append reducer → [“Hotel Lumière”] + [“Hotel Soleil”] = both kept, in a fixed order." : "hotel: no reducer, two writes in one round → error: “Can receive only one value per step.” (the real LangGraph message)"; };
    el.append(MM.seg([{ label: "No reducer", value: false }, { label: "Append reducer", value: true }], red, (v) => { red = v; f(); }, "Merge rule"), o); f();
  };
})();
