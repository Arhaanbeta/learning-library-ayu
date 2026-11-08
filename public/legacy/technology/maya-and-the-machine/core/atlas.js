/* The Architecture Atlas: annotated blueprints, drawn from data, at three zoom levels. */
(function () {
  const MM = window.MM, h = MM.h, s = MM.s, C = MM.course;
  const KIND = {
    llm: { label: "LLM-driven (probabilistic)", col: "var(--llm)" },
    code: { label: "Ordinary code (testable, repeatable)", col: "var(--code)" },
    data: { label: "Stored data", col: "var(--data)" },
    person: { label: "A person", col: "var(--person)" },
    built: { label: "Built in advance", col: "var(--built)" } };
  const N = (id, x, y, w, hh, label, sub, kind, mod) => ({ id, x, y, w, h: hh, label, sub, kind, mod });
  const G = (x, y, w, hh, label, kind) => ({ x, y, w, h: hh, label, kind });
  const L = (a, b, o) => Object.assign({ a, b }, o || {});

  const BP = {};
  BP.system = { title: "The whole system", level: 0, W: 400, H: 664, q: "What are all the parts, and how do they connect?",
    note: "Only the parts marked LLM-driven are probabilistic; everything else is ordinary, testable software. Requests flow down, results flow back up, and the model and the search index were prepared long before Maya typed.",
    groups: [G(8, 78, 384, 236, "Agent runtime · ordinary code (LangGraph)"), G(8, 330, 384, 80, "Tools · ordinary code"), G(8, 426, 384, 134, "The LLM · probabilistic", "llm"), G(8, 576, 384, 80, "Built in advance", "built")],
    nodes: [N("maya", 12, 10, 110, 50, "Maya", "types a request", "person", "m00"), N("app", 146, 10, 246, 50, "Chat app", "streams the reply back", "code", "m09"),
      N("graph", 18, 104, 172, 50, "Graph engine", "nodes, edges, rounds", "code", "a05"), N("state", 210, 104, 172, 50, "Shared state", "fields + merge rules", "data", "a03"),
      N("lead", 18, 172, 172, 50, "Lead agent", "plans and delegates", "llm", "a07"), N("workers", 210, 172, 172, 50, "Worker agents", "weather, travel, activities", "llm", "a06"),
      N("ckpt", 18, 240, 172, 50, "Checkpointer + Store", "saves every round", "data", "a08"), N("human", 210, 240, 172, 50, "Approval", "pauses for Maya", "person", "a09"),
      N("apis", 18, 352, 172, 48, "Tool APIs", "weather, booking", "code", "m13"), N("vdb", 210, 352, 172, 48, "Vector database", "search by meaning", "data", "m12"),
      N("tokr", 18, 452, 84, 46, "Tokeniser", "", "code", "m03"), N("emb", 110, 452, 84, 46, "Embeddings", "", "llm", "m04"), N("blocks", 202, 452, 92, 46, "Blocks × N", "", "llm", "m07"), N("samp", 302, 452, 80, 46, "Sampler", "", "code", "m08"),
      N("loop", 18, 506, 364, 44, "Generation loop", "append the new token and run the machine again", "code", "m09"),
      N("train", 18, 598, 172, 48, "Training", "sets the frozen weights", "built", "m10"), N("index", 210, 598, 172, 48, "Document index", "chunks embedded ahead of time", "built", "m12")],
    links: [L("maya", "app"), L("app", "graph", { label: "message + thread ID" }), L("graph", "state", { both: true }), L("graph", "lead"), L("lead", "workers", { label: "Send" }), L("graph", "ckpt"), L("human", "state", { both: true }),
      L("workers", "vdb", { label: "tool calls" }), L("workers", "apis", { via: [[200, 330]] }), L("lead", "emb", { via: [[60, 330], [60, 440]], label: "every agent step = one LLM call", dash: true }),
      L("tokr", "emb"), L("emb", "blocks"), L("blocks", "samp"), L("train", "blocks", { dash: true, via: [[250, 590]], label: "weights" }), L("index", "vdb", { dash: true, via: [[392, 600], [392, 380]] })],
    flow: [["maya", "Maya types: “Plan three rain-friendly days in Paris within my budget.”"], ["app", "The app sends her message, with her thread ID, to the runtime."], ["graph", "The runtime loads her saved state and runs the lead agent's node."], ["lead", "The lead agent is one LLM call: it reads its context and writes a plan."], ["tokr", "Inside that call, text becomes tokens…"], ["emb", "…tokens become vectors…"], ["blocks", "…the blocks refine every vector…"], ["samp", "…and the sampler picks each next token."], ["workers", "The plan sends work to three worker agents in parallel."], ["vdb", "Workers ask for tools; ordinary code runs them, including a search over Maya's documents."], ["ckpt", "Every round, the state is merged and saved."], ["human", "Before paying, the run pauses and waits for Maya."], ["app", "The finished plan streams back to Maya."]] };

  BP.machine = { title: "Machine map", level: 1, W: 400, H: 690, q: "What happens inside the model for one token?",
    note: "Each new token takes one full trip down the centre. Training (left) set the frozen weights long before; outside help (right) can only add text to the context.",
    groups: [G(124, 196, 152, 222, "× N blocks", "llm")],
    nodes: [N("text", 130, 10, 140, 46, "Text so far", "the context window", "code", "m09"), N("tokr", 130, 72, 140, 46, "Tokeniser", "text → token IDs", "code", "m03"),
      N("emb", 130, 134, 140, 46, "Embedding table", "ID → vector", "llm", "m04"), N("pos", 288, 134, 104, 46, "Positions", "word order", "llm", "m06"),
      N("att", 132, 222, 136, 46, "Attention", "tokens share info", "llm", "m06"), N("mlp", 132, 290, 136, 46, "MLP", "each token alone", "llm", "m07"), N("res", 132, 358, 136, 46, "Residual stream", "every layer adds", "llm", "m07"),
      N("unemb", 130, 436, 140, 46, "Unembedding", "vector → scores", "llm", "m08"), N("soft", 130, 498, 140, 46, "Softmax", "scores → chances", "code", "m08"),
      N("samp", 130, 560, 140, 46, "Sampler", "picks one token", "code", "m08"), N("next", 130, 626, 140, 46, "Next token", "“rain”", "code", "m01"),
      N("data", 10, 134, 98, 46, "Text data", "trillions of tokens", "built", "m10"), N("pre", 10, 222, 98, 46, "Pretraining", "predict, nudge", "built", "m10"), N("post", 10, 290, 98, 46, "Post-training", "shape behaviour", "built", "m11"), N("wts", 10, 358, 98, 46, "Frozen weights", "read, never written", "built", "m02"),
      N("rag", 288, 10, 104, 46, "Retrieved text", "from search", "code", "m12"), N("tools", 288, 72, 104, 46, "Tool results", "from programs", "code", "m13")],
    links: [L("text", "tokr"), L("tokr", "emb"), L("emb", "att"), L("pos", "emb"), L("att", "mlp"), L("mlp", "res"), L("res", "unemb"), L("unemb", "soft"), L("soft", "samp"), L("samp", "next"),
      L("next", "text", { via: [[116, 649], [116, 33]], label: "append, repeat" }), L("data", "pre"), L("pre", "post"), L("post", "wts"), L("wts", "att", { dash: true }), L("wts", "mlp", { dash: true }),
      L("rag", "text", { label: "adds text" }), L("tools", "text", { via: [[280, 95], [280, 45]] })],
    flow: [["text", "Maya's sentence so far is the context: 13 tokens with a real tokeniser."], ["tokr", "The tokeniser cuts it into pieces and gives each an ID number."], ["emb", "Each ID picks a row of the embedding table: a vector."], ["pos", "Position information is mixed in, so order can matter."], ["att", "Attention: “would” pulls in information from “umbrella” and “forecast”."], ["mlp", "The MLP works on each token alone, adding stored knowledge."], ["res", "Both add their results to the running vector. Repeat for every block."], ["unemb", "The final vector is compared with every token: one score each."], ["soft", "Softmax turns the scores into chances that add up to 100%."], ["samp", "A simple sampler picks one token, shaped by temperature."], ["next", "“rain” is chosen."], ["text", "It is appended to the text, and the whole trip starts again."]] };

  BP.block = { title: "Inside one block", level: 2, W: 400, H: 560, q: "How do attention, the MLP and the residual stream fit together?",
    note: "Attention is the only side-road where tokens share information; the MLP works on each token alone. Both add their result back to the river, which is why very deep stacks still train (Laws 6 and 7).",
    groups: [G(104, 118, 290, 140, "Attention · multi-head", "llm"), G(104, 330, 290, 96, "MLP · each token alone", "llm")],
    nodes: [N("xin", 10, 10, 384, 44, "Residual stream in", "one running vector per token", "data", "m07"), N("n1", 104, 66, 120, 40, "Norm", "steady scale", "code", "m07"),
      N("qkv", 112, 146, 120, 44, "Q, K, V", "three projections", "llm", "m06"), N("score", 242, 146, 144, 44, "Scores ÷ √d", "+ causal mask", "code", "m06"),
      N("sm", 112, 202, 120, 44, "Softmax", "weights add to 1", "code", "m06"), N("mix", 242, 202, 144, 44, "Mix values", "then output projection", "llm", "m06"),
      N("add1", 22, 268, 60, 40, "+", "", "code", "m07"), N("n2", 104, 278, 120, 40, "Norm", "", "code", "m07"),
      N("up", 112, 358, 104, 44, "Widen ×4", "", "llm", "m07"), N("act", 224, 358, 64, 44, "GELU", "the bend", "code", "m02"), N("down", 296, 358, 90, 44, "Narrow", "", "llm", "m07"),
      N("add2", 22, 444, 60, 40, "+", "", "code", "m07"), N("xout", 10, 500, 384, 44, "Residual stream out", "to the next block, or to the unembedding", "data", "m07")],
    links: [L("xin", "add1", { via: [[52, 60]] }), L("xin", "n1", { via: [[164, 60]] }), L("n1", "qkv"), L("qkv", "score"), L("score", "sm", { via: [[314, 196], [172, 196]] }), L("sm", "mix"), L("mix", "add1", { via: [[314, 288]] }),
      L("add1", "add2"), L("add1", "n2"), L("n2", "up"), L("up", "act"), L("act", "down"), L("down", "add2", { via: [[341, 464]] }), L("add2", "xout")],
    flow: [["xin", "Each token arrives as a vector in the residual stream."], ["n1", "A copy is normalised to a steady scale."], ["qkv", "Three learned matrices make a query, a key and a value for each token."], ["score", "Queries meet keys by dot product, divided by √d; later tokens are masked out."], ["sm", "Softmax turns each row of scores into weights."], ["mix", "Each token takes a weighted mix of earlier values."], ["add1", "The result is added to the stream. Nothing is erased."], ["up", "The MLP widens each token's vector about four times…"], ["act", "…bends it…"], ["down", "…and narrows it back."], ["add2", "Added to the stream again."], ["xout", "On to the next block."]] };

  BP.rag = { title: "RAG: two paths", level: 1, W: 400, H: 620, q: "How does retrieval work, before and during a question?",
    note: "Both paths use the same embedding model, so questions and passages land in the same space; the vector database is where the two paths meet. Only the last box is the LLM: everything before it is retrieval.",
    groups: [G(6, 10, 192, 340, "Built in advance", "built"), G(204, 10, 190, 340, "At question time")],
    nodes: [N("docs", 16, 40, 172, 48, "Documents", "booking email, travel notes", "data", "m12"), N("chunk", 16, 110, 172, 48, "Chunk", "cut into passages", "code", "m12"), N("embA", 16, 180, 172, 48, "Embedding model", "passage → vector", "llm", "m12"),
      N("vdb", 16, 278, 172, 54, "Vector database", "vectors + text + metadata", "data", "m12"),
      N("q", 214, 40, 170, 48, "Question", "“What time is check-in?”", "person", "m12"), N("embB", 214, 110, 170, 48, "Same embedding model", "question → vector", "llm", "m12"),
      N("search", 214, 180, 170, 48, "Similarity search", "ANN · HNSW", "code", "m12"), N("topk", 214, 278, 170, 54, "Top-k chunks", "nearest by cosine", "data", "m12"),
      N("rerank", 214, 370, 170, 48, "Reranker", "reads question + passage together", "llm", "m12"), N("prompt", 214, 438, 170, 48, "Prompt", "question + best chunks", "code", "m12"),
      N("llm", 214, 506, 170, 48, "LLM", "answers from the context", "llm", "m12"), N("ans", 16, 506, 172, 48, "Answer + citation", "“from 4 pm” [booking email]", "person", "m12")],
    links: [L("docs", "chunk"), L("chunk", "embA"), L("embA", "vdb"), L("q", "embB"), L("embB", "search"), L("search", "vdb", { both: true }), L("search", "topk"), L("topk", "rerank"), L("rerank", "prompt"), L("prompt", "llm"), L("llm", "ans")],
    flow: [["docs", "Before any question: Maya's documents are collected."], ["chunk", "They are cut into passages."], ["embA", "Each passage becomes a vector: a meaning fingerprint."], ["vdb", "Vectors are stored with their text."], ["q", "Later, Maya asks a question."], ["embB", "The same model turns the question into a vector."], ["search", "The search hops towards the nearest stored vectors."], ["topk", "The top matches come back."], ["rerank", "A slower, careful model re-scores them."], ["prompt", "The best passages are pasted into the prompt."], ["llm", "The LLM answers from that context."], ["ans", "The answer cites its source."]] };

  BP.step = { title: "One agent step", level: 1, W: 400, H: 560, q: "What goes into one LLM call, and what comes out?",
    note: "The model only ever reads the window and writes text; a tool call is just text in a special format. Code builds the window before each call and acts on the output after it.",
    groups: [G(6, 10, 388, 172, "Code builds the window")],
    nodes: [N("sys", 16, 40, 176, 40, "System prompt", "", "code", "m09"), N("tooldesc", 208, 40, 176, 40, "Tool descriptions", "", "code", "m13"), N("mem", 16, 88, 176, 40, "Memory", "from the Store", "data", "a08"), N("conv", 208, 88, 176, 40, "Conversation", "messages in the state", "data", "a03"), N("results", 112, 136, 176, 38, "Tool results so far", "", "data", "m13"),
      N("window", 100, 204, 200, 48, "Context window", "one long token sequence", "data", "m09"), N("call", 100, 274, 200, 48, "LLM call", "reads the window, writes text", "llm", "m13"),
      N("parse", 100, 344, 200, 48, "Code reads the output", "answer, or tool call?", "code", "m13"), N("run", 228, 424, 160, 48, "Run the tool", "ordinary code", "code", "m13"), N("reply", 12, 424, 160, 48, "Reply to Maya", "the loop stops", "person", "m13")],
    links: [L("sys", "window"), L("tooldesc", "window"), L("conv", "window"), L("window", "call"), L("call", "parse"), L("parse", "run", { label: "tool call" }), L("parse", "reply", { label: "answer" }), L("run", "results", { via: [[392, 448], [392, 156]], label: "result appended" })],
    flow: [["sys", "Code gathers the instructions…"], ["tooldesc", "…the descriptions of every tool…"], ["conv", "…and the conversation so far."], ["window", "All of it becomes one sequence of tokens."], ["call", "The model reads it and writes text."], ["parse", "Code checks: is this a tool call?"], ["run", "If yes, code runs the tool…"], ["results", "…and appends the result to the window. Loop."], ["reply", "When the model answers without a tool call, the loop stops."]] };

  const LANES = ["Maya", "App", "Runtime", "Agents", "Tools", "Storage"];
  const REQ = [[0, 2, "Maya's message arrives with a thread ID, the name of her conversation.", "a08"], [2, 5, "The runtime loads that thread's latest checkpoint.", "a08"], [2, 3, "The lead agent's node runs: code builds its context and makes one LLM call.", "a06"], [3, 2, "The model returns a plan; the node launches three Send tasks.", "a05"],
    [2, 3, "Weather, Travel and Activities run in the same super-step, each in its own fresh context.", "a07"], [3, 2, "Each worker's model asks for tool calls. The model only writes the request.", "m13"], [2, 4, "The runtime's tool nodes call the real services and search the vector database.", "m12"], [4, 3, "Results come back and are added to each worker's messages as tool messages.", "a06"],
    [2, 5, "At the end of the round, reducers merge every update and a checkpoint is saved.", "a05"], [3, 3, "Writer and Critic loop until the plan fits the budget, at most three times.", "a04"], [2, 0, "Before booking, an interrupt asks Maya to approve.", "a09"], [2, 5, "The state is saved and the run pauses; no program needs to keep running.", "a09"],
    [0, 2, "Next morning, Maya approves. The runtime re-runs the paused node, and this time it receives her answer.", "a09"], [2, 4, "Only now does the booking tool run.", "a09"], [2, 5, "A final checkpoint records the finished run.", "a08"], [2, 1, "The finished plan streams to Maya's screen as it is written.", "a10"]];
  BP.request = { title: "Life of one request", level: 1, W: 420, H: 60 + REQ.length * 38 + 20, q: "What happens, in order, when Maya asks?", swim: true,
    note: "Every arrow touches the runtime: it loads and saves the state, runs every agent and every tool, and pauses for Maya. The agents never message each other; they only read and write the shared state (Agent Law 2).",
    nodes: [], links: [], flow: REQ.map((r, i) => ["req" + i, (i + 1) + ". " + r[2]]) };

  BP.team = { title: "Trip-planner team", level: 1, W: 400, H: 610, q: "What does the finished team look like?",
    note: "Above the dashed line is the graph you draw; below it is what LangGraph runs every round: reducers merge updates into one shared state, and the checkpointer saves it.",
    nodes: [N("start", 160, 8, 80, 32, "START", "", "code", "a02"), N("lead", 120, 58, 160, 46, "Lead agent", "plans the trip", "llm", "a07"),
      N("weather", 8, 140, 120, 46, "Weather", "forecast tool", "llm", "a06"), N("travel", 140, 140, 120, 46, "Travel", "trains, hotel", "llm", "a06"), N("acts", 272, 140, 120, 46, "Activities", "rainy-day museums", "llm", "a06"),
      N("writer", 50, 232, 140, 46, "Writer", "drafts the plan", "llm", "a04"), N("critic", 210, 232, 140, 46, "Critic", "checks the budget", "llm", "a04"),
      N("approve", 120, 316, 160, 46, "Maya approves", "interrupt()", "person", "a09"), N("book", 120, 384, 160, 46, "Book hotel", "tool, runs once", "code", "a09"), N("end", 160, 448, 80, 32, "END", "", "code", "a02"),
      N("stateb", 8, 506, 196, 96, "Shared state", "plan · replace  ·  activities · append  ·  messages · add_messages", "data", "a03"),
      N("round", 214, 506, 178, 42, "Super-step counter", "rounds 1, 2, 3…", "code", "a05"), N("ckpt", 214, 558, 178, 44, "Checkpointer", "thread “maya-paris”", "data", "a08")],
    links: [L("start", "lead"), L("lead", "weather", { label: "Send", dash: true }), L("lead", "travel", { dash: true }), L("lead", "acts", { dash: true }), L("weather", "writer"), L("travel", "writer"), L("acts", "writer", { via: [[332, 214], [120, 214]] }),
      L("writer", "critic"), L("critic", "writer", { via: [[280, 296], [120, 296]], label: "over budget (≤3)", dash: true }), L("critic", "approve", { label: "fits", dash: true }), L("approve", "book"), L("book", "end")],
    divider: 492,
    flow: [["lead", "The lead agent reads Maya's request and makes a plan."], ["weather", "Send launches three workers in the same round…"], ["acts", "…each with its own context and tools."], ["stateb", "At the end of the round, reducers merge their results into the state."], ["writer", "The writer drafts a plan."], ["critic", "The critic checks the budget: over by €70, so back to the writer."], ["approve", "The plan fits. The run pauses for Maya's approval."], ["ckpt", "Everything is saved under her thread ID."], ["book", "Next morning she approves; only then does the booking run."], ["end", "Done."]] };

  BP.superstep = { title: "Inside one super-step", level: 2, W: 400, H: 520, q: "How does LangGraph actually run a round?",
    note: "Nodes never see each other's writes mid-round: everything merges at Update, by each channel's rule, and is saved before the next round begins (Agent Laws 3 to 5).",
    groups: [G(6, 96, 388, 170, "2 · Execute: scheduled tasks run in parallel")],
    nodes: [N("plan", 10, 14, 380, 60, "1 · Plan", "which channels changed last round? Wake the nodes that listen to them", "code", "a05"),
      N("t1", 18, 126, 116, 56, "Weather task", "writes buffered", "llm", "a05"), N("t2", 142, 126, 116, 56, "Travel task", "writes buffered", "llm", "a05"), N("t3", 266, 126, 116, 56, "Activities task", "writes buffered", "llm", "a05"),
      N("hidden", 18, 198, 364, 54, "Writes stay invisible", "no task sees another task's update during the round", "code", "a05"),
      N("update", 10, 290, 380, 60, "3 · Update", "apply every write by its channel's rule, in a fixed task order", "data", "a03"),
      N("save", 10, 372, 380, 56, "Checkpoint saved", "values, what runs next, versions, link to parent", "data", "a08"),
      N("nextr", 10, 450, 380, 56, "Next round, or stop", "END, nothing scheduled, an interrupt, or the recursion limit", "code", "a04")],
    links: [L("plan", "t2"), L("t1", "update", { via: [[76, 280]] }), L("t2", "update"), L("t3", "update", { via: [[324, 280]] }), L("update", "save"), L("save", "nextr")],
    flow: [["plan", "Plan: the runtime checks which channels were updated, using version numbers."], ["t1", "Execute: all woken tasks run at once."], ["hidden", "Their writes are buffered. Nobody sees them yet."], ["update", "Update: writes are applied by each field's rule, in a fixed order, so the result never depends on which task finished first."], ["save", "A checkpoint is saved."], ["nextr", "The edges decide the next round, or the run stops."]] };

  BP.making = { title: "How a model is made", level: 1, W: 400, H: 560, q: "How do data and computing power become an assistant?",
    note: "Rows 1 and 2 change the weights; row 3 packages and runs them, frozen. The dashed loop is the only way the model “learns from use”: failures become data for a new training run (Laws 4 and 8).",
    groups: [G(4, 6, 392, 98, "Changes the weights · knowledge", "built"), G(4, 118, 392, 196, "Changes the weights · behaviour", "built"), G(4, 330, 392, 98, "Packages and runs it · frozen")],
    nodes: [N("data", 12, 36, 118, 56, "Data", "crawl, clean, mix", "data", "m10"), N("pre", 141, 36, 118, 56, "Pretraining", "predict the next token", "built", "m10"), N("base", 270, 36, 118, 56, "Base model", "continues documents", "llm", "m11"),
      N("sft", 12, 148, 118, 56, "SFT", "example chats", "built", "m11"), N("pref", 141, 148, 118, 56, "Preference tuning", "RLHF, DPO", "built", "m11"), N("rl", 270, 148, 118, 56, "RL for reasoning", "checkable rewards", "built", "m11"),
      N("asst", 141, 238, 118, 56, "Assistant", "follows instructions", "llm", "m11"),
      N("eval", 12, 360, 118, 56, "Evaluate", "benchmarks, red team", "code", "m11"), N("cheap", 141, 360, 118, 56, "Make it cheaper", "distil, quantise", "code", "m11"), N("serve", 270, 360, 118, 56, "Serve", "batching, KV cache", "code", "m09"),
      N("users", 141, 470, 118, 56, "People use it", "weights never change", "person", "m10")],
    links: [L("data", "pre"), L("pre", "base"), L("base", "sft", { via: [[329, 112], [71, 112]] }), L("sft", "pref"), L("pref", "rl"), L("rl", "asst"), L("asst", "eval", { via: [[200, 322], [71, 322]] }), L("eval", "cheap"), L("cheap", "serve"), L("serve", "users"),
      L("users", "data", { dash: true, via: [[30, 498], [30, 92]], label: "failures → data for the next run" })],
    flow: [["data", "Collect and clean trillions of tokens."], ["pre", "Pretraining: predict the next token, nudge every weight, trillions of times."], ["base", "A base model: knowledgeable, but it just continues documents."], ["sft", "Supervised fine-tuning on example conversations."], ["pref", "Preference tuning shapes tone and care."], ["rl", "RL with checkable rewards grows long reasoning."], ["asst", "An assistant."], ["eval", "Test it and attack it on purpose."], ["cheap", "Shrink it for serving."], ["serve", "Serve it to many people at once."], ["users", "Its weights never change while people use it."]] };

  BP.patterns = { title: "Multi-agent patterns", level: 1, W: 400, H: 620, q: "How else could the team be organised?", patterns: true,
    note: "In each sketch the highlighted part makes the decisions. LangChain's documentation names the last five patterns; the single agent is the baseline every team design must beat on quality, cost and reliability.",
    nodes: [], links: [], flow: [] };

  const ATLAS_ORDER = ["system", "machine", "block", "making", "rag", "step", "team", "superstep", "request", "patterns"];

  /* which blueprint, and which parts, each station zooms into */
  const FOCUS = {
    m00: ["machine", ["text", "tokr", "emb", "att", "mlp", "res", "unemb", "soft", "samp", "next"], ["tokr", "emb", "blocks", "samp", "loop"]],
    m01: ["machine", ["soft", "samp", "next"], ["samp", "loop"]], m02: ["machine", ["pre", "wts"], ["train"]], m03: ["machine", ["tokr"], ["tokr"]],
    m04: ["machine", ["emb"], ["emb"]], m05: ["machine", ["att", "res"], ["blocks"]], m06: ["block", ["qkv", "score", "sm", "mix"], ["blocks"]],
    m07: ["block", ["xin", "n1", "add1", "n2", "up", "act", "down", "add2", "xout"], ["blocks"]], m08: ["machine", ["unemb", "soft", "samp"], ["samp"]],
    m09: ["machine", ["text", "next"], ["loop", "app"]], m10: ["making", ["data", "pre", "base"], ["train"]], m11: ["making", ["sft", "pref", "rl", "asst", "eval", "cheap"], ["train"]],
    m12: ["rag", ["docs", "chunk", "embA", "vdb", "q", "embB", "search", "topk", "rerank", "prompt", "llm", "ans"], ["vdb", "index"]], m13: ["step", ["call", "parse", "run", "results", "tooldesc"], ["apis", "workers"]],
    s1: ["machine", ["tokr", "emb", "att"], ["emb", "blocks"]], f1: ["machine", ["text", "tokr", "emb", "pos", "att", "mlp", "res", "unemb", "soft", "samp", "next"], ["tokr", "emb", "blocks", "samp", "loop", "train"]],
    a00: ["team", ["lead", "weather", "travel", "acts", "writer", "critic", "approve", "book"], ["graph", "lead", "workers", "human"]], a01: ["step", ["call", "parse", "run"], ["lead", "workers"]],
    a02: ["team", ["start", "lead", "writer", "critic", "end"], ["graph"]], a03: ["team", ["stateb"], ["state"]], a04: ["team", ["writer", "critic", "approve"], ["graph"]],
    a05: ["superstep", ["plan", "t1", "t2", "t3", "hidden", "update", "save", "nextr"], ["graph", "state"]], a06: ["step", ["call", "parse", "run", "results"], ["workers"]],
    a07: ["team", ["lead", "weather", "travel", "acts"], ["lead", "workers"]], a08: ["team", ["ckpt", "stateb"], ["ckpt"]], a09: ["team", ["approve", "book"], ["human"]],
    a10: ["system", ["app", "graph", "apis", "human"], ["app", "apis", "human"]], s2: ["system", ["graph", "lead", "workers", "apis"], ["graph", "apis"]],
    f2: ["team", ["lead", "weather", "travel", "acts", "writer", "critic", "approve", "book", "stateb", "round", "ckpt"], ["graph", "state", "lead", "workers", "ckpt", "human"]] };

  /* ---------------------------------------------------------------- drawing */
  let uid = 0;
  function center(n) { return [n.x + n.w / 2, n.y + n.h / 2]; }
  function edgePoint(n, tx, ty) {
    const [cx, cy] = center(n), dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    const t = Math.min(dx ? Math.abs(n.w / 2 / dx) : Infinity, dy ? Math.abs(n.h / 2 / dy) : Infinity);
    return [cx + dx * t, cy + dy * t];
  }
  function draw(bp, opts) {
    opts = opts || {};
    const id = "bp" + ++uid;
    const svg = s("svg", { viewBox: `0 0 ${bp.W} ${bp.H}`, role: "img", "aria-label": bp.title + " blueprint" });
    const defs = s("defs");
    [["a", "var(--ink-3)"], ["l", "var(--seine)"]].forEach(([k, col]) => defs.append(s("marker", { id: id + k, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0 0 10 5 0 10z", fill: col }))));
    svg.append(defs);
    if (bp.swim) return drawSwim(bp, svg, id, opts);
    if (bp.patterns) return drawPatterns(bp, svg, opts);
    (bp.groups || []).forEach((g) => svg.append(s("rect", { x: g.x, y: g.y, width: g.w, height: g.h, rx: 12, fill: g.kind === "llm" ? "color-mix(in srgb, var(--llm) 5%, transparent)" : "none", stroke: g.kind ? KIND[g.kind].col : "var(--rule)", "stroke-dasharray": g.kind === "built" ? "6 4" : null, "stroke-width": 1.2, opacity: 0.9 }),
      s("text", { x: g.x + 10, y: g.y + 15, "font-size": 10.5, class: "t-disp", fill: "var(--ink-3)", "letter-spacing": "0.08em", text: g.label.toUpperCase() })));
    if (bp.divider) svg.append(s("line", { x1: 0, x2: bp.W, y1: bp.divider, y2: bp.divider, stroke: "var(--ink-3)", "stroke-dasharray": "6 5" }), s("text", { x: 6, y: bp.divider - 6, "font-size": 10.5, class: "t-disp", fill: "var(--ink-3)", text: "BELOW THE WATERLINE · WHAT THE ENGINE RUNS" }));
    const byId = Object.fromEntries(bp.nodes.map((n) => [n.id, n]));
    const linkEls = [];
    bp.links.forEach((l) => {
      const A = byId[l.a], B = byId[l.b];
      if (!A || !B) return;
      const pts = [];
      const via = l.via || [];
      const first = via.length ? via[0] : center(B), last = via.length ? via[via.length - 1] : center(A);
      pts.push(edgePoint(A, first[0], first[1]));
      via.forEach((p) => pts.push(p));
      pts.push(edgePoint(B, last[0], last[1]));
      const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
      const path = s("path", { d, class: "lnk" + (l.dash ? " dash" : ""), "marker-end": `url(#${id}a)`, "marker-start": l.both ? `url(#${id}a)` : null });
      path.dataset.a = l.a; path.dataset.b = l.b;
      svg.append(path);
      linkEls.push(path);
      if (l.label && !opts.compact) {
        const mid = pts[Math.floor((pts.length - 1) / 2)], mid2 = pts[Math.floor((pts.length - 1) / 2) + 1];
        const mx = (mid[0] + mid2[0]) / 2, my = (mid[1] + mid2[1]) / 2;
        svg.append(s("text", { x: mx + 4, y: my - 4, "font-size": 9.5, fill: "var(--ink-2)", style: "paint-order:stroke;stroke:var(--sheet);stroke-width:4px;stroke-linejoin:round", text: l.label }));
      }
    });
    const nodeEls = {};
    bp.nodes.forEach((n) => {
      const k = KIND[n.kind];
      const g = s("g", { class: "box", tabindex: opts.compact ? null : "0", role: opts.compact ? null : "button", "aria-label": n.label + (n.sub ? ": " + n.sub : "") + ". " + k.label + "." });
      g.dataset.id = n.id;
      g.append(s("rect", { class: "frame", x: n.x, y: n.y, width: n.w, height: n.h, rx: n.label === "+" ? 20 : 8, fill: n.kind === "llm" ? "color-mix(in srgb, var(--llm) 9%, var(--sheet))" : n.kind === "data" ? "color-mix(in srgb, var(--data) 9%, var(--sheet))" : n.kind === "person" ? "color-mix(in srgb, var(--person) 12%, var(--sheet))" : "var(--sheet)", stroke: k.col, "stroke-dasharray": n.kind === "built" ? "5 3" : null }));
      if (n.kind === "data") g.append(s("path", { d: `M${n.x + 6} ${n.y + 7} h${n.w - 12}`, stroke: k.col, "stroke-width": 1, opacity: 0.6 }));
      const compact = opts.compact;
      const fs = compact ? 15 : n.w < 90 ? 11.5 : 13;
      const ty = n.sub && !compact ? n.y + n.h / 2 - 3 : n.y + n.h / 2 + 4.5;
      g.append(s("text", { x: n.x + n.w / 2, y: ty, "text-anchor": "middle", "font-size": n.label === "+" ? 22 : fs, class: "t-disp", text: n.label }));
      if (n.sub && !compact) g.append(s("text", { x: n.x + n.w / 2, y: n.y + n.h / 2 + 12, "text-anchor": "middle", "font-size": 10, fill: "var(--ink-2)", text: n.sub }));
      if (!compact && n.mod && C.byId[n.mod] && n.w >= 100) g.append(s("text", { x: n.x + n.w - 5, y: n.y + 11, "text-anchor": "end", "font-size": 8.5, class: "t-mono", fill: "var(--ink-3)", text: C.byId[n.mod].code }));
      svg.append(g);
      nodeEls[n.id] = g;
    });
    svg._nodes = nodeEls; svg._links = linkEls;
    if (opts.lit) light(svg, opts.lit);
    return svg;
  }
  function light(svg, ids, liveLinks) {
    const set = new Set(ids || []);
    Object.entries(svg._nodes || {}).forEach(([k, g]) => { g.classList.toggle("dim", set.size > 0 && !set.has(k)); g.classList.toggle("lit", set.has(k)); });
    (svg._links || []).forEach((p) => {
      const live = liveLinks ? liveLinks.has(p.dataset.a + ">" + p.dataset.b) : (set.has(p.dataset.a) && set.has(p.dataset.b));
      p.classList.toggle("live", !!live);
      p.setAttribute("marker-end", p.getAttribute("marker-end").replace(/(a|l)\)$/, live ? "l)" : "a)"));
    });
  }

  function drawSwim(bp, svg, id, opts) {
    const lane = (i) => 22 + i * ((bp.W - 44) / (LANES.length - 1));
    LANES.forEach((name, i) => {
      svg.append(s("line", { x1: lane(i), x2: lane(i), y1: 40, y2: bp.H - 10, stroke: "var(--rule)", "stroke-width": 2 }));
      svg.append(s("text", { x: lane(i), y: 22, "text-anchor": "middle", "font-size": 11.5, class: "t-disp", text: name }));
    });
    svg._rows = [];
    REQ.forEach((r, i) => {
      const y = 62 + i * 38, x1 = lane(r[0]), x2 = lane(r[1]);
      const g = s("g", { class: "box", tabindex: opts.compact ? null : "0", role: "button", "aria-label": (i + 1) + ". " + r[2] });
      g.dataset.id = "req" + i;
      if (r[0] === r[1]) g.append(s("path", { d: `M${x1} ${y - 8} C ${x1 + 46} ${y - 18}, ${x1 + 46} ${y + 18}, ${x1 + 4} ${y + 8}`, class: "lnk", "marker-end": `url(#${id}a)` }));
      else g.append(s("path", { d: `M${x1 + (x2 > x1 ? 6 : -6)} ${y} L${x2 + (x2 > x1 ? -8 : 8)} ${y}`, class: "lnk", "marker-end": `url(#${id}a)` }));
      const bx = r[0] === r[1] ? x1 + 30 : (x1 + x2) / 2;
      g.append(s("circle", { cx: bx, cy: y, r: 9.5, fill: "var(--sheet)", stroke: "var(--ink-3)", class: "frame" }), s("text", { x: bx, y: y + 3.6, "text-anchor": "middle", "font-size": 10, class: "t-mono", text: String(i + 1) }));
      svg.append(g);
      svg._rows.push(g);
    });
    svg._nodes = Object.fromEntries(svg._rows.map((g) => [g.dataset.id, g]));
    svg._links = [];
    return svg;
  }

  function drawPatterns(bp, svg, opts) {
    const P = [["Single agent", "the baseline: one agent, every tool", "one"], ["Subagents", "a main agent calls specialists as tools", "sub"], ["Handoffs", "the active agent passes the baton", "hand"], ["Skills", "one agent loads specialist instructions", "skill"], ["Router", "a classifier sends work to specialists", "route"], ["Custom workflow", "your own graph mixes fixed and agent steps", "custom"]];
    const W = 188, H = 190;
    P.forEach(([title, sub, kind], i) => {
      const x = 8 + (i % 2) * (W + 8), y = 8 + Math.floor(i / 2) * (H + 14);
      const g = s("g", { class: "box", tabindex: opts.compact ? null : "0", role: "button", "aria-label": title + ": " + sub });
      g.dataset.id = kind;
      g.append(s("rect", { class: "frame", x, y, width: W, height: H, rx: 10, fill: "var(--sheet)", stroke: "var(--rule)" }));
      g.append(s("text", { x: x + 10, y: y + 20, "font-size": 13, class: "t-disp", text: title }), s("text", { x: x + 10, y: y + 35, "font-size": 9.5, fill: "var(--ink-2)", text: sub }));
      const dec = "var(--llm)";
      const node = (cx, cy, label, hot, r) => [s("circle", { cx, cy, r: r || 13, fill: hot ? "color-mix(in srgb, var(--llm) 22%, var(--sheet))" : "var(--sheet)", stroke: hot ? dec : "var(--ink-3)", "stroke-width": hot ? 2.6 : 1.4 }), s("text", { x: cx, y: cy + 3.5, "text-anchor": "middle", "font-size": 9, class: "t-disp", text: label })];
      const line = (x1, y1, x2, y2, dash) => s("line", { x1, y1, x2, y2, stroke: "var(--ink-3)", "stroke-width": 1.3, "stroke-dasharray": dash ? "4 3" : null });
      const cx = x + W / 2, cy = y + 110;
      if (kind === "one") { for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.append(line(cx, cy, cx + Math.cos(a) * 52, cy + Math.sin(a) * 40), s("rect", { x: cx + Math.cos(a) * 52 - 5, y: cy + Math.sin(a) * 40 - 5, width: 10, height: 10, rx: 2, fill: "var(--sheet)", stroke: "var(--code)" })); } g.append(...node(cx, cy, "agent", true, 17)); }
      if (kind === "sub") { [[-55, 45], [0, 50], [55, 45]].forEach(([dx, dy]) => g.append(line(cx, cy - 22, cx + dx, cy + dy - 30), ...node(cx + dx, cy + dy - 22, "spec"))); g.append(...node(cx, cy - 22, "main", true, 17)); }
      if (kind === "hand") { g.append(line(cx - 55, cy, cx + 55, cy, true)); g.append(...node(cx - 55, cy, "A"), ...node(cx, cy, "B", true, 16), ...node(cx + 55, cy, "C")); g.append(s("text", { x: cx, y: cy + 36, "text-anchor": "middle", "font-size": 9, fill: "var(--ink-2)", text: "user talks to the active agent" })); }
      if (kind === "skill") { [[-58, 30], [-20, 42], [20, 42], [58, 30]].forEach(([dx, dy]) => g.append(line(cx, cy - 12, cx + dx, cy + dy, true), s("rect", { x: cx + dx - 13, y: cy + dy - 7, width: 26, height: 16, rx: 3, fill: "var(--sheet)", stroke: "var(--ink-3)" }))); g.append(...node(cx, cy - 12, "agent", true, 17)); }
      if (kind === "route") { g.append(...node(cx - 60, cy, "route", true, 17)); [[-35], [0], [35]].forEach(([dy]) => g.append(line(cx - 44, cy, cx + 2, cy + dy), ...node(cx + 12, cy + dy, "s"), line(cx + 25, cy + dy, cx + 58, cy))); g.append(...node(cx + 66, cy, "join")); }
      if (kind === "custom") { const pts = [[-62, -24], [-12, -24], [38, -24], [38, 26], [-12, 26]]; pts.slice(0, -1).forEach((p, k) => g.append(line(cx + p[0], cy + p[1], cx + pts[k + 1][0], cy + pts[k + 1][1]))); g.append(s("rect", { x: x + 8, y: y + 46, width: W - 16, height: H - 56, rx: 8, fill: "none", stroke: dec, "stroke-width": 2.4, "stroke-dasharray": "5 4" })); pts.forEach((p, k) => g.append(...node(cx + p[0], cy + p[1], k === 2 ? "agent" : "step", false, 12))); }
      svg.append(g);
    });
    svg._nodes = {}; svg._links = [];
    svg.querySelectorAll(".box").forEach((g) => (svg._nodes[g.dataset.id] = g));
    return svg;
  }

  /* ---------------------------------------------------------------- the Atlas page */
  function page(root) {
    let cur = MM.atlasStart || "system";
    MM.atlasStart = null;
    root.append(h("div", { class: "row", style: "align-items:baseline" }, h("h1", null, "Architecture Atlas"), h("span", { class: "faint" }, "the lay of the land, always in view")),
      h("p", { class: "muted reading", style: "margin:8px 0 14px" }, "The whole system on one page, then zoom in. Every box says what it is and which station teaches it. Press play to follow one request through a blueprint."));
    const chips = h("div", { class: "chips-scroll", style: "margin-bottom:12px" });
    const legend = h("div", { class: "legend", style: "margin:10px 0" }, Object.entries(KIND).map(([k, v]) => h("span", null, h("i", { style: `border-color:${v.col};${k === "built" ? "border-style:dashed" : ""}` }), v.label)));
    const grid = h("div", { class: "atlas-grid" });
    const left = h("div"), right = h("div", { class: "stack", style: "--gap:12px" });
    grid.append(left, right);
    root.append(chips, grid);
    ATLAS_ORDER.forEach((k) => { const b = h("button", { class: "chip", "aria-pressed": String(k === cur), type: "button" }, ["L0", "L1", "L2"][BP[k].level] + " · " + BP[k].title); b.onclick = () => { cur = k; chips.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); show(); }; chips.append(b); });
    let timer = null;
    MM.cleanup = () => clearInterval(timer);
    function show() {
      clearInterval(timer);
      const bp = BP[cur];
      left.innerHTML = ""; right.innerHTML = "";
      const svg = draw(bp, {});
      const panel = h("div", { class: "card" });
      const cap = h("div", { class: "callout", "aria-live": "polite" }, "Press play to follow one request, or tap any box.");
      left.append(h("div", { class: "bp" }, svg), legend, h("p", { class: "muted", style: "font-size:.95rem" }, bp.note));
      let step = -1;
      const playBtn = h("button", { class: "btn primary small" }, MM.icon("play"), "Play");
      const prev = h("button", { class: "iconbtn", "aria-label": "Previous step" }, MM.icon("back")), nextB = h("button", { class: "iconbtn", "aria-label": "Next step" }, MM.icon("next"));
      const go = (i) => {
        step = MM.clamp(i, 0, bp.flow.length - 1);
        const [nid, text] = bp.flow[step];
        const lit = [nid];
        if (step > 0) lit.push(bp.flow[step - 1][0]);
        light(svg, lit, new Set(step > 0 ? [bp.flow[step - 1][0] + ">" + nid] : []));
        cap.innerHTML = ""; cap.append(h("strong", null, `Step ${step + 1} of ${bp.flow.length}. `), text);
        if (bp.swim) { const r = REQ[step]; cap.append(" ", h("a", { href: "#" + r[3] }, "Taught in " + C.byId[r[3]].code)); }
      };
      playBtn.onclick = () => {
        if (timer) { clearInterval(timer); timer = null; playBtn.lastChild.textContent = "Play"; return; }
        if (step >= bp.flow.length - 1) step = -1;
        go(step + 1);
        playBtn.lastChild.textContent = "Pause";
        timer = setInterval(() => { if (step >= bp.flow.length - 1) { clearInterval(timer); timer = null; playBtn.lastChild.textContent = "Play"; return; } go(step + 1); }, MM.reducedMotion() ? 3200 : 2400);
      };
      prev.onclick = () => go(step - 1); nextB.onclick = () => go(step + 1);
      if (bp.flow.length) right.append(h("div", { class: "card" }, h("div", { class: "row" }, h("span", { class: "eyebrow" }, "Follow a request"), h("span", { class: "grow" }), prev, playBtn, nextB), h("div", { style: "margin-top:10px" }, cap)));
      right.append(panel);
      describe(panel, bp, null);
      svg.addEventListener("click", (e) => { const g = e.target.closest(".box"); if (g) select(g.dataset.id); });
      svg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { const g = e.target.closest(".box"); if (g) { e.preventDefault(); select(g.dataset.id); } } });
      function select(nid) { light(svg, [nid]); describe(panel, bp, nid); }
      right.append(threeQuestions(svg, bp));
    }
    show();
  }
  function describe(panel, bp, nid) {
    panel.innerHTML = "";
    if (!nid) { panel.append(h("div", { class: "eyebrow" }, "Level " + bp.level + " · " + bp.title), h("h3", { style: "margin:6px 0" }, bp.q), h("p", { class: "muted", style: "font-size:.95rem" }, "Tap a box to see what it is, what kind of part it is, and where it is taught.")); return; }
    if (bp.swim) { const i = +nid.slice(3), r = REQ[i]; panel.append(h("div", { class: "eyebrow" }, "Arrow " + (i + 1) + " · " + LANES[r[0]] + " → " + LANES[r[1]]), h("p", { style: "margin:6px 0" }, r[2]), h("a", { href: "#" + r[3] }, "Taught in " + C.byId[r[3]].code + " · " + C.byId[r[3]].title)); return; }
    if (bp.patterns) { const map = { one: ["a07", "One agent with every tool. Simple, but tool choice and context get harder as the list grows."], sub: ["a07", "Subagents: the main agent stays in control and calls specialists as tools. Each specialist starts fresh and returns a short answer."], hand: ["a07", "Handoffs: control passes from agent to agent; the user may talk to whoever is active now."], skill: ["a07", "Skills: one agent stays in control and loads specialist instructions and knowledge only when needed."], route: ["a07", "Router: a classifying step decides which specialists run, then their results are combined."], custom: ["a07", "Custom workflow: your own graph decides, mixing fixed steps with agent steps."] }; const [m, t] = map[nid]; panel.append(h("p", null, t), h("a", { href: "#" + m }, "Taught in " + C.byId[m].code)); return; }
    const n = bp.nodes.find((x) => x.id === nid);
    if (!n) return;
    panel.append(h("div", { class: "row" }, h("span", { class: "pill", style: `border:1px solid ${KIND[n.kind].col}` }, KIND[n.kind].label)), h("h3", { style: "margin:8px 0 4px" }, n.label), n.sub ? h("p", { class: "muted" }, n.sub) : null,
      n.mod ? h("a", { href: "#" + n.mod, class: "btn small", style: "margin-top:10px" }, "Open " + C.byId[n.mod].code + " · " + C.byId[n.mod].title, MM.icon("next")) : null);
  }
  function threeQuestions(svg, bp) {
    if (bp.swim || bp.patterns) return h("span");
    const card = h("div", { class: "card" }, h("div", { class: "eyebrow" }, "Three questions for every blueprint"));
    const qs = [["Which parts are probabilistic?", (n) => n.kind === "llm"], ["What was built in advance?", (n) => n.kind === "built"], ["Where does information live?", (n) => n.kind === "data"]];
    qs.forEach(([q, f]) => { const b = h("button", { class: "btn small", style: "margin:6px 6px 0 0" }, q); b.onclick = () => light(svg, bp.nodes.filter(f).map((n) => n.id)); card.append(b); });
    card.append(h("button", { class: "btn small ghost", style: "margin-top:6px", onclick: () => light(svg, []) }, "Clear"));
    return card;
  }

  /* mini-map for a module header: the whole system, with this station's part glowing */
  function mini(el, modId, partsEl) {
    const f = FOCUS[modId];
    const svg = draw(BP.system, { compact: true, lit: f ? f[2] : [] });
    el.append(svg);
    if (partsEl && f) partsEl.textContent = f[2].map((n) => (BP.system.nodes.find((x) => x.id === n) || {}).label).filter(Boolean).join(" · ");
  }
  /* "Where we are": zoom from the whole system to this station's blueprint */
  function zoom(el, modId) {
    const f = FOCUS[modId] || ["system", [], []];
    const a = draw(BP.system, { compact: true, lit: f[2] });
    const b = draw(BP[f[0]], { lit: f[1] });
    const btn = h("button", { class: "btn small", onclick: () => { MM.atlasStart = f[0]; MM.go("atlas"); } }, "Open in the Atlas", MM.icon("next"));
    el.append(h("div", { class: "two", style: "margin-top:12px;align-items:start" },
      h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "Level 0 · the whole system"), h("div", { class: "bp" }, a)),
      h("div", null, h("div", { class: "eyebrow", style: "margin-bottom:6px" }, "Level " + BP[f[0]].level + " · " + BP[f[0]].title), h("div", { class: "bp" }, b))), h("div", { class: "row", style: "margin-top:8px" }, btn));
  }

  MM.atlas = { page, mini, zoom, draw, light, BP };
})();
