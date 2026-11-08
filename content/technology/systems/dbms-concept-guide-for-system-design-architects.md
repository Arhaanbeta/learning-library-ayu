---
id: tech-dbms-concept-guide
title: "DBMS Concept Guide for System Design Architects"
summary: "A database design is a set of promises, and these nine concepts are how you keep them."
minutes: 45
source: "https://claude.ai/artifact/XWe5y3CHUE5AeBeRyFe99k"
---
## The big picture

A database design is a set of promises, and these nine concepts are how you keep them.

A DBMS (Database Management System, the software that stores data and finds it again, such as PostgreSQL) promises that your data is correct, easy to find, and safe. The real world fights those promises with more users, more data, and broken machines.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> The nine concepts · three questions, read from top to bottom<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Read the picture from top to bottom. A clean shape makes the truth easier to protect. Clear rules about truth make it possible to copy and split data without confusion.

One idea sits under everything: every choice is a trade-off (you get one good thing by giving up another). An architect does not ask, "What is the best database?" An architect asks, "What must never go wrong here, and what can we afford to give up?"

Use cases with a company name come from that company's own public writing, and the links are at the end. Use cases marked "Typical pattern" are common industry designs, not claims about one company.

## 1. Data modeling

Data modeling means deciding what things exist in your business, how they connect, and which rules must always stay true. It comes first because it is the hardest decision to change later.

**The simple picture.** Think of a school office. Each student has one file, and every class register only points to that file. If the phone number were written in ten registers, one day you would update nine and forget one.

**The words you need**

- Entity (a real thing you store, such as a customer or an order).
- Attribute (one fact about an entity, such as a phone number).
- Relationship (how entities connect, such as "one customer has many orders").
- Schema (the agreed shape of the data: what exists and what type each fact is).
- Table (a grid of data), row (one record) and column (one kind of fact).
- Primary key (a value that names exactly one row, such as Order 101).
- Foreign key (a value in one row that points to a row in another table).
- Invariant (a rule that must always be true, such as "every order has a customer").

**Why it works.** Normalization (storing each fact in only one place) protects truth, because no second copy can disagree. Denormalization (copying a fact on purpose) protects read speed, because you avoid a join (combining rows from two tables).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Normalized and denormalized data · what each one makes easy and costly<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Neither shape wins. Keep one source of truth (the one place that decides what is correct). Then add copies only for reads you have measured, and decide how each copy stays updated.

**Match the model to the shape of your questions**

| Model | Everyday picture | Good for |
| --- | --- | --- |
| Relational (tables linked by keys) | Connected registers with strict rules | Orders, payments, stock |
| Document (one nested record) | A complete form in one folder | Product pages, user profiles |
| Key-value (a key returns one value) | A locker number opens one locker | Sessions, shopping carts |
| Wide-column (rows grouped and sorted by a key) | Drawers of sorted cards | Chat history, sensor readings |
| Graph (dots joined by lines) | A map of who knows whom | Friends of friends, fraud rings |

### Industry use cases

**Bank ledger (Typical pattern).** A bank does not treat "balance = 850" as the real truth. The truth is a list of money movements, and the balance is calculated from them. This gives an audit trail (a full history that shows how you reached today's number), which is what a bank needs in a dispute.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Bank ledger · three entries add up to one balance<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Online shop order (Typical pattern).** A product's price may change tomorrow, but the order must keep the price the customer paid. So the order stores its own copy of the price and delivery address. This copy is correct design, not messy data, because it records a fact at one moment. Always ask: "Do I need the current truth, or the truth at that moment?"

**[Discord](https://discord.com/blog/how-discord-stores-trillions-of-messages) chat history.** Discord's main question is "show messages in this channel, in time order." So it stores messages by channel plus a bucket (a fixed window of time), which keeps related messages together. The model is built around the question. The price is that a very busy channel creates one overloaded group, which we return to in Concept 8.

**Professional network (Typical pattern).** "Who is a friend of a friend?" means walking many links. In a relational model, each extra step adds another join and more work. A graph model stores links directly, so walking them is the natural operation. The question decides the model.

### If someone challenges you

**"Normalization is always correct."** It protects writes, but reads pay for it. Normalize the source of truth, then add measured copies for heavy reads.

**"NoSQL has no schema, so modeling does not matter."** NoSQL means databases outside the classic table model. The schema still exists. It moves from the database into your application code, where every reader must understand it. Modeling matters even more, because you must know your questions earlier.

**Remember:** Model the truth first. Then model the questions.

## 2. Schema evolution

Schema evolution means changing the shape of your data while old code, new code and old data all live together. The goal is a change that users never notice and that you can undo.

**The simple picture.** Imagine rebuilding a railway platform while trains keep running. You build the new platform beside the old one, move passengers slowly, and close the old one last.

**The words you need**

- Migration (a planned change to the data's shape or location).
- Downtime (time when the system is not available to users).
- Table lock (the database blocks others from using a table during some work).
- Backward compatibility (new code can read old data).
- Forward compatibility (old code can read new data without breaking).
- Expand and contract (add the new shape first, and remove the old shape last).
- Dual write (saving every change to both the old and the new shape).
- Backfill (copying existing old data into the new shape).
- Cut-over (the moment the system switches to the new shape).

**Why it works.** You cannot update every server in the same second. During a release, old and new code run together, so both must understand the data. Expand and contract turns one dangerous jump into small steps you can reverse.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Expand and contract · five stages, each one reversible until the end<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Industry use cases

**[Stripe](https://stripe.com/blog/online-migrations) subscriptions.** At first, each customer had at most one subscription, stored inside the customer record. Later, customers needed many, and each subscription change meant updating the whole customer record. Stripe moved hundreds of millions of subscriptions into their own table using the stages above.

Stripe compared old and new reads on live traffic and raised an alert on any difference. At one second per object, 100 million objects would take over three years in sequence, so the copy ran in parallel. It never changed more than a few hundred lines of code at one time.

**[GitHub gh-ost](https://github.com/github/gh-ost).** Changing a huge table directly in MySQL (a popular relational database) can hurt the live site. So gh-ost builds a ghost table (an empty twin table in the new shape) and copies rows slowly. It also follows the binary log (the database's ordered record of changes) to catch new changes, and swaps the tables at a chosen time.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> GitHub gh-ost · how a ghost table replaces a live table<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

GitHub keeps testing this tool on replicas (read-only copies of the database). So trust comes from repeated proof, not from hope.

**Mobile banking app (Typical pattern).** Not all users update their phone app. Old versions may call your API (the doorway other software uses) for months. So you add the new field, keep filling the old field, and remove it only when old-version traffic is close to zero.

**Event streams (Typical pattern).** An event (a stored record that something happened) may be read years later. A schema registry (a central library of allowed event shapes) can stop an unsafe change before release. Adding an optional field with a default value is usually safe. Reusing an old field with a new meaning is not.

### If someone challenges you

**"Just run the change at night."** Some changes are instant, but others rewrite or lock a huge table. A global product may have no quiet night. Stripe says it performs infrastructure upgrades online (while the service keeps running), not in planned maintenance windows.

**"Keeping two shapes is wasteful."** The overlap is your insurance. While both shapes are correct, a bad release can go back without losing data.

**"We tested it, so one big switch is fine."** Tests cannot copy every real record and real traffic pattern. That is why teams compare old and new results on live reads before they switch.

**Remember:** Never break the old until nothing needs it.

## 3. Access-path design

An access path is the route a database takes to find your data. Design it around your most important questions, because the wrong route can turn a quick answer into a long wait.

**The simple picture.** To find one word in a book, you could read every page. Or you could open the index at the back, which sends you straight to the page. A database has the same two choices.

**The words you need**

- Query (a question you ask the database).
- Full table scan (reading every row to find the answer).
- Index (a separate sorted structure that says where rows are).
- B-tree (a balanced, sorted tree index, good for exact matches and ranges).
- LSM tree (Log-Structured Merge tree, which saves writes quickly and sorts them later).
- Composite index (an index on several columns, in a fixed order).
- Selectivity (how few rows a filter leaves; customer ID leaves few, country leaves many).
- Query planner (the part of the database that chooses the route).
- Write amplification (one change causing several disk writes, such as the table plus its indexes).

**Why it works.** An index is sorted, so each step throws away most of the remaining data. That is why one row among hundreds of millions can be found in a few hops. The cost is that every write must also update every index.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Full table scan and index lookup · same question, different route<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Column order matters.** A composite index works like a phone book sorted by surname, then first name. You can quickly find "Sharma" or "Sharma, Asha." You cannot quickly find everyone named "Asha."

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Composite index on customer, then date · one question is fast, one is slow<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Match the question to the path**

| Question shape | Best access path | Example |
| --- | --- | --- |
| Exact ID | Hash index (exact matches only) or B-tree | "Get order 9001" |
| Range or sorted list | B-tree | "Orders from the last 30 days" |
| Words inside text | Inverted index (each word lists where it appears) | "Red running shoes" |
| Near a place | Geospatial index (an index built for map locations) | "Drivers near me" |
| Totals across many rows | Columnar storage (each column stored separately) | "Sales by month" |
| Very heavy writes | LSM tree | "Sensor readings" |
| Costly question asked often | Materialized view (a saved, precomputed answer) | "Today's top sellers" |

### Industry use cases

**Order history page (Typical pattern).** The question is "Show this customer's recent orders." A composite index on customer and date keeps one customer's orders together, already sorted. The database reads one small slice, not the whole table.

**[Uber H3](https://www.uber.com/kr/en/blog/h3/).** Uber places location events into hexagon-shaped cells, and each cell has an ID. It then measures supply and demand per cell to calculate surge pricing (higher prices when demand beats supply). The clever move is turning a hard map question into a simple ID question. Hexagons help because every neighbouring centre is the same distance away.

**Online shop search (Typical pattern).** A B-tree cannot easily answer "red running shoes," because those words may appear anywhere in a description. So shops copy product data into a search engine with an inverted index. The main database stays the source of truth, and the search copy may be slightly behind.

**Business reports (Typical pattern).** "Total sales by region" may need 2 of 50 columns across a billion rows. Row storage loads whole rows, but columnar storage reads only those 2 columns. This is why companies separate OLTP (many small live actions, such as placing an order) from OLAP (big analysis questions, such as yearly sales).

### If someone challenges you

**"Index every column to be safe."** Every index uses space and slows every write. An index is a read gain that writes pay for. Build indexes for real questions and remove unused ones.

**"We added an index, but the query is still slow."** Check the column order, the selectivity, and the planner's statistics (its notes about the data). If the filter matches half the table, a scan may truly be cheaper.

**"A cache will fix slow queries."** A cache (a fast temporary copy) is another access path, and it has its own stale-data problem. Fix the route first, then cache what is still costly.

**Remember:** Know your questions before you build your roads.

## 4. Transaction boundaries

A transaction boundary is the line around work that must succeed or fail as one unit. Inside the line, the database protects you. Outside it, you must build your own safety plan.

**The simple picture.** At a shop counter, you hand over money and receive the goods. Nobody accepts a result where the money moved but the goods did not. A transaction makes that swap one single event.

**The words you need**

- Transaction (a group of changes treated as one unit).
- Atomicity (all the changes happen, or none do).
- Commit (the final "yes, save it all").
- Rollback (undoing all changes in an unfinished transaction).
- ACID (four classic promises: Atomicity, Consistency, Isolation and Durability).
- Microservice (a small separate service that owns its own data).
- Two-phase commit (a coordinator asks everyone to prepare, then tells everyone to commit).
- Saga (a chain of small transactions, each with a matching undo step).
- Compensating action (a later action that cancels an earlier effect, such as a refund).
- Outbox pattern (saving a message in the same transaction as the business data).
- Idempotency (doing an action twice has the same effect as doing it once).

**Why it works.** A failure can strike between any two steps. Atomicity removes that in-between state, so the rest of the system never handles half-finished work.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Bank transfer in one transaction · two outcomes, never a half-finished one<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Keep the boundary small.** A transaction may hold locks (marks that make others wait) until it ends. If you call a slow payment provider inside it, other users may wait on someone else's network. Do slow work outside, and keep the database part short.

**Know where the boundary stops.** A normal transaction ends at the edge of one database. The moment work crosses two databases or services, you need a different tool.

### Industry use cases

**Bank transfer in one database (Typical pattern).** Taking money from one account and adding it to another happens in one transaction. A crash in the middle causes a rollback, so money is never lost or invented. The boundary is natural here because both accounts live in one database.

**Food delivery order (Typical pattern).** Orders, payments, restaurants and riders are often separate microservices with separate databases. One transaction cannot cover them all, so the flow becomes a saga. If no rider is found, the system cancels at the restaurant, refunds the payment, and cancels the order.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Food delivery saga · a failed fourth step triggers three undo steps<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Order confirmation message (Typical pattern).** After saving an order, a shop must tell its email and warehouse systems. If the app crashes after saving but before sending, the message is lost forever. The outbox stores the order and the message together, and a relay delivers it to a message broker (a post office between services).

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Outbox pattern · the risky way and the safe way<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**[Stripe](https://docs.stripe.com/api/idempotent_requests) safe retries.** A network timeout creates a scary question: "Did the payment happen?" Stripe lets a client send an idempotency key (a unique ID for one intended action). In its v1 API, Stripe saves the first result, and a repeat with the same key gets that same result. So a retry does not perform the action twice.

### If someone challenges you

**"Use two-phase commit everywhere."** If the coordinator fails at the wrong moment, participants may wait while holding locks. Every participant must also be available, so the weakest one limits the whole flow. It fits tightly controlled databases better than services owned by different teams.

**"A saga is the same as a transaction."** It is not. Others can see the middle state, such as a paid order with no rider. A refund also does not erase the charge; it adds a new event. So you must design the business meaning of every undo.

**"We need exactly-once message delivery."** Across an unreliable network, the normal design is at-least-once delivery (a message may arrive more than once). Make the receiver idempotent, and the final effect happens once.

**Remember:** Draw the line around what must never be half-done. Keep it small, and plan for everything outside it.

## 5. Consistency semantics

Consistency semantics are the exact promise about what a reader will see after a write. The word "consistency" has several meanings, so an architect must always say which promise is meant.

**The simple picture.** A head office changes a price and posts the new list to its branches. For a while, one branch shows the new price and another shows the old one. The design question is how long that gap may last, and who may see it.

**One word, three meanings**

| Meaning | Question it answers | Example |
| --- | --- | --- |
| ACID consistency | Do our business rules stay true? | A balance never goes below zero |
| Isolation | How do people working at the same time affect each other? | Two buyers, one last item (Concept 6) |
| Replica consistency | How fresh is the copy I am reading? | Seeing your new profile photo |

This concept covers the third meaning.

**The words you need**

- Leader (the copy that accepts writes) and follower (a copy that receives changes from the leader).
- Replication lag (the delay before a copy receives a change).
- Stale read (reading an old value from a copy that has not caught up).
- Linearizability (the system acts like one copy, and reads see the latest finished write).
- Causal consistency (effects never appear before their causes).
- Read-your-writes (you always see your own changes).
- Monotonic reads (your view never jumps backward in time).
- Eventual consistency (all copies agree later, if writes stop).
- Network partition (machines are running but cannot reach each other).
- Availability (the system still answers requests).
- Latency (the time one request takes).

**Why it works.** Messages between machines take time, so distant copies cannot change at the same instant. For a strong promise, machines must wait and agree before they answer. A weaker promise answers sooner but may show older data.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Replica consistency promises · from strongest to weakest<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Read-your-writes and monotonic reads are promises to one user, not to everyone. They are often the cheapest way to stop a system from feeling broken. Neither is strictly stronger than the other, so read this ladder as a rough guide.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A stale read · the leader has the new value, the follower does not<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**The forced choice.** The CAP theorem covers Consistency, Availability and Partition tolerance (staying up during a network split). It says a cut-off copy must choose during a partition. It can refuse the request, or answer with data that may be out of date. PACELC (an extension of CAP) adds the normal day: even without failure, you still trade latency against consistency.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> CAP theorem · the choice during a network partition<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

### Industry use cases

**Bank balance and the last seat (Typical pattern).** Two cash machines must not both approve the last 100 from one account. When a wrong answer means lost money or a double sale, choose a strong promise. A short error is better than a false yes.

**[Amazon Dynamo](https://www.cs.princeton.edu/courses/archive/fall15/cos518/papers/dynamo.pdf) shopping cart.** Amazon wanted customers to keep adding items even during disk, network or data centre failures. So Dynamo keeps accepting writes and later merges different versions of the cart. An "add to cart" is not lost, but a deleted item can reappear. A deleted item that comes back is annoying; a cart that refuses your item can lose the sale.

**[Google Spanner](https://docs.cloud.google.com/spanner/docs/true-time-external-consistency).** Spanner spreads transactions across machines and regions, yet behaves as if they ran one at a time. It calls this external consistency (transaction order matches real-world time order). If you deposit and then withdraw, nobody sees the withdrawal first. Its TrueTime clock service makes this possible, which shows that strong global promises need serious infrastructure.

**Social media feed (Typical pattern).** A like count can be slightly behind, and nobody is harmed. But if your new comment disappears on refresh, you will think the app failed. So a feed can use eventual consistency for everyone, plus read-your-writes for you. One product can make different promises for different features.

### If someone challenges you

**"Eventual consistency means the data is wrong."** It means copies may differ for a while, then agree if writes stop. It gives no time limit, so you must measure replication lag. Conflicts also need a clear merge rule.

**"CAP means pick any two of three."** Network failures are not optional, so you cannot simply give up partition tolerance. The real choice appears during a partition: keep answering, or keep one truth.

**"Make everything strongly consistent."** Strong promises add waiting and reduce availability during failures. Choose per feature: strong for the payment, weaker for the like counter.

**Remember:** Never say "consistent." Say who can see what, and when.

## 6. Concurrency control

Concurrency control is how a database lets many people work on the same data at once without silently damaging each other's work. The danger lives in the gap between reading a value and writing a new one.

**The simple picture.** Two shop workers each check the shelf and see one last phone. Both promise it to a customer. Each worker acted correctly, but together they created a broken promise.

**The words you need**

- Concurrency (many actions happening during the same period).
- Race condition (the result depends on who happens to go first).
- Isolation level (how much transactions may see of each other's work).
- Dirty read (reading a change that has not been committed).
- Lost update (one save silently overwrites another).
- Write skew (two people read the same facts, change different rows, and together break a rule).
- Pessimistic locking (block others before you start).
- Optimistic concurrency control (work freely, then check for a conflict when saving).
- MVCC (Multi-Version Concurrency Control, which keeps old versions so readers get a stable view).
- Snapshot (a frozen view of the data at one moment).
- Deadlock (two transactions wait for each other forever, so the database cancels one).
- Contention (many actions fighting for the same data).
- Serializable (the strongest level: the result matches some one-at-a-time order).

**Why it works.** Every tool here handles the gap in one of three ways. A lock closes the gap, a version check detects a change during the gap, and MVCC gives each reader a stable view.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A lost update · time moves from top to bottom<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Pessimistic locking, optimistic control and MVCC · three ways to protect the gap<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**What each isolation level protects you from**

| Isolation level | Stops dirty reads | Stops lost updates | Stops write skew |
| --- | --- | --- | --- |
| Read Committed | Yes | No | No |
| Snapshot Isolation | Yes | Yes | No |
| Serializable | Yes | Yes | Yes |

Product names differ. PostgreSQL's Repeatable Read refuses an update to a row changed after it began, so it stops lost updates. MySQL's Repeatable Read snapshot covers plain reads, while a write can act on newly committed rows. So check your own database's documentation.

### Industry use cases

**Flash sale (Typical pattern).** Thousands of buyers want a few items, so "read, then write" is dangerous. A conditional update (one single step: reduce stock only if stock is above zero) joins the check and the change. The next problem is contention on one busy row, so teams may split stock into several smaller counters.

**Cinema seat booking (Typical pattern).** The simplest guard is a unique constraint (a database rule that refuses duplicates) on show and seat, so the second booking fails. The customer's checkout time happens outside any lock, using a hold record with an expiry time. This follows Concept 4: keep the boundary small.

**Wiki page editing (Typical pattern).** A person may edit a page for 20 minutes, so a lock would block everyone. Instead, each page has a version number. If someone saved first, you see a conflict and merge your changes. Conflicts are rare, so optimistic control fits well.

**Hospital on-call rota (Typical pattern).** The rule is "at least one doctor stays on call." Two doctors each see two on call, and both leave. They changed different rows, so Snapshot Isolation sees no conflict. Serializable isolation, or a lock on a shared row, stops it.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Write skew in a hospital rota · each doctor acted correctly alone<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**[Notion](https://www.notion.com/blog/sharding-postgres-at-notion) and the price of MVCC.** MVCC lets a long report read a stable snapshot while sales continue. But old row versions must be cleaned up later. At Notion, PostgreSQL's VACUUM (the cleaner that removes dead row versions) began to stall, which pushed the team to split its database. MVCC is a trade, not a free gift.

### If someone challenges you

**"We use transactions, so we are safe."** A transaction gives you all-or-nothing, but not always full isolation. Many databases start at a weaker level, so lost updates and write skew can remain.

**"Just use Serializable everywhere."** It is the safest level, but transactions may wait or abort, and the app must retry. Under heavy contention, that costs real speed. Use it where a rule spans several rows.

**"Optimistic control is always faster."** Only when conflicts are rare. Under heavy conflict, work is thrown away again and again, and a short lock may be faster.

**Remember:** A transaction does not mean you are alone. Isolation decides how alone you are.

## 7. Replication

Replication means keeping copies of the same data on several machines. Copies give you survival, more read capacity, and data closer to users. Every copy also raises one hard question: who may accept writes?

**The simple picture.** A school keeps the official register in the office and gives copies to teachers. Reading a copy is easy. Trouble starts when the phone line fails and two people each believe they hold the official register.

**The words you need**

- Multi-leader (more than one copy accepts writes).
- Leaderless (several copies accept writes, with no single boss).
- Synchronous replication (the user waits until a follower confirms the change).
- Asynchronous replication (the user gets OK first, and followers copy later).
- Failover (moving the leader's job to another copy after a failure).
- Split-brain (two copies both act as the leader).
- Quorum (the minimum number of copies that must agree).
- Consensus (machines agreeing on one decision even when some fail; Raft is an example).
- Availability zone (a separate data centre area in one cloud region).

**Why it works.** Machines usually fail one at a time, not all together. So independent copies survive most failures. The hard part is not copying bytes; it is agreeing which copy holds the truth.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Single-leader, multi-leader and leaderless replication<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Synchronous and asynchronous replication · when the user gets OK<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**The quorum rule.** Suppose you have N copies, a write must reach W copies, and a read asks R copies. If R + W is greater than N, every read touches at least one copy with the latest write. That overlap is the whole trick.

### Industry use cases

**Product catalogue (Typical pattern).** Millions of people read, and few people write. Followers serve the reads, and the leader takes the writes. A product page may be a little behind for a moment, so checkout confirms the final price against the source of truth.

**[Amazon Aurora](https://aws.amazon.com/blogs/database/amazon-aurora-under-the-hood-quorum-and-correlated-failure).** Aurora keeps six copies across three availability zones. A write is complete when four copies confirm, and a read quorum is three. It can lose a whole zone and keep writing, and lose a zone plus one more copy without losing data.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Amazon Aurora quorum · shaded copies show one possible write group<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**[GitHub, October 2018](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/).** A network link was lost for 43 seconds, and automated failover moved the primary (another word for leader) to the US West Coast. The East side held a few seconds of writes that West never received. GitHub chose data integrity (keeping data correct) over a faster recovery, and service stayed degraded for 24 hours and 11 minutes.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> GitHub&#x27;s October 2018 incident · a brief cut became a long recovery<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Global chat product (Typical pattern).** Users in Asia and Europe both want fast writes, so each region gets a leader. Two people may then change the same item at the same moment. Last write wins (keep the newest timestamp) is simple, but it silently drops the older change. So the conflict rule is a product decision.

### If someone challenges you

**"Replication is our backup."** It is not. A bad delete is copied to every replica very quickly. Replication protects against machine failure, while backups protect against mistakes.

**"Add replicas to handle more writes."** Every replica must apply every write, so replicas add read capacity, not write capacity. To scale writes, you partition.

**"Failover is automatic, so we are safe."** With asynchronous replication, failover can drop confirmed writes or leave two truths. Automation must stop the old leader and must match what the application can support. Rehearse failover before you need it.

**Remember:** Copies are easy. Agreement is hard.

## 8. Partitioning

Partitioning means splitting one big dataset into smaller pieces so no single machine must hold or serve all of it. Your partition key is the key decision, because it decides what stays together and what gets separated.

**The simple picture.** A large library spreads books across floors. Split by subject, and one topic stays together. But if one floor holds every popular book, its staircase jams while the other floors stay empty.

**The words you need**

- Partition or shard (one piece of the data; a shard usually sits on its own database).
- Horizontal partitioning (splitting rows into groups).
- Vertical partitioning (splitting columns or whole tables apart).
- Partition key (the value that decides where a row lives).
- Range partitioning (splitting by sorted value, such as months).
- Hash partitioning (using a formula on the key to choose a piece).
- Consistent hashing (a hash method that moves only a small share of data when machines change).
- Logical shard (a small virtual piece) and physical shard (a real database that holds several of them).
- Hot partition (one piece gets far more traffic than the others).
- Rebalancing (moving pieces to spread the load).
- Scatter-gather (asking every shard and combining the answers).
- Cardinality (how many different values a field has).

**Why it works.** Replication copies all the data, so it mainly scales reads. Partitioning divides the data, so it scales storage and writes. Real systems usually do both, and any query that crosses partitions becomes slower and harder.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Range and hash partitioning · sample data shown for illustration<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Three tests for a good partition key**

1. High cardinality: many different values, so data can spread.
2. Even traffic: no single value receives most reads and writes.
3. Query fit: key questions include this value, and data used together stays together.

### Industry use cases

**[Notion](https://www.notion.com/blog/sharding-postgres-at-notion).** Notion is a team-based product, so it split data by workspace ID. That keeps related team data together. It used 480 logical shards on 32 physical databases. It chose 480 because it divides evenly by many numbers, so machines can be added in steps while shards stay balanced.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Notion&#x27;s sharding layout · 480 logical shards across 32 databases<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**[Instagram](https://instagram-engineering.com/1cf5a71e5a5c).** Instagram used several thousand logical shards, mapped in code to far fewer physical servers. A new server could take over some logical shards. This separates "where does this data belong?" from "which machine holds it today?"

**[Discord](https://discord.com/blog/how-discord-stores-trillions-of-messages) hot partitions.** Discord splits messages by channel and time bucket. A big server's announcement can send a huge wave of reads to one partition, which slows that node (one machine in the database cluster) and hurts other queries. Discord added data services with request coalescing (if many users ask for one row at once, the database gets one query). It later moved from 177 nodes on Cassandra to 72 nodes on ScyllaDB (two distributed databases), but said hot partitions can still happen.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Discord hot partition and request coalescing · bar heights are illustrative<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Logs and sensor data (Typical pattern).** Data arrives in time order, and old data is rarely read. Splitting by day lets you drop a whole old day in one quick action. But today's piece receives every write, so many systems combine device and day in the key.

### If someone challenges you

**"We should shard early to be ready."** Sharding makes joins, transactions and operations harder. First try better indexes, a larger machine, read replicas and archiving old data. Move when you see a clear signal, as Notion did when VACUUM began to stall.

**"Hashing removes hot keys."** Hashing spreads different keys. It cannot split the traffic of one key. One very popular channel is still one key, so you need caching, coalescing or a more detailed key.

**"A new database will fix this."** A better engine can raise the limit, but it cannot repair a poor key. Discord protected the database with a service layer because hot partitions could still exist.

**Remember:** Partition by how data is used together, not by how it looks.

## 9. Recovery and durability

Durability is the promise that saved data survives crashes. Recovery is how the system returns to a correct state after something goes wrong. Together, they decide whether a failure is a bad hour or a permanent loss.

**The simple picture.** A careful shopkeeper writes every sale in a notebook before putting money in the drawer. If the drawer spills, the notebook still tells the truth. A database has the same kind of notebook.

**The words you need**

- Memory (very fast, but erased when power is lost) and disk (slower, but it keeps data).
- Write-ahead log or WAL (an append-only diary saved to disk before the main data changes).
- fsync (a command that forces data from memory onto the physical disk).
- Checkpoint (a saved point that reduces how much log must be replayed).
- Backup (a separate older copy you can restore).
- Point-in-time recovery or PITR (restoring a backup, then replaying logs up to a chosen moment).
- RPO (Recovery Point Objective: how much recent data you can afford to lose).
- RTO (Recovery Time Objective: how long you can afford to be down).
- Restore drill (really restoring a backup to prove that it works).
- Failure domain (things that can fail together, such as one server rack or one zone).

**Why it works.** Changing many data files is slow, because the changes are spread across the disk. Adding to the end of one log is quick. So the database saves the log first, says OK, and updates data files later. After a crash, it replays the log.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> Write-ahead logging · the normal path and the crash path<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Durability has levels.** Data in memory is not durable. Data on one disk survives a restart, but not the loss of that disk. Always ask: "Saved where, and what could destroy all those copies together?"

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> RPO and RTO around a disaster · not to scale<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

**Match each failure to its protection**

| Failure | What protects you | Why |
| --- | --- | --- |
| Process or power crash | Write-ahead log | It replays committed work |
| Disk or machine dies | Replica | Another copy takes over |
| Zone or region is lost | Copy in another failure domain | The copy is away from the disaster |
| Bad delete or bad code | Backup and PITR | You can go back before the mistake |
| Silent data damage | Checksums (small fingerprints that reveal changed data) | The damage can be detected |

### Industry use cases

**[GitLab, January 2017](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/).** While repairing replication, an engineer wiped the data directory (the folder holding the database files) on the primary, believing it was the secondary (the standby copy). About 300 GB was removed before they stopped it. The regular backup had been failing silently, and its failure emails were being rejected. A snapshot taken for testing about six hours earlier became the rescue.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> GitLab&#x27;s recovery options on January 31, 2017<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

GitLab's own analysis found that nobody owned backup testing. One of its fixes was to assign an owner for data durability. The lesson: safety needs an owner, not only a tool.

**[GitHub, October 2018](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/).** GitHub took backups every four hours and tested the restore process daily. Even so, restoring multiple terabytes took hours, because data had to be transferred, decompressed, checked and loaded. A tested backup protects your data, but its size still sets your RTO.

**Payments and a blog (Typical pattern).** A payment system may aim for an RPO near zero, so it confirms writes in more than one zone before saying OK. A blog may accept losing an hour of comments at a lower cost. Stricter targets cost more, so each dataset should earn its target.

**Bad code release (Typical pattern).** At 14:03, a bug damages customer addresses, and replicas quickly copy the damage. PITR restores a separate copy to 14:02. The team compares the two copies and repairs only damaged rows, so new orders stay safe. Restoring over the live database would erase everything after 14:02.

### If someone challenges you

**"We have replicas, so we do not need backups."** A replica copies a bad delete or bad code. Only an older, separate copy lets you go back in time.

**"We have backups."** Ask when you last restored one, how long it took, and who owns the test. GitLab's backup failed silently until the day it was needed.

**"The database said committed, so it cannot be lost."** A commit is only as strong as its settings. Some systems allow faster commits that do not wait for the disk, and asynchronous failover can lose recent writes. Find out exactly what OK means in your setup.

**Remember:** Durability is a promise. A tested restore is the proof.

## Putting it together: one order, nine decisions

A strong design review asks these nine questions about every important piece of data. Here they are applied to one food delivery order.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> A food delivery order · colours match the three questions in the big picture<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

| Concept | Architect's question | Example decision |
| --- | --- | --- |
| 1. Data modeling | What is the truth, and what will people ask? | Keep a price snapshot; use a ledger for payments |
| 2. Schema evolution | How do we change this without stopping? | Add the tip field through expand and contract |
| 3. Access paths | Which routes do the top questions need? | Index customer and date; use a geospatial index for riders |
| 4. Transaction boundaries | What must never be half-done? | Save order and outbox together; run the full flow as a saga |
| 5. Consistency semantics | Who can see what, and when? | Strong for payment; read-your-writes for order status; eventual for ratings |
| 6. Concurrency control | What if two people act at once? | Use a conditional update so only one rider wins |
| 7. Replication | Which copies exist, and who accepts writes? | Synchronous copy across zones for payments; read replicas for menus |
| 8. Partitioning | Which key keeps related data together? | Split orders by city, and plan for dinner-time hot partitions |
| 9. Recovery and durability | What can we lose, and how fast must we return? | RPO near zero for payments; run regular restore drills |

### Drill yourself

Answer each one aloud in plain words. If you get stuck, reread the concept in brackets.

1. A customer changes their address. Should old orders show the new address? (Concept 1)
2. A mobile app uses a column you want to rename. What is your safe order of steps? (Concept 2)
3. An index on customer and date exists, but "all orders in March" is slow. Why? (Concept 3)
4. A payment succeeds, but saving the order fails. What design handles this? (Concept 4)
5. A user saves a profile and sees old data after refreshing. Which promise is missing? (Concept 5)
6. Two admins approve one refund at the same moment. What goes wrong, and what stops it? (Concept 6)
7. Why do more read replicas not help a write-heavy system? (Concept 7)
8. One very popular account overloads one shard. Why does hashing not fix it? (Concept 8)
9. A bad delete reached every replica. What saves you, and how quickly? (Concept 9)

## Sources

Checked on November 3, 2026.

- [How Discord Stores Trillions of Messages](https://discord.com/blog/how-discord-stores-trillions-of-messages), Discord
- [Online migrations at scale](https://stripe.com/blog/online-migrations), Stripe
- [Idempotent requests](https://docs.stripe.com/api/idempotent_requests), Stripe API documentation
- [gh-ost](https://github.com/github/gh-ost), GitHub
- [October 21 post-incident analysis](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/), GitHub
- [H3: Uber's Hexagonal Hierarchical Spatial Index](https://www.uber.com/kr/en/blog/h3/), Uber
- [Dynamo: Amazon's Highly Available Key-value Store](https://www.cs.princeton.edu/courses/archive/fall15/cos518/papers/dynamo.pdf), Amazon
- [Spanner: TrueTime and external consistency](https://docs.cloud.google.com/spanner/docs/true-time-external-consistency), Google Cloud
- [Amazon Aurora under the hood: quorums and correlated failure](https://aws.amazon.com/blogs/database/amazon-aurora-under-the-hood-quorum-and-correlated-failure), AWS
- [Herding elephants: Lessons learned from sharding Postgres at Notion](https://www.notion.com/blog/sharding-postgres-at-notion), Notion
- [Sharding & IDs at Instagram](https://instagram-engineering.com/1cf5a71e5a5c), Instagram Engineering
- [Postmortem of database outage of January 31](https://about.gitlab.com/blog/postmortem-of-database-outage-of-january-31/), GitLab

* [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html), PostgreSQL documentation
* [Consistent Nonlocking Reads](https://dev.mysql.com/doc/en/innodb-consistent-read.html), MySQL documentation
