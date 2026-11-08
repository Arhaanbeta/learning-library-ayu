/* F1 · Phase 1 Finale — the Grand Tour at full resolution, before and after, and the Defense. */
(function () {
  const MM = window.MM, h = MM.h, C = MM.course;
  const SPINE = "Maya packed her umbrella because the forecast for Paris said it would";
  const store = MM.store;
  const F = () => (store.state.extra.f1 = store.state.extra.f1 || { tour: {}, defense: {}, ladder: {} });
  const save = (fn, quiet) => store.update((st) => { st.extra.f1 = st.extra.f1 || { tour: {}, defense: {}, ladder: {} }; fn(st.extra.f1); }, quiet);
  const section = (n, title, ...kids) => h("section", { class: "section" }, h("header", null, h("span", { class: "n" }, n), h("h2", null, title)), ...kids);

  /* ------------------------------------------------------------------ the twelve stations */
  function stations(lm, extra) {
    const ids = lm.encode(SPINE).ids, last = ids.length - 1;
    const run = lm.run(ids);
    const probs = lm.softmax(run.logits[last]);
    const top = lm.top(probs, 5);
    const words = ["start"].concat(SPINE.split(" "));
    return [
      { t: "Text becomes tokens", truth: "REAL", v: (el) => el.append(h("div", { class: "toks" }, extra.toks.map((t, i) => MM.tok(t, { sub: extra.ids[i] })))),
        d: "GPT-4's tokeniser cuts Maya's sentence into 13 tokens from a vocabulary of about 100,000, using merges learned by BPE. “Maya” becomes “May” + “a”. From here on the model sees only the ID numbers.",
        points: ["The tokeniser cuts text into tokens from a fixed vocabulary, learned by BPE", "Each token has an ID number; inside there is no text, only numbers ({law:l2})", "Tokens are not words: “Maya” is “May” + “a”"] },
      { t: "IDs become vectors", truth: "TOY", v: (el) => { const nb = lm.neighbours("umbrella", 5); el.append(h("div", { class: "eyebrow" }, "Maya-LM's vector for “umbrella”: 64 numbers"), MM.vec(Array.from(lm.embedding("umbrella")), { wide: true }), h("div", { class: "eyebrow", style: "margin-top:10px" }, "its nearest neighbours by cosine"), h("div", { class: "toks" }, nb.map((o) => MM.tok(o.word, { sub: o.cos.toFixed(2) })))); },
        d: "Each ID selects one row of the embedding table. Training placed tokens used in similar ways close together, so “umbrella” sits near other things people carry for the weather. A learned position vector is added, so word order is known.",
        points: ["Each ID selects a learned vector (64 numbers here, thousands in big models)", "Similar use → nearby vectors; closeness is measured with the dot product (cosine)", "A position vector is added so the model knows word order"] },
      { t: "Attention: tokens share information", truth: "TOY", v: (el) => { const a = run.attn[2][1][last]; el.append(h("div", { class: "eyebrow" }, "where “would” looks, in layer 3, head 2"), MM.bars(words.map((w, i) => ({ label: w, p: a[i] })).filter((x) => x.p > 0.004).sort((x, y) => y.p - x.p).slice(0, 5), { total: false })); },
        d: "Each token makes a query; every earlier token offers a key. Scaled dot products and a softmax turn the matches into weights, and the values are mixed by those weights. Here “would” pulls almost everything from “umbrella”. The weights are computed fresh for this sentence, from learned matrices.",
        points: ["Query · key scores, divided by √d, then softmax, give attention weights", "Values are mixed by the weights: “would” pulls in “umbrella”", "Only earlier tokens are visible ({law:l5}); attention is the only step where tokens mix ({law:l6})"] },
      { t: "Blocks, the MLP and the residual stream", truth: "TOY", v: (el) => { const L = lm.lens(SPINE); el.append(h("div", { class: "eyebrow" }, "the top guess for the next token, read at each stage"), h("div", { class: "toks" }, L.map((st) => MM.tok(st.top[0].word, { sub: st.stage, color: st.top[0].word === "rain" ? "var(--real)" : null })))); },
        d: "A block is attention (tokens talk) followed by an MLP (each token thinks alone). Both add their results to the running vector, the residual stream, rather than replacing it. Reading the stream at each stage shows the guess taking shape up the layers.",
        points: ["Each block = attention + MLP, each adding to the residual stream ({law:l7})", "The MLP works on one token at a time and stores much of the knowledge", "The guess forms gradually as the layers add information"] },
      { t: "The size of the machine", truth: "TOY", v: (el) => el.append(h("table", { class: "tbl" }, h("tbody", null, [["embedding table", "214 × 64", 13696], ["positions", "32 × 64", 2048], ["4 blocks", "4 × 49,600", 198400], ["final norm", "64", 64], ["total", "", 214208]].map(([a, b, n]) => h("tr", null, h("td", null, a), h("td", { class: "mono" }, b), h("td", { class: "n" }, n.toLocaleString("en-GB"))))))),
        d: "Maya-LM has 214,208 numbers; the output layer reuses the embedding table (weight tying). Every one of them was set by training. Big models have billions, and each token costs about 2 operations per parameter, whatever the question.",
        points: ["All the numbers were set by training, none by hand ({law:l8})", "Most parameters live in the blocks; big models have billions", "Every token gets the same fixed effort: about 2 operations per parameter ({law:l9})"] },
      { t: "Scores become chances", truth: "TOY", v: (el) => el.append(MM.bars(top.map((x) => ({ label: x.word, p: x.p })), { rest: 1 - top.reduce((a, b) => a + b.p, 0) })),
        d: "At the top, the final vector for “would” is compared with every token's vector (the unembedding), giving one score, a logit, per token. Softmax turns the scores into chances that add up to 100%: rain 55%, be 18%, drizzle 13%, pour 10%.",
        points: ["Unembedding: the final vector is compared with every token's vector → logits", "Softmax turns logits into chances that add up to 100%", "The model outputs chances for every token, not a word ({law:l1})"] },
      { t: "The sampler picks", truth: "TOY", v: (el) => { const lg = run.logits[last], ri = lm.stoi.rain; el.append(MM.bars([0.5, 1, 1.5].map((T) => ({ label: "temperature " + T, p: lm.softmax(lg, T)[ri] })), { scale: 1, plain: true, total: false, labelW: "8.5rem", fmt: (it) => "rain " + MM.pct(it.p, 0) })); },
        d: "A separate, simple rule picks one token. Temperature divides the logits before softmax: below 1 the leader takes over, above 1 the chances flatten. Top-k and top-p cut off unlikely tokens. Same chances, different draws: that is why answers vary.",
        points: ["A separate sampler picks the token ({law:l11})", "Temperature reshapes the chances; greedy always takes the top one", "Different draws from the same chances explain different answers"] },
      { t: "The generation loop", truth: "TOY", v: (el) => { const g = lm.generate(SPINE, 6, { seed: 3, temperature: 1 }); el.append(h("div", { class: "toks" }, ["…said", " it", " would"].map((w) => MM.tok(w)), g.steps.map((st) => MM.tok(st.word, { sub: MM.pct(st.p, 0), color: "var(--llm)" })))); },
        d: "The chosen token is appended and the whole machine runs again, once per token. The KV cache keeps earlier keys and values so each new token costs only one position's work. Nothing outside the context window (32 tokens here) is visible, and nothing is remembered between calls.",
        points: ["Append the token and run the whole machine again, once per token", "The KV cache stores earlier keys and values: the context in ready form, not a new memory", "Only the weights and the context window exist ({law:l3})"] },
      { t: "Where the numbers came from", truth: "TOY", v: (el) => extra.training && el.append(MM.k.chart([{ pts: extra.training.curve.filter((_, i) => i % 4 === 0), color: "var(--seine)" }], { W: 380, H: 160, ymin: 0, xlabel: "training step", ylabel: "loss", label: "Maya-LM training loss" })),
        d: "Training repeated one step 4,000 times: predict the next token, measure the surprise (cross-entropy), and nudge every weight a little downhill with gradient descent. Maya-LM ended with a validation loss of 0.710. During use the weights are frozen.",
        points: ["Predict, measure the surprise, nudge every weight by gradient descent", "Repeated over huge amounts of text, this builds grammar, facts and skills", "During use, weights never change ({law:l4})"] },
      { t: "From base model to assistant", truth: "SKETCH", v: (el) => el.append(h("div", { class: "row", style: "--gap:6px" }, ["pretraining: continue documents", "SFT: example conversations", "preferences: RLHF or DPO", "RL on checkable tasks"].map((t, i) => h("span", { class: "pill" + (i === 0 ? "" : " ok") }, t)))),
        d: "A base model only continues documents. Supervised fine-tuning shows it example conversations; preference training (RLHF with a KL leash, or DPO) rewards answers people prefer; reinforcement learning on checkable tasks rewards correct maths and code. None of it rewards truth directly.",
        points: ["A base model continues text; post-training makes it follow instructions", "Preference training rewards liked answers, kept close to the original by a KL leash", "Training rewards likely or liked text, not true text ({law:l10})"] },
      { t: "Grounding", truth: "TOY", v: (el) => el.append(MM.bars([{ label: "word average", p: 7 / 12 }, { label: "Maya-Embed", p: 9 / 12 }, { label: "keywords", p: 10 / 12 }, { label: "hybrid", p: 11 / 12 }], { scale: 1, plain: true, total: false, fmt: (it) => Math.round(it.p * 12) + " of 12" })),
        d: "Without the fact, the model invents a plausible one (Maya-LM's “3 pm”). Retrieval finds passages outside the model, by meaning and keywords, and pastes them into the context. On Maya's documents, hybrid search found the right one first for 11 of 12 questions. Wrong or hostile passages still mislead.",
        points: ["Hallucination: plausible text without the fact", "RAG: chunk, embed, search, paste the best passages into the context ({law:l3})", "Retrieval can fetch the wrong or a hostile passage; the model trusts its context"] },
      { t: "Tools and the loop", truth: "REAL", v: (el) => el.append(h("div", { class: "mono", style: "font-size:.82rem;overflow-wrap:anywhere" }, "<|channel|>commentary to=functions.get_forecast <|constrain|>json<|message|>{\"city\":\"Paris\",\"day\":\"Saturday\"}<|call|>"), h("p", { class: "faint", style: "font-size:.85rem;margin-top:6px" }, "The real gpt-oss tool-call format. Maya's umbrella question: 2 model calls, 935 tokens read.")),
        d: "To check this week's forecast, the model writes a tool call as text and stops. The program runs the tool and appends the result; the model reads it and answers. In a loop, that is an agent. Every round re-reads the whole context, and the program decides when to stop.",
        points: ["The model writes a tool call; the program runs it and appends the result", "In a loop this is an agent; the stop rule and limits are the program's job", "Each round re-reads everything, so long runs get expensive"] }];
  }

  function tour(root, lm, extra) {
    const list = stations(lm, extra);
    let i = 0;
    const stage = h("div", { class: "lab", style: "min-height:200px" }), side = h("div");
    const pos = h("span", { class: "pos" }), back = h("button", { class: "btn" }, MM.icon("back"), "Back"), next = h("button", { class: "btn primary" }, "Next", MM.icon("next"));
    const prog = h("div", { class: "faint", style: "font-size:.88rem;margin-top:6px" });
    root.append(h("div", { class: "beat" }, stage, side), h("div", { class: "beatnav" }, pos, back, next), prog);
    back.onclick = () => show(i - 1);
    next.onclick = () => show(i + 1);
    const count = () => Object.values(F().tour).filter((x) => x && x.shown).length;
    function show(n) {
      i = MM.clamp(n, 0, list.length - 1);
      const st = list[i], rec = F().tour[i] || {};
      stage.innerHTML = ""; side.innerHTML = "";
      const box = h("div", { class: "fade-in" });
      stage.append(box);
      try { st.v(box); } catch (e) { box.append(MM.errorBox(e)); }
      const ta = h("textarea", { id: "f1-tour-" + i, placeholder: "Narrate this station in your own words: what happens here, and why is it needed?", "aria-label": "Your narration of station " + (i + 1), style: "min-height:90px" });
      ta.value = rec.text || "";
      ta.addEventListener("input", MM.debounce(() => save((f) => { f.tour[i] = Object.assign({}, f.tour[i], { text: ta.value }); }, true), 500));
      const key = h("div", { hidden: !rec.shown, style: "margin-top:10px" });
      const ticks = (rec.ticks || st.points.map(() => false)).slice();
      key.append(h("div", { class: "eyebrow", style: "margin-bottom:4px" }, "Key points: tick the ones you said"));
      st.points.forEach((p, j) => {
        const cb = h("input", { type: "checkbox", id: `f1-k-${i}-${j}`, checked: !!ticks[j] });
        cb.onchange = () => { ticks[j] = cb.checked; save((f) => { f.tour[i] = Object.assign({}, f.tour[i], { ticks }); }, true); };
        key.append(h("label", { for: cb.id, style: "display:grid;grid-template-columns:22px 1fr;gap:8px;padding:3px 0;cursor:pointer" }, cb, MM.richEl(p, "span")));
      });
      key.append(h("div", { class: "callout", style: "margin-top:8px" }, MM.richEl(st.d, "div")));
      const reveal = h("button", { class: "btn small primary", type: "button", hidden: !!rec.shown }, "Check against the key points");
      reveal.onclick = () => { key.hidden = false; reveal.hidden = true; save((f) => { f.tour[i] = Object.assign({}, f.tour[i], { text: ta.value, shown: Date.now(), ticks }); }); prog.textContent = `${count()} of ${list.length} stations narrated and checked.`; };
      side.append(h("div", { class: "kind" }, h("span", { class: "eyebrow" }, `Station ${i + 1} of ${list.length}`), MM.truth(st.truth)), h("h3", null, st.t), h("div", { style: "margin-top:8px" }, ta), h("div", { class: "row", style: "margin-top:8px" }, reveal), key);
      pos.textContent = `${i + 1} / ${list.length}`;
      back.disabled = i === 0; next.disabled = i === list.length - 1;
      prog.textContent = `${count()} of ${list.length} stations narrated and checked.`;
    }
    show(0);
  }

  /* ------------------------------------------------------------------ before and after */
  function beforeAfter(root, BLOCKS) {
    const start = store.state.pictures.start || null;
    let seq = (store.state.pictures.end || []).slice();
    const right = BLOCKS.filter((b) => b.right).map((b) => b.id);
    const byId = Object.fromEntries(BLOCKS.map((b) => [b.id, b]));
    const pool = h("div", { class: "stack", style: "--gap:6px" }), mine = h("ol", { class: "stack", style: "--gap:6px;padding-left:22px;margin:0" }), verdict = h("div", { "aria-live": "polite" });
    const shuffled = [3, 8, 0, 10, 5, 1, 7, 4, 9, 2, 6].map((k_) => BLOCKS[k_]);
    function draw() {
      pool.innerHTML = ""; mine.innerHTML = "";
      shuffled.filter((b) => !seq.includes(b.id)).forEach((b) => pool.append(h("button", { class: "opt", type: "button", onclick: () => { seq.push(b.id); draw(); } }, h("span", { class: "k" }, "+"), h("span", null, b.t))));
      seq.forEach((bid, j) => mine.append(h("li", null, h("div", { class: "row", style: "--gap:6px;flex-wrap:nowrap" }, h("span", { class: "grow" }, byId[bid].t), h("button", { class: "iconbtn", "aria-label": "Remove", onclick: () => { seq.splice(j, 1); draw(); } }, MM.icon("close"))))));
      if (!seq.length) mine.append(h("p", { class: "faint" }, "Empty. Tap the blocks in the order they happen."));
    }
    const judge = (list) => {
      const traps = list.filter((x) => !byId[x].right);
      const kept = list.filter((x) => byId[x].right);
      const order = kept.every((x, j) => j === 0 || right.indexOf(x) > right.indexOf(kept[j - 1]));
      return { traps, missing: right.filter((x) => !list.includes(x)), order };
    };
    const show = (list, title) => {
      const jd = judge(list);
      return h("div", { class: "card" }, h("div", { class: "eyebrow" }, title),
        list.length ? h("ol", { style: "margin:8px 0 0;padding-left:20px" }, list.map((x) => h("li", { style: byId[x].right ? null : "color:var(--bad);text-decoration:line-through" }, byId[x].t))) : h("p", { class: "faint", style: "margin-top:6px" }, "No picture saved."),
        list.length ? h("p", { class: "faint", style: "font-size:.88rem;margin-top:8px" }, `${jd.traps.length} trap${jd.traps.length === 1 ? "" : "s"} · ${jd.missing.length} step${jd.missing.length === 1 ? "" : "s"} missing · order ${jd.order ? "right" : "mixed up"}`) : null);
    };
    const btn = h("button", { class: "btn primary small", type: "button" }, "Save my picture now");
    btn.onclick = () => {
      if (seq.length < 3) { MM.toast("Add at least three blocks."); return; }
      store.update((st) => { st.pictures.end = seq.slice(); st.pictures.endAt = Date.now(); });
      verdict.innerHTML = "";
      const jd = judge(seq);
      verdict.append(h("div", { class: "two", style: "margin-top:12px" }, show(start || [], "Your picture at the start (M0)"), show(seq, "Your picture now")),
        h("div", { class: "callout" + (jd.traps.length || jd.missing.length || !jd.order ? " warn" : " ok"), style: "margin-top:10px" },
          jd.traps.length || jd.missing.length || !jd.order ? "Not quite yet. " + [jd.traps.length ? "Crossed-out blocks never happen inside an LLM." : "", jd.missing.length ? "A step is missing." : "", !jd.order ? "Check the order." : ""].join(" ") : "Every block real, none missing, in the right order. The traps are gone: no database, no grammar rules, no web search inside, no plan written first, no learning during the chat."));
    };
    root.append(h("div", { class: "two", style: "margin-top:10px" }, h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "Blocks"), pool), h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "My picture now, in order"), mine, h("div", { class: "row", style: "margin-top:10px" }, btn, h("button", { class: "btn small ghost", type: "button", onclick: () => { seq = []; draw(); } }, "Clear")))), verdict);
    draw();
    if (store.state.pictures.end) btn.click();
  }

  /* ------------------------------------------------------------------ the Defense */
  const PICKS = [["m07", 0], ["m03", 0], ["m11", 0], ["m01", 0], ["m12", 0], ["m05", 2], ["m08", 2], ["m02", 1], ["m13", 0], ["m04", 0], ["m10", 0], ["m06", 0], ["m09", 2]];
  const LADDERS = [["m06", 1], ["m09", 0]];
  function lawChips(laws) { return (laws || []).map((l) => h("button", { class: "chip law", "data-law": l, type: "button" }, C.lawLabel(l))); }
  function grade(key, onChange) {
    const rec = F().defense[key] || {};
    return MM.seg([{ label: "Nailed it", value: "good" }, { label: "Partly", value: "part" }, { label: "Missed", value: "miss" }], rec.grade || null, (v) => { save((f) => { f.defense[key] = Object.assign({}, f.defense[key], { grade: v }); }); onChange(); }, "How did your answer hold up?");
  }
  function challenge(n, id, sk, onChange) {
    const key = id + "." + n, rec = F().defense[key] || {};
    const ta = h("textarea", { placeholder: "Answer the Skeptic in your own words, using the Laws…", "aria-label": "Your answer", style: "min-height:80px" });
    ta.value = rec.text || "";
    ta.addEventListener("input", MM.debounce(() => save((f) => { f.defense[key] = Object.assign({}, f.defense[key], { text: ta.value }); }, true), 500));
    const ans = h("div", { hidden: !rec.open, class: "stack", style: "--gap:8px;margin-top:8px" },
      h("div", { class: "row" }, h("span", { class: "eyebrow" }, "An answer built from the Laws"), ...lawChips(sk.laws)), MM.richEl(sk.a),
      sk.ladder ? h("ol", { class: "ladder" }, sk.ladder.map((r) => h("li", null, MM.richEl(r, "span")))) : null,
      h("div", { class: "row", style: "margin-top:4px" }, h("span", { class: "eyebrow" }, "your verdict"), grade(key, onChange)));
    const reveal = h("button", { class: "btn small", type: "button", hidden: !!rec.open }, "Show an answer");
    reveal.onclick = () => { if (ta.value.trim().length < 15) { MM.toast("Write your own answer first."); ta.focus(); return; } ans.hidden = false; reveal.hidden = true; save((f) => { f.defense[key] = Object.assign({}, f.defense[key], { text: ta.value, open: Date.now() }); }); };
    const live = h("div", { "aria-live": "polite" });
    const push = h("button", { class: "btn small", type: "button", hidden: true }, MM.icon("bolt"), "Let the Skeptic push back");
    MM.ai.available().then((ok) => { push.hidden = !ok; });
    push.onclick = async () => {
      if (ta.value.trim().length < 20) { MM.toast("Write your own answer first."); return; }
      push.disabled = true; live.innerHTML = ""; live.append(h("div", { class: "faint pulse" }, "The Skeptic is thinking…"));
      const prompt = `Play "the Skeptic": a friendly but sharp challenger in an AI course for a 14-15-year-old whose English is not their first language. Use very simple English, short sentences.\nChallenge: ${MM.plain(sk.q)}\nModel answer (do not just repeat it): ${MM.plain(sk.a)}\nLaws it uses: ${(sk.laws || []).map((l) => (C.lawById[l] ? C.lawById[l].name + ": " + C.lawById[l].simple : l)).join(" | ")}\nLearner's answer: """${ta.value.slice(0, 1500)}"""\n\nReply in under 90 words: first say plainly whether the learner's answer holds up and name any error. Then ask ONE harder follow-up "why?" question.`;
      try { await MM.ai.ask(prompt, { options: { cache: false, onText: ({ text }) => { live.innerHTML = ""; live.append(h("div", { class: "bubble", style: "margin-top:8px" }, text)); } } }); }
      catch (e) { live.innerHTML = ""; live.append(h("p", { class: "note warn" }, MM.ai.message(e))); }
      push.disabled = false;
    };
    return h("div", { class: "skeptic", style: "margin-top:14px" }, h("div", { class: "face", "aria-hidden": "true" }, MM.icon("skeptic")),
      h("div", { class: "stack", style: "--gap:8px" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, `Challenge ${n} · from ${C.byId[id].code}`)), h("div", { class: "bubble" }, MM.richEl(sk.q)), ta, h("div", { class: "row" }, reveal, push), ans, live));
  }
  function ladder(n, id, sk, onChange) {
    const key = id + ".ladder", rec = F().ladder[key] || {};
    const rungs = sk.ladder.map((r) => { const k_ = r.indexOf("?"); return k_ > 0 ? [r.slice(0, k_ + 1), r.slice(k_ + 1).trim()] : [r, ""]; });
    const body = h("div", { class: "stack", style: "--gap:10px" });
    const done = h("div", { hidden: true }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "your verdict on the whole climb"), grade(key, onChange)));
    function rung(j) {
      if (j >= rungs.length) { done.hidden = false; return; }
      const ta = h("textarea", { placeholder: "Your answer to this rung…", "aria-label": "Your answer to rung " + (j + 1), style: "min-height:70px" });
      ta.value = (rec.rungs || {})[j] || "";
      const ans = h("div", { class: "callout", hidden: true, style: "margin-top:6px" }, MM.richEl(rungs[j][1], "div"));
      const go = h("button", { class: "btn small", type: "button" }, "Check this rung");
      go.onclick = () => {
        if (ta.value.trim().length < 10) { MM.toast("Climb it yourself first."); ta.focus(); return; }
        save((f) => { f.ladder[key] = f.ladder[key] || { rungs: {} }; f.ladder[key].rungs = Object.assign({}, f.ladder[key].rungs, { [j]: ta.value }); });
        ans.hidden = false; go.remove(); rung(j + 1);
      };
      body.append(h("div", null, h("div", { class: "eyebrow" }, `Rung ${j + 1} of ${rungs.length}`), h("p", { style: "margin:4px 0 6px;font-weight:700" }, MM.plain(rungs[j][0])), ta, h("div", { class: "row", style: "margin-top:6px" }, go), ans));
    }
    const start = h("button", { class: "btn small primary", type: "button" }, "Start climbing");
    start.onclick = () => { start.remove(); rung(0); };
    return h("div", { class: "card", style: "margin-top:14px" }, h("div", { class: "eyebrow" }, `Challenge ${n} · why-ladder, no help · from ${C.byId[id].code}`), h("div", { class: "bubble", style: "margin-top:8px" }, MM.richEl(sk.q)), h("p", { class: "muted", style: "margin:8px 0" }, "Answer each “why?” yourself before you see the next step. Three rungs, each one deeper."), h("div", { class: "row" }, ...lawChips(sk.laws)), h("div", { style: "margin-top:10px" }, start), body, done);
  }

  function defense(root, defs, onChange) {
    let n = 0;
    PICKS.forEach(([id, k_]) => { n++; root.append(challenge(n, id, defs[id].skeptic[k_], onChange)); });
    root.append(h("h3", { style: "margin-top:24px" }, "Two why-ladders, no help"));
    LADDERS.forEach(([id, k_]) => { n++; root.append(ladder(n, id, defs[id].skeptic[k_], onChange)); });
  }

  /* ------------------------------------------------------------------ page */
  function custom(root, api) {
    const id = "f1";
    root.append(h("section", { class: "section" }, h("div", { class: "card reading", style: "max-width:46rem" },
      h("div", { class: "eyebrow" }, "Phase 1 finale"),
      h("p", { style: "margin-top:8px;font-size:1.08rem" }, "Thirteen stations ago, Maya typed a sentence and a machine guessed “rain”. Now you can explain every step of that, and defend it. This finale has three parts: ride the whole machine again at full resolution and narrate it yourself; compare your picture of the inside with the one you built at the start; then face fifteen challenges from the Skeptic, with no notes but the Laws."),
      h("p", { class: "muted", style: "margin-top:8px" }, "Nothing here is timed. Your narrations and answers are saved as you type, and they go into your notebook."))));

    const t = section("01", "The Grand Tour, at full resolution");
    t.append(h("p", { class: "muted reading" }, "Twelve stations, from Maya's keystrokes to the tools around the model. At each one, narrate first, then check yourself against the key points."));
    const tourBox = h("div");
    t.append(tourBox);
    root.append(t);
    Promise.all([api.lm(), MM.loadData("tokens").catch(() => null), MM.loadData("training").catch(() => null)]).then(([lm, tk, tr]) => {
      const e = tk && tk.texts && tk.texts.spine ? tk.texts.spine.enc.cl100k : null;
      const extra = { ids: e ? e.map((x) => x[0]) : [11356, 64, 19937, 1077, 48998, 1606, 279, 18057, 369, 12366, 1071, 433, 1053], toks: e ? e.map((x) => x[1]) : ["May", "a", " packed", " her", " umbrella", " because", " the", " forecast", " for", " Paris", " said", " it", " would"], training: tr };
      tour(tourBox, lm, extra);
      MM.markDone(id, "story");
    }).catch((err) => tourBox.append(MM.errorBox(err)));

    const b = section("02", "Before and after");
    b.append(h("p", { class: "muted reading" }, "At the start of the line you built a picture of what happens inside, from blocks that included traps. Build it again now, without looking back, then compare the two."));
    root.append(b);
    MM.loadModule("m00").then((d) => { beforeAfter(b, d.BLOCKS); MM.markDone(id, "lab"); }).catch((err) => b.append(MM.errorBox(err)));

    const d = section("03", "The Defense");
    d.append(h("p", { class: "muted reading" }, "Fifteen challenges that mix every station. Answer each one in your own words, then compare with an answer built from the Laws and give yourself an honest verdict. The last two are why-ladders: three “why?” questions in a row, climbed without help."));
    const status = h("div", { class: "card", style: "margin-top:12px" });
    const defBox = h("div");
    d.append(status, defBox);
    root.append(d);

    const fin = section("04", "Unlock Line 2");
    const finBtn = h("button", { class: "btn primary", type: "button" }, MM.icon("check"), "Finish Phase 1");
    const finNote = h("p", { class: "muted", style: "margin-top:8px" });
    fin.append(h("p", { class: "muted reading" }, "Line 2 builds Maya's team of agents with LangGraph. Every idea from this line comes with you: each agent is this machine, run again with its own context."), h("div", { class: "row", style: "margin-top:10px" }, finBtn, h("button", { class: "btn", type: "button", onclick: () => MM.go("a00") }, "Go to A0 · The Team in Action", MM.icon("next"))), finNote);
    root.append(fin);

    const ALL = PICKS.map(([m, k_]) => m + "." + (PICKS.findIndex((p) => p[0] === m && p[1] === k_) + 1)).concat(LADDERS.map(([m]) => m + ".ladder"));
    function refresh() {
      const f = F(), graded = ALL.filter((k_) => f.defense[k_] && f.defense[k_].grade);
      const counts = { good: 0, part: 0, miss: 0 };
      graded.forEach((k_) => counts[f.defense[k_].grade]++);
      const tourN = Object.values(f.tour).filter((x) => x && x.shown).length;
      status.innerHTML = "";
      status.append(h("div", { class: "meter" }, h("span", null, "challenges answered ", h("b", null, `${graded.length} / 15`)), h("span", null, "nailed ", h("b", null, String(counts.good))), h("span", null, "partly ", h("b", null, String(counts.part))), h("span", null, "missed ", h("b", null, String(counts.miss))), h("span", null, "stations narrated ", h("b", null, `${tourN} / 12`))));
      if (graded.length >= 15) { MM.markDone(id, "skeptic"); MM.markDone(id, "explain"); }
      const ready = graded.length >= 15;
      finBtn.disabled = !ready || !!store.mod(id).completed;
      if (store.mod(id).completed) { finBtn.textContent = "Phase 1 complete"; finNote.textContent = "Line 2 is open. Your answers stay in your notebook."; }
      else finNote.textContent = ready ? (counts.miss ? `You marked ${counts.miss} as missed. Revisit those stations any time; the Daily Five will bring them back.` : "Every challenge answered. Well defended.") : "Answer all fifteen challenges to finish.";
    }
    finBtn.onclick = () => {
      MM.STEPS.forEach((st) => MM.markDone(id, st));
      store.update((st) => { st.mods[id].completed = Date.now(); C.laws.filter((l) => l.phase === 1).forEach((l) => { st.laws[l.id] = st.laws[l.id] || Date.now(); }); });
      MM.toast("Phase 1 complete. Line 2 is open.");
      refresh();
    };
    Promise.all(["m01", "m02", "m03", "m04", "m05", "m06", "m07", "m08", "m09", "m10", "m11", "m12", "m13"].map((m) => MM.loadModule(m))).then(() => { defense(defBox, MM.defs, refresh); refresh(); }).catch((err) => defBox.append(MM.errorBox(err)));
    MM.markDone(id, "mystery");
  }

  MM.defineModule({ id: "f1", custom });
})();
