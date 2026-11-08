---
id: math-number-line-lab
title: "Number Line Lab — Phase 1 Blueprint"
summary: "This blueprint commits to one model — every number is a size plus a direction, and every minus sign is a flip of something — and derives every sign rule from it."
minutes: 75
source: "https://claude.ai/artifact/7L8Lqanmam7gzcmRh3c5Ym"
---
## Before you read

This blueprint commits to one model — every number is a size plus a direction, and every minus sign is a flip of something — and derives every sign rule from it. Nothing below asks the child to memorise.

**One correction to the brief.** §6 of the brief calls 8 + (−7) and 8 − (−7) a pair with the "same numeric result". They give 1 and 15. I keep them as the one-symbol contrast they really are, and add 8 − 7 (= 1) and 8 + 7 (= 15) so honest same-result pairs exist too. The four together form the *subtraction square* used in §3 and §6.

**Three refinements you may want to veto.**

- "×(−1) flips" is not an axiom here. It is derived from the distributive law first; the double-flip picture comes after the proof (§2.5, §5.2).
- Division uses your equation b × c = a literally: b copies of the trip c make a. The quotient is therefore a trip the token walks, so the landing point always equals the answer. The other reading (how many copies of b?) appears as a check.
- The step schema keeps your six fields exactly and adds seven optional ones that the six cannot express (§6.1).

**Words the child will use.** *Place* (a position), *trip* (a movement), *size* (magnitude), *flip* (a 180° reversal), *count* (how many copies).

**Version 1 limits at a glance.**

| Limit | v1 behaviour |
| --- | --- |
| Operands and start | Integers, size 0 to 999 |
| Division | Animated only when the quotient is a whole number; otherwise the exact fraction is shown with a v1 notice |
| Expression shape | One operation, A op B, from a chosen start |
| Language | English |
| Target | Chrome desktop; tablets 768 px and wider; phones best effort |
| Persistence | None; nothing is stored between sessions |

## 1. Educational diagnosis

He memorises because his only working model of number is *how many*, and in that model a negative number, subtracting a negative and a negative count all mean nothing. So the minus sign becomes a decoration, the arithmetic is done on sizes, and a rule picks the sign afterwards.

For a bright child this is a rational trade. Rules are fast and rewarded, and the explanations usually offered (debts, "the enemy of my enemy") contradict each other, so a sharp mind trusts the rule over the story. The replacement therefore has to be faster than the rule and also be a proof.

| Gap | What he does that shows it | Design piece that closes it |
| --- | --- | --- |
| Sign treated as decoration; sign conflated with size | Works with 8 and 7, gets 1 or 15, then picks a sign by rule | Every number is entered as a size field plus a direction toggle; trips are drawn with length = size and arrowhead = direction; every label carries its sign (+8, never 8) |
| One glyph doing three jobs: sign of a number, subtract, "opposite of" | Counts minus signs on the page, so −3 − 4 becomes +7 | Each flip is animated on its own with a cause label (flip: −7 is negative / flip: subtracting); operator and signs live in separate controls; "a flip of what?" recurs in every stage |
| Subtraction learned as take-away | Cannot say what 8 − (−7) means; believes 3 − 8 is impossible, or 5 | Subtraction is defined as the undo of addition; undoing a trip means walking it backwards; a second picture shows a − b as the trip from b to a |
| Places and movements conflated | Treats 8 and −7 in 8 + (−7) as the same kind of thing; mixes up where he lands with the answer | Places are dots on the line, trips are arrows in lanes above it; the start-position control shows the answer (a trip) does not depend on the start |
| Multiplication known only as "groups of" | "Negative three groups" means nothing, so (−)(−) = + is accepted on authority | Positive counts are copies; a negative count is derived from the distributive law; (−3) × (−4) is proved with the brief's distributive derivation |
| Laws seen as facts about positive numbers, not as commitments | Has no idea why negatives were given these rules, so they feel arbitrary | Narration calls the laws "rules we refuse to break" and shows each sign result as the only number that keeps them true |
| Four unrelated rule tables | Holds about twelve rules; the addition rules look nothing like the multiplication rules | One theorem produces all of them: count the flips on each trip (§2.4) |
| No self-check | Cannot catch his own error | Every storyboard ends with a check by the inverse operation or by a second route |

The deepest gap, for an IMO aspirant, is the sixth row. He has never seen that new numbers get their behaviour from the laws we decide to keep. The (−3) × (−4) stage is framed as his first uniqueness proof: not "this is the answer" but "no other answer is possible".

## 2. The Facing and Flipping model

Every number is a size and a direction. Addition walks trips as they are, every minus sign flips some trip, and the answer's direction comes from counting the flips on each trip. Each kind of flip is derived from a law, not declared.

### 2.1 Objects

| Object | Meaning | Drawn as |
| --- | --- | --- |
| Place | A position on the line | A dot or tick with its number |
| Trip | A movement with a size and a direction: the trip n goes n units right, −n goes n units left, 0 does not move and has no direction | An arrow in a lane above the line, labelled with its sign |
| Token | The walker: a place plus a facing | An arrow-shaped marker on the line |
| Count | How many copies of a trip (the first factor in A × B, the divisor in A ÷ B) | A number on the hop arcs, "× 3" |

One number names both a place and a trip: the place p is where the trip p ends when started at 0. Right is positive by convention; choosing left would mirror every picture and change no result.

### 2.2 Operations as the app defines them

| Operation | Definition | What the token does |
| --- | --- | --- |
| a + b | Walk the trip a, then the trip b, each as it is | Two walks; the operation flips nothing |
| −t (opposite) | The trip that undoes t: same size, flipped, so t + (−t) = 0 | One flip |
| a − b | The number c with c + b = a: the undo of adding b | Flip the trip b, then walk it |
| n × t, n ≥ 0 | n copies of the trip t, end to end; 0 × t = 0 | n equal hops |
| (−n) × t | Whatever keeps the distributive law true, which forces −(n × t) | Build n × t, flip it, walk it |
| a ÷ b | The number c with b × c = a, when exactly one exists | Flip the target if b < 0, split it into equal trips (as many as b's size), walk one |

### 2.3 The four causes of a flip

| Cause label | Comes from | Flips |
| --- | --- | --- |
| sign | A negative number is the opposite of a positive one | That number's own trip |
| subtract | Subtraction undoes addition | The trip being subtracted |
| factor | A negative count (proved in §2.5) | The whole product, or the target in division |
| undo | Inside a proof: an unknown trip must cancel a known one | The unknown trip |

Visual grammar: **a rotation of the token means a flip and nothing else**, and every rotation shows its cause label. Every new trip starts facing right ("born positive"); if the token was facing left, it changes with a crossfade, never a rotation.

### 2.4 The count-the-flips theorem

A trip flipped an even number of times points right; an odd number of times, left. Flips count only on the same trip, so flips on different trips never cancel.

| Expression | Trip | Flips on it | Direction and result |
| --- | --- | --- | --- |
| 8 − (−7) | the 7 | sign, subtract: 2 | right; lands on 15 |
| −3 − 4 | the 3, and separately the 4 | sign: 1; subtract: 1 | both left; lands on −7 |
| (−3) × (−4) | the product, 12 | sign of the 4, factor: 2 | right; 12 |
| 12 ÷ (−3) | the quotient | factor: 1 | left; −4 |
| (−12) ÷ (−3) | the quotient | sign of the 12, factor: 2 | right; 4 |

This is why "two minuses make a plus" is sometimes right and sometimes wrong: it holds only when both minuses flip the same trip. The app never gives the slogan as a reason; it shows when the slogan happens to be true.

### 2.5 Why each flip is forced

1. **Opposites are unique.** If t + x = 0 and t + y = 0, then x and y both lead from the end of t back to its start, so x = y.
2. **Subtraction flips.** a − b is the number that b, added to it, brings back to a. Try a + (−b): (a + (−b)) + b = a + ((−b) + b) = a + 0 = a. Only one number does that, so a − b = a + (−b). Picture: undoing "walk b" means walking b backwards.
3. **A negative count flips (the Flip Theorem).** (−n) × t + n × t = ((−n) + n) × t = 0 × t = 0. So (−n) × t undoes n × t, and by step 1 it is n × t flipped: (−n) × t = −(n × t).
4. **Two negatives.** Proved in the app by the brief's distributive derivation (§5.2). The double-flip reading then follows from step 3 with t = −m: (−n) × (−m) = −(n × (−m)) = −(−(n × m)) = n × m.
5. **Division.** b × c = a. If b < 0, then b × c is (size of b) × c flipped, so (size of b) × c = −a: flip the target, then split it into equal trips.
6. **Division by zero.** 0 × c = 0 for every c, so a ÷ 0 has no answer when a ≠ 0, and no single answer when a = 0.

### 2.6 Where the line hands off to algebra

The line shows trips, flips and copies directly. It cannot show "negative copies", a claim about every number, or why a pattern must continue. At those points the app switches to a second model, names it on screen, and returns to the line with the result; the hand-off table is §5.3.

The model gives the two factors different jobs (count and trip), so (−3) × 4 and 4 × (−3) are different pictures. That they land on the same place is a theorem the app checks visually, and a good thing for him to notice.

## 3. Learning progression

Eight stages, each using only what earlier stages proved; the teacher-led path takes about 15 minutes at the default speed of 2.5 seconds per step.

### 3.1 Order, timing and why

1. **Places and trips** (1.5 min). Everything later moves trips, so he must first see that a number can be a place or a movement, and that addition chains movements. Covers all four sign cases of addition.
2. **Opposites** (1.5 min). Subtraction will be "add the opposite", so the opposite must first exist, be unique and be a flip. Introduces t + (−t) = 0 and −(−t) = t.
3. **Subtraction undoes** (3 min). Needs opposites. Uses the subtraction square and the pattern 3 − 5, …, 3 − (−2).
4. **Copies** (1.5 min). Positive counts of any trip, including 3 × (−4), and the distributive law seen with positive numbers. Must precede stage 5, whose proof uses that law.
5. **A negative count** (2 min). (−3) × 4 by the zero trick; the Flip Theorem. The brief's "single negative multiplication" is split across stages 4 and 5 because 3 × (−4) needs no new idea and (−3) × 4 does.
6. **Two negatives** (3 min). Needs the Flip Theorem, (−3) × 0 = 0 and unique opposites. The brief's distributive derivation, then the double-flip picture, then the pattern table as evidence.
7. **Division undoes** (1.5 min). Needs every multiplication sign case. Includes ÷ 0 and 0 ÷ 0.
8. **Every minus flips something** (1 min). Mixed cases (−3 − 4; −a when a < 0; (−3)² against −3²) and the exit test.

Exit test, the brief's success criterion: he derives aloud, without quoting a rule, 5 − (−9), (−6) + 2, (−7) × 3, (−4) × (−5), (−20) ÷ 4 and 9 ÷ 0. The teacher listens for three things: the trip, the flip, and the law that forced the flip.

### 3.2 How a stage card maps onto the app

| Part (Part II order) | Where it appears |
| --- | --- |
| 1. Concrete intuition | Stage card text in the narration strip, before any run |
| 2. Visual model | The animated run on the line |
| 3. Symbolic expression | The equation ladder at the top of the canvas |
| 4. Plain English | The narration sentence of each step |
| 5. Derivation | The derive steps and their Why panels |
| 6. Contrasting example | A Compare preset that loads for that stage |
| 7. Common wrong idea | A "Someone says…" card with that wrong answer pre-entered in Predict |
| 8. Reasoning question | Shown large, answered aloud, never graded |

### 3.3 Stage cards

**Stage 1 · Places and trips**

- Intuition: A lift with basements. Floor −2 is a place; "go down 3 floors" is a trip.
- Visual: Dots for places, arrows for trips; the token walks one trip, then the next.
- Symbolic: 5 + 3 = 8 · 5 + (−3) = 2 · (−5) + 3 = −2 · (−5) + (−3) = −8
- Plain English: A number says how far and which way. Adding means doing one trip, then the next.
- Derivation: Trips the same way stack, so sizes add. Opposite trips overlap: the second walks back over the first, so sizes subtract and the longer trip sets the direction. All of it is read off the arrows.
- Contrast: 5 + (−3) = 2 against (−5) + 3 = −2: same sizes, signs swapped, opposite answers.
- Wrong idea: "(−5) + (−3) = 8, because two minuses make a plus." Two trips that both go left cannot end on the right.
- Question: Can adding a number move you left? Move you nowhere? Give an example of each and explain.

**Stage 2 · Opposites**

- Intuition: Walk to the shop and back; the trip home cancels the trip there.
- Visual: A trip, then the same trip flipped; the token returns to its start.
- Symbolic: 7 + (−7) = 0 · −(−7) = 7
- Plain English: Every trip has exactly one partner that undoes it: same size, other way. A minus in front means "the opposite of".
- Derivation: Uniqueness (§2.5, step 1). Since t + (−t) = 0, t is the opposite of −t, so −(−t) = t.
- Contrast: −(−7) = 7 (two flips on one trip) against −7 − 7 = −14 (one flip on each of two trips).
- Wrong idea: "−x is always negative." If x = −5, then −x = 5.
- Question: If x + (−12) = 0, what is x? Why can there not be two answers?

**Stage 3 · Subtraction undoes addition**

- Intuition: The undo button. Undoing "walk 7 left" means walking 7 right.
- Visual: The subtracted trip appears, flips with the label "subtract", then is walked. Then the subtraction square: 8 + 7, 8 − 7, 8 + (−7), 8 − (−7).
- Symbolic: a − b = a + (−b) · 8 − (−7) = 8 + 7 = 15 · 8 − 7 = 8 + (−7) = 1
- Plain English: Subtracting a trip means doing it backwards. If it already pointed left, backwards is right.
- Derivation: §2.5, step 2. Evidence first, from the pattern 3 − 5, 3 − 4, …, 3 − (−2): each time the subtracted number drops by 1, the answer rises by 1.
- Contrast: 8 − (−7) = 15 against 8 + (−7) = 1 (one symbol, one extra flip); 8 − 7 = 8 + (−7) (different flips, same landing).
- Wrong idea: "Subtraction always makes smaller" (8 − (−7) = 15). Also "3 − 8 = 5".
- Question: If subtracting a negative moves you right, does every subtraction move you right? Explain 0 − 5 and 0 − (−5) with flips.

**Stage 4 · Copies**

- Intuition: Three identical hops on a board game.
- Visual: n equal hop arcs of the trip t.
- Symbolic: 3 × 4 = 4 + 4 + 4 = 12 · 3 × (−4) = −12 · 0 × t = 0 · 3 × (4 + 2) = 3 × 4 + 3 × 2
- Plain English: n × t means n copies of the trip t. Copies point the way t points.
- Derivation: Repeated addition. The distributive law is seen by regrouping the hops 4, 2, 4, 2, 4, 2 into 4, 4, 4, 2, 2, 2: same landing, because trip order never matters.
- Contrast: 3 × (−4) = −12 against 3 + (−4) = −1.
- Wrong idea: "Multiplying makes bigger." 3 × (−4) lands further left.
- Question: Why does 3 × (−4) need no new idea, while (−3) × 4 does?

**Stage 5 · A negative count**

- Intuition: You walk right at 4 steps a second. Where were you 3 seconds ago? 12 steps to the left: (−3) × 4 = −12.
- Visual: 3 × 4 drawn dashed; the zero trick shows (−3) × 4 must cancel it; the dashed trip flips; the token walks it.
- Symbolic: (−3) × 4 + 3 × 4 = (−3 + 3) × 4 = 0 × 4 = 0, so (−3) × 4 = −12
- Plain English: "Negative three copies" has no meaning of its own, so it must mean whatever keeps the laws true, and only "the copies, flipped" does.
- Derivation: §2.5, step 3.
- Contrast: (−3) × 4 = −12 against 4 × (−3) = −12: different pictures, same place.
- Wrong idea: "(−3) × 4 = −12 because minus times plus is minus." Right answer, no reason.
- Question: What is (−1) × t for any trip t? Prove it in one line.

**Stage 6 · Two negatives**

- Intuition: Someone walks left at 4 steps a second. Where were they 3 seconds ago? 12 steps to the right: (−3) × (−4) = 12. A film of walking backwards, played backwards, shows walking forwards.
- Visual: The distributive proof drawn as trips: (−3) × 4 takes the token to −12, and the unknown trip must bring it home to 0.
- Symbolic: The brief's derivation (§5.2).
- Plain English: The answer is whatever number keeps the distributive law working, and only +12 does.
- Derivation: §5.2, every line justified.
- Contrast: (−3) × (−4) = 12 · (−3) + (−4) = −7 · (−3) − (−4) = 1
- Wrong idea: "Two minuses make a plus" as the reason; it gives wrong answers for (−3) + (−4) and −3 − 4.
- Question: Prove (−4) × (−6) = +24 without quoting a sign rule. Which model shows this directly, and where did we need a second one?

**Stage 7 · Division undoes multiplication**

- Intuition: Sharing a trip into equal parts; the undo button for multiplication.
- Visual: The target trip, flipped first if the count is negative, split into equal trips; the token walks one.
- Symbolic: a ÷ b = c means b × c = a · 12 ÷ (−3) = −4 because (−3) × (−4) = 12
- Plain English: Division asks which trip, taken b times, makes a. A negative b flips, so the answer flips too.
- Derivation: §2.5, steps 5 and 6.
- Contrast: (−12) ÷ (−3) = 4 · (−12) ÷ 3 = −4 · 12 ÷ (−3) = −4
- Wrong idea: "(−12) ÷ (−3) = −4: negatives stay negative." Also "5 ÷ 0 = 0".
- Question: Without working out the size, decide the sign of (−84) ÷ (−7) and prove it with multiplication.

**Stage 8 · Every minus flips something**

- Intuition: Each minus sign is a flip. Always ask: a flip of what?
- Visual: −3 − 4 as two separate trips, each flipped once.
- Symbolic: −3 − 4 = (−3) + (−4) = −7 · (−3)² = 9 but −3² = −9 · if a = −5 then −a = 5
- Plain English: Count the flips on each trip separately.
- Derivation: Rewrite any expression as a sum of trips, each with its own flip count.
- Contrast: 8 − (−7), two flips on one trip, goes right; −8 − 7, one flip on each of two trips, both go left.
- Wrong idea: Counting the minus signs across the whole expression.
- Question: Is (−1) × (−1) × … × (−1) with 2026 factors positive or negative? With 2027? Explain with flips.

## 4. Operation-by-operation architecture

Every case runs through the same machinery: build the trips, apply the flips that the signs and the operation require, walk, then check. The last column is the wrong answer Predict mode is built to catch (§7.4). Start is 0 throughout.

### 4.1 Addition: walk a, then walk b as it is

| Case | Visual model | Derived rule | In plain English | Memoriser's trap |
| --- | --- | --- | --- | --- |
| (+,+) 5 + 3 = 8 | Right 5, right 3 | Same direction: sizes add | Two trips the same way make a longer trip | Rarely wrong; contrast with 5 − 3 |
| (+,−) 5 + (−3) = 2 | Right 5; flip (sign); left 3 | Opposite directions: sizes subtract, the longer trip wins | The second trip walks back over part of the first | −2 ("plus-minus is minus") |
| (−,+) (−5) + 3 = −2 | Flip (sign), left 5; new trip, right 3 | As above | Walking back 3 of 5 left steps still leaves you left | −8, or 2 |
| (−,−) (−5) + (−3) = −8 | Left 5, left 3 | Same direction: sizes add, stays left | Both trips go left | 8 ("two minuses") |
| Zero: 6 + 0 = 6; 0 + (−4) = −4 | A zero trip: the token pulses in place | Adding nothing changes nothing | No steps, no movement | 4 |
| Equal sizes: 5 + (−5) = 0 | Out and back to the start | A trip plus its opposite is 0 | You end where you began | −10, or 10 |
| Crossing zero: 3 + (−8) = −5 | Right 3, left 8, passing 0 | The longer trip wins | You walk back past the start | 5 |
| Small and large: 2 + (−200) = −198 | Scale adapts; the label shows units per tick | Unchanged | Size changes the scale, not the reasoning | 198 |
| Reversal: 5 + (−3) and (−3) + 5 | Two routes, one landing | a + b = b + a | Trip order never matters | Thinks order changes the answer |

### 4.2 Subtraction: walk a, flip b, walk it

| Case | Visual model | Derived rule | In plain English | Memoriser's trap |
| --- | --- | --- | --- | --- |
| (+,+) 8 − 3 = 5 | Right 8; flip (subtract); left 3 | Subtracting a positive moves left | Undo "3 right" by going 3 left | Rarely wrong |
| (+,+) small minus large: 3 − 8 = −5 | Right 3; flip; left 8, past 0 | As above | You walk back past the start | 5, or "impossible" |
| (+,−) 8 − (−3) = 11 | Right 8; flip (sign); flip (subtract); right 3 | Two flips on one trip: right | Undo "3 left" by going 3 right | 5 (sizes subtracted) |
| (−,+) (−8) − 3 = −11 | Flip, left 8; new trip; flip (subtract); left 3 | Each minus flips a different trip | Both trips go left | −5, or 11 |
| (−,−) (−8) − (−3) = −5 | Left 8; flip, flip; right 3 | Two flips on the 3 | Undo "3 left", starting from −8 | −11 |
| Zero b: 6 − 0 = 6 | The token flips a zero trip; nothing moves | Flipping no trip leaves no trip, so −0 = 0 | Undoing nothing does nothing | −6 |
| Zero a: 0 − 6 = −6; 0 − (−6) = 6 | Stay at 0, then walk the flipped trip | 0 − b is the opposite of b | Subtracting from 0 gives the opposite | 0 − (−6) = −6 |
| Equal sizes: 5 − 5 = 0; 5 − (−5) = 10 | Back to the start; or twice as far | Same trip cancels; its opposite doubles | Undo a trip, or undo its opposite | 5 − (−5) = 0 |
| Reversal: 8 − 3 = 5; 3 − 8 = −5 | Difference view: the trip from 3 to 8, then from 8 to 3 | a − b = −(b − a) | Swapping gives the same size, other way | "Same answer" |
| Large: 999 − (−999) = 1998 | At 1366 px wide: ticks every 50, labels every 100 | Unchanged | — | 0 |

### 4.3 Multiplication: count × trip

| Case | Visual model | Derived rule | In plain English | Memoriser's trap |
| --- | --- | --- | --- | --- |
| (+,+) 3 × 4 = 12 | 3 hops of 4, right | Copies of a right trip go right; sizes multiply | Three copies of 4 | Contrast: 3 + 4 = 7 |
| (+,−) 3 × (−4) = −12 | Flip (sign); 3 hops left | Copies of a left trip go left | Repeated addition, no new idea | −1 (added instead) |
| (−,+) (−3) × 4 = −12 | 3 × 4 dashed; zero trick; flip (factor); 3 hops left | A negative count flips the product | It must cancel 3 × 4 | 12 |
| (−,−) (−3) × (−4) = 12 | Distributive proof; then two flips on one trip | Two flips: right | Only 12 keeps the distributive law | −12 |
| Zero count: 0 × (−4) = 0 | No hops | Zero copies is no trip | Nothing copied, nowhere to go | −4 |
| Zero trip: (−3) × 0 = 0 | Flip of a zero trip | Flipped nothing is nothing | Copies of no movement | −3, or "−0" |
| Equal sizes: (−4) × (−4) = 16 | As (−,−) | Two flips | Squaring a negative flips twice | −16 |
| Count of −1: (−1) × 7 = −7 | One flip, no extra copies | ×(−1) is a pure flip | The opposite of 7 | Rarely wrong |
| Reversal: (−3) × 4 and 4 × (−3) | Flipped copies of 4, then copies of −3 | a × b = b × a, checked | Different pictures, same place | — |
| Large: 25 × (−40) = −1000 | Hops collapsed into one counted arc, "× 25" | Unchanged | — | 1000 |

### 4.4 Division: b × c = a, and the quotient c is a trip

| Case | Visual model | Derived rule | In plain English | Memoriser's trap |
| --- | --- | --- | --- | --- |
| (+,+) 12 ÷ 3 = 4 | Target 12; split into 3; walk one | Positive count: no flip | Which trip, taken 3 times, makes 12? | 36 |
| (+,−) 12 ÷ (−3) = −4 | Target 12; flip (factor); split −12 into 3 | A negative count flips the answer | (−3) copies are flipped copies | 4 |
| (−,+) (−12) ÷ 3 = −4 | Target flipped by its own sign; split | One flip: the dividend's sign | Shares of a left trip go left | 4 |
| (−,−) (−12) ÷ (−3) = 4 | Sign flip, then factor flip; split | Two flips on the target: right | The flips cancel on the same trip | −4 |
| Zero dividend: 0 ÷ (−5) = 0 | Target is the zero trip; the share is 0 | (−5) × 0 = 0 | Sharing nothing gives nothing | "Undefined", or "−0" |
| Zero divisor: (−12) ÷ 0 | Candidate trips taken 0 times all stay at 0 | No c has 0 × c = −12: undefined | No answer exists | 0, or −12 |
| 0 ÷ 0 | Every candidate lands on 0 | Every c works: undefined | No single answer exists | 0, or 1 |
| Equal sizes: (−7) ÷ 7 = −1 | Split into 7, walk one | a ÷ a = 1 for a ≠ 0, before flips | One share of itself, flipped once | 1 |
| Divisor −1: 9 ÷ (−1) = −9 | One flip, one share | Dividing by −1 is a flip | The opposite of 9 | 9 |
| Reversal: 12 ÷ (−3) and (−3) ÷ 12 | The second is not whole: text only in v1 | Same sign, reciprocal size | Swapping keeps the sign, inverts the size | "Same answer" |
| Not whole: 7 ÷ (−2) | Not animated in v1; shows −7/2 exactly | Same sign logic | — | — |

## 5. Mathematical honesty

Every sign result the app shows is forced by a stated law, every picture lands exactly where the math engine says, and every second model is introduced by name with its purpose.

### 5.1 Forbidden explanations and their replacements

| Never shown as a reason | Shown instead |
| --- | --- |
| "Two minuses make a plus" | Two flips on the same trip cancel; the app also shows where the slogan fails: (−3) + (−4) and −3 − 4 |
| Keep–change–change | Subtracting is adding the opposite, because subtraction undoes addition; the procedure appears only as a consequence |
| "Minus times minus is plus, because that's the rule" | The distributive derivation, line by line |
| Repeated addition for a negative count, or for (−) × (−) | The distributive law plus unique opposites |
| Repeated subtraction for division | Inverse multiplication, checked by multiplying back |
| Debt and "enemy" stories as proof | Allowed only as an intuition, labelled "story", never as justification |
| A pattern as proof | Labelled "evidence", with the reason it cannot break |

### 5.2 The mandatory derivation for (−3) × (−4)

Shown as a teaching stage: each line appears on the equation ladder with its trip picture on the line (storyboard §6.6).

```latex
\begin{aligned}
(-3)\times[\,4+(-4)\,] &= (-3)\times 0 = 0\\
(-3)\times 4 + (-3)\times(-4) &= 0\\
(-12) + (-3)\times(-4) &= 0\\
(-3)\times(-4) &= +12
\end{aligned}
```

| Fact used | Justification shown on screen | Earned in |
| --- | --- | --- |
| 4 + (−4) = 0 | A trip and its opposite cancel | Stage 2 |
| (−3) × 0 = 0 | (−3) × 0 is 3 × 0 flipped; 3 × 0 is no trip, and flipped it is still none | Stage 5 (Flip Theorem with t = 0) |
| Sharing the (−3) across the bracket | a × (b + c) = a × b + a × c, a law we refuse to break | Stage 4 |
| (−3) × 4 = −12 | Flip Theorem | Stage 5 |
| The last line | The only trip that brings −12 back to 0 is 12 to the right | Stage 2 (uniqueness) |

The picture: the token walks (−3) × 4 from 0 to −12; the unknown trip must return it to 0, so it walks 12 right; that trip, started from 0, lands on 12.

The other derivations the app shows on screen: a − b = a + (−b) (§2.5, step 2), the Flip Theorem (step 3), division signs (step 5), and ÷ 0 (step 6). For 0 ÷ 0 it states both halves: 0 × c = 0 for every c, so "the" answer does not exist.

### 5.3 Second models and their stated purpose

| Where | Why the line alone is not enough | Second model | Purpose stated on screen |
| --- | --- | --- | --- |
| (−n) × t | "Negative copies" has no picture | The distributive zero trick | "Find the only meaning that keeps the laws" |
| (−n) × (−m) | Same | The derivation above | "Prove there is only one possible answer" |
| (−n) × (−m), as evidence | A proof is stronger than a picture, but a pattern makes it believable | Pattern table: 3 × (−4), 2 × (−4), …, (−3) × (−4) | "A clue, not a proof. It cannot break because (a − 1) × b = a × b − b" |
| a ÷ b | The question is "which number?" | Inverse multiplication, b × c = a | "Division undoes multiplication" |
| a ÷ 0 | The claim is about every number | The general fact 0 × c = 0 | "Show that no answer exists" |
| a − b, as a check | A second view should confirm the first | Difference: the trip from b to a | "Same answer, no flips needed" |

### 5.4 Visual honesty rules

- The scale is linear, and lines shown together share one scale.
- 0 is always on screen.
- The token's final place always equals start + the engine's value; for an undefined result it stays at the start.
- Reasoning trips are dashed and labelled "not walked"; walked trips are solid.
- Rotation is used only for flips, and every flip shows its cause.
- The scale is fixed for a whole playback; nothing rescales mid-animation.
- Minus is the true minus sign (U+2212), never a hyphen; negative operands always sit in brackets, as in 8 − (−7).

### 5.5 Honesty about choices

Right-as-positive is a convention. Keeping the laws (order, grouping, distributive) for negative numbers is a choice, made so algebra keeps working; once it is made, every sign result is forced, and stages 5 and 6 say so. Patterns can mislead: chords joining points on a circle cut it into 1, 2, 4, 8, 16 regions, and then 31, not 32. That example lives in the knowledge bite on memorising and deriving.

## 6. Simulation storyboards

Every animation is the playback of a pure step array generated from (A, op, B, start), built only after the math engine has fixed the result. Storyboards below use start 0; with any other start, every position shifts by the start. All ten arrays below were checked by script for continuity, flip placement, walking direction and final place.

### 6.1 Step schema

| Field | Type | Required | Meaning | Why it exists |
| --- | --- | --- | --- | --- |
| phase | intro, op1, flip, op2, derive, result, check | yes | Teaching role of the step | As specified |
| from | integer | yes | Token place at the start | As specified |
| to | integer | yes | Token place at the end; equals from for flips and still steps | As specified |
| flip | boolean | yes | Rotate 180° before any movement | As specified |
| narration | string, at most 25 words | yes | One sentence for the child | As specified |
| why | string, at most 70 words | yes | The justification, behind the Why button | As specified |
| face | R or L | optional; always generated | Token facing at the start of the step | Makes each step self-contained, so jumping to any index is correct without replay |
| cause | sign, subtract, factor, undo | with every flip | Label shown on the rotation | A flip with no visible cause would teach glyph-counting again |
| on | A, B, product, target, unknown | with flips and walks | Which trip is flipped or walked | Answers "a flip of what?" |
| hops | integer ≥ 1 | optional | Walk as equal hops (copies) | Multiplication and division need visible copies |
| ghosts | list of {from, to, hops, label} | optional | Dashed reasoning trips, never walked | Proof trips must look different from the answer |
| eq | string | optional | The line on the equation ladder | Part II requires the symbolic form at each stage |
| beat | string | always generated | Alignment key: phase + cause + operand | Lets Compare mode line two arrays up step by step |

Array invariants, checked every time an array is generated:

1. Continuity: each step's from equals the previous step's to.
2. A flip step has from = to and flip = true.
3. A walking step moves the way the token faces after any flip; a zero trip has from = to.
4. A facing change without a flip happens only at the first step of a new trip, drawn as a crossfade.
5. The last step ends at start + engine value; an undefined result ends at the start.
6. Every step has narration and why; the result step's eq contains the engine's value.

Steps are numbered from 1 for reading (array index = number − 1). Each line reads: **phase** · from → to · flip · facing · eq. N is the narration, W the why.

### 6.2 8 + (−7) = 1

1. **intro** · 0 → 0 · no flip · R · 8 + (−7) = ?
   - N: We start at 0, facing the positive way. Two trips are coming: first 8, then −7.
   - W: 0 is the point everything is measured from. Both numbers here are trips; because we start at 0, the place we stop is also the answer.
2. **op1** · 0 → 8 · no flip · R · on A
   - N: The trip 8 is eight steps to the right. Walk it.
   - W: A positive number points right, and its size, 8, says how far. We now stand at the place 8: the same number, now naming a place.
3. **flip** · 8 → 8 · flip (sign, on B) · R → L
   - N: Next trip: −7. Its minus sign belongs to the 7 and flips it, so it points left.
   - W: A negative number is the opposite of a positive one: same size, other way. Nothing is being subtracted here.
4. **op2** · 8 → 1 · no flip · L · on B
   - N: Adding means walking the next trip exactly as it is: 7 steps left, from 8 to 1.
   - W: Addition joins trips end to end and never changes them. The plus sign flips nothing.
5. **result** · 1 → 1 · L · 8 + (−7) = 1
   - N: We stop at 1. Together the two trips moved us 1 step right of the start.
   - W: The left trip walked back over 7 of the 8 right steps, leaving 1. That is why the sizes subtract and the longer trip sets the direction.
6. **check** · 1 → 1 · ghosts 0 → −7 → 1 · (−7) + 8 = 1 ✓
   - N: Check: walk the same trips in the other order, 7 left then 8 right. Same place.
   - W: Trips can be walked in either order and end at the same place: a + b = b + a. A different route to the same point confirms the answer without a rule.

### 6.3 8 − (−7) = 15

1. **intro** · 0 → 0 · R · 8 − (−7) = ?
   - N: Start at 0, facing right. First the trip 8, then we subtract the trip −7.
   - W: There are two different minus signs here. The one in brackets belongs to the 7 and says which way its trip points. The one in the middle is an operation. Watch each do its own job.
2. **op1** · 0 → 8 · R · on A
   - N: The trip 8: eight steps right. Walk it.
   - W: As in 8 + (−7).
3. **flip** · 8 → 8 · flip (sign, on B) · R → L
   - N: Next trip: −7. Its own minus sign flips it to point left.
   - W: This flip comes from the number itself: −7 is 7, flipped.
4. **flip** · 8 → 8 · flip (subtract, on B) · L → R · 8 − (−7) = 8 + 7
   - N: Subtracting means undoing that trip, and you undo a trip by walking it backwards, so flip it again.
   - W: a − b is the number that b, added to it, brings back to a. Adding −7 would walk 7 left; undoing that walks 7 right. So subtracting −7 is adding 7.
5. **op2** · 8 → 15 · R · on B
   - N: Now walk the twice-flipped trip: 7 steps right, from 8 to 15.
   - W: The trip's size never changed, only its direction, twice. Two flips on the same trip point it the way it started.
6. **result** · 15 → 15 · 8 − (−7) = 15
   - N: We stop at 15. Subtracting a negative trip moved us right.
   - W: Not because two minuses make a plus, but because both flips acted on the same trip. In −8 − 7 the two minus signs flip different trips, and nothing cancels.
7. **check** · 15 → 15 · ghost 15 → 8 · 15 + (−7) = 8 ✓
   - N: Check by undoing: from 15, add the trip −7. You are back at 8, so 15 is right.
   - W: a − b = c means exactly c + b = a. The check uses only addition, which we already trust.
8. **check** · 15 → 15 · ghost −7 → 8 · from −7 to 8 is 15 right ✓
   - N: Another view: 8 − (−7) asks how far, and which way, it is from −7 to 8. Count: 15 steps right.
   - W: a − b is the trip from b to a, because b + (a − b) = a. This view uses no flips at all, and it agrees.

### 6.4 The rest of the subtraction square

| Expression | Steps (phase: from → to) | Flips on the 7 | Result | Check |
| --- | --- | --- | --- | --- |
| 8 + 7 | intro · op1 0 → 8 · op2 8 → 15 · result · check | 0 | 15 | 7 + 8 = 15 |
| 8 − 7 | intro · op1 0 → 8 · flip (subtract) · op2 8 → 1 · result · check | 1 | 1 | 1 + 7 = 8 |
| 8 + (−7) | §6.2 | 1 (sign) | 1 | order swap |
| 8 − (−7) | §6.3 | 2 (sign, subtract) | 15 | undo, then difference |

Narration for the 8 − 7 flip step: "The trip 7 points right, but subtracting means undo, so flip it." Its result step: "We stop at 1, exactly where 8 + (−7) took us, for a different reason." The square's diagonals are equal: the identity a − b = a + (−b), seen twice.

### 6.5 (−3) × 4 = −12

1. **intro** · 0 → 0 · R · (−3) × 4 = ?
   - N: We know 3 × 4: three copies of the trip 4. But what could "negative three copies" mean?
   - W: A count of copies cannot be negative, so nobody has told us what this means. We will work it out from laws we already trust and refuse to break.
2. **derive** · 0 → 0 · ghost 0 → 12 in 3 hops, "3 × 4, not walked" · 3 × 4 = 12
   - N: First the part we know: three copies of 4 make a trip of 12 to the right. Dashed means we only look.
   - W: 3 × 4 = 4 + 4 + 4. Copies of a right-pointing trip point right.
3. **derive** · 0 → 0 · (−3) × 4 + 3 × 4 = (−3 + 3) × 4 = 0 × 4 = 0
   - N: The key: −3 and 3 cancel, so (−3) × 4 and 3 × 4 together make 0 × 4, which is no trip at all.
   - W: This is the distributive law, (a + b) × c = a × c + b × c, true for all ordinary numbers. If negative numbers broke it, algebra would stop working, so we keep it. Zero copies of anything is no movement.
4. **flip** · 0 → 0 · flip (factor, on product) · R → L · the ghost rotates to 0 → −12 · (−3) × 4 = −(3 × 4)
   - N: So (−3) × 4 must exactly cancel the trip of 12, which means it is that trip, flipped.
   - W: Two trips that add up to no trip are opposites. The only trip that cancels "12 right" is "12 left". That is why a negative count flips a product.
5. **op2** · 0 → −12 · hops 3 · L · on product · (−3) × 4 = −12
   - N: Walk the flipped trip: three hops of 4 to the left, through −4 and −8 to −12.
   - W: Each copy of 4, flipped, is a copy of −4.
6. **result** · −12 → −12 · (−3) × 4 = −12
   - N: (−3) × 4 = −12. One flip, so the answer points left.
   - W: Exactly one thing flipped this trip: the negative count. The 4 pointed right on its own.
7. **check** · −12 → −12 · ghost 0 → −12 in 4 hops of −3 · 4 × (−3) = −12 ✓
   - N: Check another way: four copies of the trip −3 also land on −12.
   - W: 4 × (−3) is plain repeated addition. It agrees, as it must if order does not matter in multiplication.

### 6.6 (−3) × (−4) = 12, the distributive derivation

1. **intro** · 0 → 0 · R · (−3) × (−4) = ?
   - N: Two negatives. We will not guess and we will not quote a rule; we will make the answer prove itself.
   - W: Repeated addition cannot do negative copies. What we can use: a trip and its opposite cancel; anything times 0 is 0; the distributive law; and (−3) × 4 = −12, already proved.
2. **derive** · 0 → 0 · ghosts 0 → 4, 4 → 0 · 4 + (−4) = 0
   - N: Start with something you can see: 4 steps right, then 4 steps left, and you are home.
   - W: −4 is the trip that undoes 4. Together they make no trip.
3. **derive** · 0 → 0 · (−3) × \[4 + (−4)\] = (−3) × 0 = 0
   - N: So (−3) times that bundle is (−3) times 0, which is 0.
   - W: (−3) × 0 is 3 × 0 flipped. 3 × 0 is no trip, and flipping no trip leaves no trip.
4. **derive** · 0 → 0 · (−3) × 4 + (−3) × (−4) = 0
   - N: Share the (−3) with each part of the bundle; that is the distributive law. Now two trips together go nowhere.
   - W: a × (b + c) = a × b + a × c. We keep it for negative numbers because it is how multiplying and adding fit together.
5. **op1** · 0 → −12 · flip (factor, on product) · R → L · −12 + (−3) × (−4) = 0
   - N: The first trip we already know: (−3) × 4 = −12. Flip and walk 12 steps left.
   - W: Proved in the last stage: the negative count flips 3 × 4.
6. **derive** · −12 → 0 · flip (undo, on unknown) · L → R · (−3) × (−4) = 12
   - N: The second trip, (−3) × (−4), must bring us from −12 back to 0, because together they make 0. That is 12 steps right.
   - W: If −12 + x = 0, then x undoes −12, and only one trip does that: 12 right. No other number is possible, which is what makes this a proof and not a rule.
7. **result** · 0 → 12 · R · (−3) × (−4) = 12
   - N: So (−3) × (−4) = 12. Walk that trip from 0 and you land on 12.
   - W: A trip is the same trip wherever it starts. Nowhere did we say two minuses make a plus; the distributive law left exactly one possible answer.
8. **check** · 12 → 12 · ghosts 0 → −12 in 3 hops of −4, then rotated to 0 → 12 · −(3 × (−4)) = −(−12) = 12 ✓
   - N: Check with flips: 3 × (−4) is three hops left, −12. The negative count flips that: 12.
   - W: −4 is 4 flipped once by its own sign; the negative count flips the product again. Two flips on one trip point right. That is the true, limited meaning of "two negatives make a positive".

### 6.7 12 ÷ (−3) = −4

1. **intro** · 0 → 0 · R · 12 ÷ (−3) = ?
   - N: Division asks a multiplication question: (−3) × ? = 12. Which trip, taken (−3) times, makes 12?
   - W: a ÷ b means the number c with b × c = a. Division undoes multiplication, as subtraction undoes addition, so the multiplication facts we proved decide the answer.
2. **op1** · 0 → 0 · no flip · R · ghost target 0 → 12 · (−3) × ? = 12
   - N: Here is the target: the trip 12, pointing right.
   - W: The number being divided is the trip the copies must build exactly.
3. **flip** · 0 → 0 · flip (factor, on target) · R → L · the target ghost rotates to 0 → −12 · 3 × ? = −12
   - N: Taking a trip (−3) times means 3 copies, flipped. So before that flip, 3 copies must make the target flipped: −12.
   - W: (−3) × c is (3 × c) flipped. If flipping 3 × c gives 12, then 3 × c is −12.
4. **op2** · 0 → −4 · L · on unknown · ghost 0 → −12 in 3 equal hops · 3 × (−4) = −12
   - N: Which trip, copied 3 times, makes −12? Split it into 3 equal trips: each is 4 steps left. Walk one.
   - W: Three equal trips making −12 must each be −4. A longer trip overshoots, a shorter one falls short, and a right-pointing one goes the wrong way.
5. **result** · −4 → −4 · 12 ÷ (−3) = −4
   - N: The trip is −4, so 12 ÷ (−3) = −4.
   - W: The sign came from one flip, the negative count. The size came from splitting 12 into 3.
6. **check** · −4 → −4 · ghosts 0 → −12 in 3 hops of −4, rotated to 0 → 12 · (−3) × (−4) = 12 ✓
   - N: Check by multiplying back: three copies of −4 make −12; flipped, 12.
   - W: A division answer is right exactly when multiplying back gives the number that was divided.

### 6.8 (−12) ÷ 3 = −4

1. **intro** · 0 → 0 · R · (−12) ÷ 3 = ?
   - N: Which trip, taken 3 times, makes −12? That is the question 3 × ? = −12.
   - W: Same meaning as every division: the number c with b × c = a.
2. **op1** · 0 → 0 · flip (sign, on target) · R → L · ghost target 0 → −12
   - N: The target is −12: twelve steps, flipped by its own sign to point left.
   - W: The dividend's minus sign belongs to the 12.
3. **derive** · 0 → 0 · no flip · L · 3 × ? = −12
   - N: The count is 3, a positive number, so nothing else flips.
   - W: Only a negative count flips a product. With 3 copies, the copies point where the target points.
4. **op2** · 0 → −4 · L · ghost 0 → −12 in 3 hops · 3 × (−4) = −12
   - N: Split −12 into 3 equal trips: each is 4 steps left. Walk one.
   - W: As in §6.7, step 4.
5. **result** · −4 → −4 · (−12) ÷ 3 = −4
   - N: (−12) ÷ 3 = −4: the same answer as 12 ÷ (−3), with the flip in a different place.
   - W: Here the flip came from the dividend's sign; in 12 ÷ (−3), from the count.
6. **check** · −4 → −4 · ghost 0 → −12 in 3 hops of −4 · 3 × (−4) = −12 ✓
   - N: Check: three hops of −4 land on −12.
   - W: Multiplying back gives the dividend, so the answer is right.

### 6.9 (−12) ÷ (−3) = 4

1. **intro** · 0 → 0 · R · (−12) ÷ (−3) = ?
   - N: (−3) × ? = −12. Which trip, taken (−3) times, makes −12?
   - W: As always, division asks a multiplication question.
2. **op1** · 0 → 0 · flip (sign, on target) · R → L · ghost target 0 → −12
   - N: The target is −12, pointing left.
   - W: First flip on the target: its own sign.
3. **flip** · 0 → 0 · flip (factor, on target) · L → R · the target ghost rotates to 0 → 12 · 3 × ? = 12
   - N: (−3) copies means 3 copies, flipped. Undo that flip on the target: 3 copies must make 12.
   - W: (−3) × c = −12 means 3 × c, flipped, is −12, so 3 × c = 12.
4. **op2** · 0 → 4 · R · ghost 0 → 12 in 3 hops · 3 × 4 = 12
   - N: Split 12 into 3 equal trips: each is 4 steps right. Walk one.
   - W: Only 4, copied 3 times, makes 12.
5. **result** · 4 → 4 · (−12) ÷ (−3) = 4
   - N: (−12) ÷ (−3) = 4. Two flips on the target, so the answer points right.
   - W: The target was flipped once by its own sign and once by the negative count; two flips on the same trip cancel.
6. **check** · 4 → 4 · ghosts 0 → 12 in 3 hops of 4, rotated to 0 → −12 · (−3) × 4 = −12 ✓
   - N: Check: three copies of 4 make 12; flipped, −12.
   - W: Multiplying back gives the dividend.

### 6.10 (−12) ÷ 0 is undefined

1. **intro** · 0 → 0 · R · (−12) ÷ 0 = ?
   - N: This asks 0 × ? = −12. Which trip, taken 0 times, makes −12?
   - W: Same meaning as always: a ÷ b is the number c with b × c = a. If no such number exists, the division has no answer.
2. **op1** · 0 → 0 · flip (sign, on target) · R → L · ghost target 0 → −12
   - N: The target: −12, pointing left.
   - W: As in §6.8.
3. **derive** · 0 → 0 · L · ghosts: candidate trips 5, −4 and −12, each "taken 0 times", drawn as a dot at 0 · 0 × 5 = 0 · 0 × (−4) = 0 · 0 × (−12) = 0
   - N: Try any trip: 5, −4, even −12 itself. Taken 0 times, each one goes nowhere.
   - W: Zero copies of a trip is no trip, whatever the trip. So 0 × c = 0 for every number c.
4. **derive** · 0 → 0 · L · 0 × ? is always 0, never −12
   - N: So 0 × ? always lands on 0, and 0 is not −12. No trip can work.
   - W: We have not failed to find the answer; we have shown there is none to find. That is a proof of impossibility, a kind of argument mathematicians use constantly.
5. **result** · 0 → 0 · the target's end shows an open ring, "no number lands here" · (−12) ÷ 0 is undefined
   - N: So (−12) ÷ 0 has no answer. We call it undefined: not 0, not −12, not "infinity".
   - W: Any number written after = would be false, because multiplying it by 0 never gives −12.
6. **check** · 0 → 0 · (−12) × 0 = 0, so 0 ÷ (−12) = 0 ✓
   - N: Compare: 0 ÷ (−12) is fine, because (−12) × 0 = 0. Dividing zero is allowed; dividing by zero is not.
   - W: And 0 ÷ 0? Then 0 × ? = 0 holds for every number, so there is no single answer: undefined for the opposite reason, too many answers instead of none.

### 6.11 0 ÷ 0 is undefined

intro (0 × ? = 0) · derive (candidates 5, −4 and 12, each taken 0 times, all land on 0, which is the target: every one works) · result ("Every number works, so there is no single answer: undefined, for the opposite reason to (−12) ÷ 0") · check (none; the Why panel contrasts the two kinds of undefined).

### 6.12 Generator templates for any input

Brackets mark conditional steps. "New trip" means the facing resets to R by crossfade before that trip's flips.

| Operation | Steps in order | Check |
| --- | --- | --- |
| a + b | intro · \[flip sign on A if a < 0\] · op1 walk a · new trip · \[flip sign on B if b < 0\] · op2 walk b · result | Order swap |
| a − b | intro · \[flip sign on A\] · op1 · new trip · \[flip sign on B\] · flip subtract on B · op2 · result | Undo (c + b = a), then difference (trip from b to a) |
| a × b, a ≥ 0 | intro · \[flip sign on B\] · op2 walk a hops of b · result | b ≥ 0: b copies of a. b < 0: a × b + a × (size of b) = a × 0 = 0 |
| a × b, a < 0, b ≥ 0 | As §6.5 | b copies of a |
| a × b, a < 0, b < 0 | As §6.6 | Double flip |
| a ÷ b, b ≠ 0, exact | intro · op1 target \[flip sign on target if a < 0\] · \[flip factor on target if b < 0, else a "no flip" derive\] · op2 walk one share · result | b × c = a, drawn as copies plus any flip |
| a ÷ 0 | As §6.10 (a ≠ 0) or §6.11 (a = 0) | Contrast with 0 ÷ a |

Narration variants the generator selects by flag:

| Flag | When | Effect on narration |
| --- | --- | --- |
| Zero trip | A trip of size 0 | "A trip of no steps"; a flip of it is shown, then "flipping no trip changes nothing" |
| Cancelling | a + b with b = −a; a − b with a = b | The result names the cancellation: "back where you began" |
| Crossing zero | A walk passes 0 | "…passing 0 into the negative side" (or positive) |
| Start ≠ 0 | Any start but 0 | The result names both: "The answer is the trip +15; from 5 it lands on 20" |
| Collapsed hops | More than 24 hops, or a hop under 14 px | "× 37 copies", with a counter during the walk |

## 7. Interaction specification

One expression, edited in the headline, drives the computation, the scale, the animation, the narration, the equation ladder and the check. Changing any part of it stops playback and rebuilds everything from step 1.

### 7.1 Expression editor (the headline)

| Control | Behaviour | Why |
| --- | --- | --- |
| A: direction toggle + size field | The toggle shows + or −; the size field accepts digits only, 0 to 999 | Entering size and direction separately is the model itself |
| Operator | Four segments, + − × ÷; arrow keys move between them | A separate control, so the operator minus never looks like a sign |
| B: direction toggle + size field | As A | — |
| Start at | The same pair, default 0, under a quiet "start at" label | Shows that the answer is a trip, independent of the start |
| Result slot | "= ?" until the result step, then the value | The answer never appears before the reasoning |

Rules: a size of 0 sets the toggle to neutral and disables it, with the hint "0 has no direction". Pasting "−7" into a size field moves the minus to the toggle. Decimals, letters and values of 1000 or more are refused inline with the reason. Edits apply 300 ms after the last keystroke, or at once for toggles and the operator. A non-whole quotient shows: "7 ÷ (−2) = −7/2. This version animates whole-number answers; the sign logic is the same. Try 8 ÷ (−2)."

### 7.2 Playback

| Control | Effect |
| --- | --- |
| Play / Pause | Runs steps in order; Pause stops at the end of the current step's motion |
| Step forward | Animates the next step at the current speed, then stops |
| Step back | Shows the previous step's end state at once, with a 150 ms crossfade |
| Restart | Jumps to step 1 and plays |
| Reset | Jumps to step 1, paused; clears the prediction and hides the answer again |
| Step scrubber | One dot per step, labelled by phase; a click or arrow key jumps to that step's end state |
| Speed | Continuous slider from 12 s to 0.6 s per step, logarithmic: seconds = 12 × 0.05^u for u from 0 to 1. Default 2.5 s; the label reads, for example, "4.2 s per step" |

Each step's time splits into motion and dwell. A flip rotates for 45% and dwells for 55%. A walk takes 20% to face, 50% to move and 30% to dwell. A still step draws its eq and ghosts in 40% and dwells for 60%. Speed changes apply on the next frame without a jump, because progress advances by elapsed time divided by the current duration.

### 7.3 Teacher-led and Discovery

|  | Teacher-led | Discovery |
| --- | --- | --- |
| Who drives | The teacher, through stages 1–8 (§3) | The child, with any expression |
| Answer | Hidden: playback holds before the last walk and asks "Where will it land?"; continues on Reveal | Shown when reached |
| Predict | On by default | An optional toggle |
| Stage card | Eight parts revealed one at a time | Not shown; knowledge bites available |
| Rule statements | Only after the child has said it in his own words | Only in knowledge bites |

### 7.4 Prediction mode and diagnosis

The child predicts with the same pair as the inputs: which way (← or →, or "no answer" for ÷) and how far. After the run, his prediction is drawn as a hollow ring and the landing as a filled ring. A match shows "Matched. Now explain why, without a rule." A mismatch shows one diagnosis and a button that jumps to the step where his reasoning parted from the line. Diagnoses are tried in table order, and the first that fits is shown.

| Id | Category (brief's list) | Fires when | Example | Message, abridged | Jumps to |
| --- | --- | --- | --- | --- | --- |
| add-two-minus | Sign vs size | a, b < 0 and guess = size a + size b | (−5) + (−3) → 8 | The two minus signs flip two different trips, and both go left. Flips cancel only on the same trip. | B's sign flip |
| add-op-sign | Direction | a > 0 > b, answer > 0, guess = −answer | 5 + (−3) → −2 | "+ (−3)" is a trip to the left, not the answer. Where did you land? | op2 |
| add-sizes | Distance | Signs differ, guess = ±(size a + size b) | 8 + (−7) → 15 | The trips point opposite ways, so the second walks back over the first. | op2 |
| skip-first | Start position | guess = b | 8 + (−7) → −7 | You walked only the second trip; the first moved you before it started. | op1 |
| sub-no-flip | Subtraction as reversal | guess = a + b, b ≠ 0 | 8 − 3 → 11; 8 − (−7) → 1 | Subtracting undoes a trip, so it must be flipped. In 8 − (−7) the 7 is flipped twice. | Subtract flip |
| sub-sizes | Sign vs size | guess = sign of a × (size a − size b) | (−8) − 3 → −5 | Both trips go left here, so the sizes add. | op2 |
| sub-reversed | Direction | guess = b − a | 3 − 8 → 5 | That is the trip from 8 to 3. a − b goes from b to a: same size, other way. | Difference check |
| sub-two-minus | Sign vs size | a < 0 < b, guess = size a + size b | (−8) − 3 → 11 | The two minuses flip different trips, the 8 and the 3. Nothing cancels. | B's subtract flip |
| mul-count | Negative factor | a < 0 < b, guess = size a × size b | (−3) × 4 → 12 | The negative count flips the whole product. | Factor flip |
| mul-one-flip | Negative factor | a, b < 0, guess = −(size a × size b) | (−3) × (−4) → −12 | You flipped once. −4 was already flipped by its sign; the count flips it again. | Unknown-trip derive |
| mul-as-add | Sign vs size | guess = a + b | (−3) × (−4) → −7 | That is (−3) + (−4). Multiplying counts copies. | intro |
| mul-zero | Distance | Answer 0, guess = a or b | (−3) × 0 → −3 | Copies of no trip, or no copies, go nowhere. | op2 |
| div-check | Inverse relationship | ÷, wrong numeric guess | 12 ÷ (−3) → 4 | Check it: (−3) × 4 = −12, not 12. (Computed from his guess.) | Factor flip |
| div-as-mul | Inverse relationship | guess = a × b | 12 ÷ (−3) → −36 | That is 12 × (−3). Division asks (−3) × ? = 12. | intro |
| div-zero | Inverse relationship | b = 0, a ≠ 0, numeric guess | (−12) ÷ 0 → 0 | Check: 0 × 0 = 0, not −12. Does any number work? | Candidates derive |
| zero-zero | Inverse relationship | a = b = 0, numeric guess | 0 ÷ 0 → 0 | 0 × 0 = 0, but 0 × 7 = 0 too. Which one is "the" answer? | Candidates derive |
| zero-dividend | Inverse relationship | a = 0, b ≠ 0, guess "no answer" | 0 ÷ 5 → none | 5 × 0 = 0, so 0 works. Dividing BY zero is the problem. | check |
| landing | Start position | Start ≠ 0, guess = start + answer | Start 5, 8 + (−7) → 6 | You gave the landing place; the answer is the trip. | result |
| direction | Direction | Right size, wrong sign | — | Right distance, wrong way. Count the flips on the trip. | First flip |
| distance | Distance | Right sign, wrong size | — | Right way, wrong distance. Check the sizes. | Last walk |
| fallback | — | Anything else | — | Let's walk it and find where your answer and the line part ways. | Step 1 |

No praise, points or streaks: a match earns only the reasoning question.

### 7.5 Comparison mode

Two expressions on two stacked number lines with one shared scale computed from both. Steps align by beat; when one array has a beat the other lacks (a flip), the other line shows "no flip here" at that moment. The changed part of the second expression is underlined and labelled "changed". The narration strip gives one contrast sentence per beat and a summary at the end, for example: "One symbol changed, + to −. It added one flip to the second trip. Landing: 1 against 15."

Presets: 8 + (−7) vs 8 − (−7) · 8 − 7 vs 8 + (−7) · 8 + 7 vs 8 − (−7) · (−3) × 4 vs (−3) × (−4) · (−3) × 4 vs 4 × (−3) · 12 ÷ (−3) vs (−12) ÷ 3 · 8 − 3 vs 3 − 8 · 5 + (−3) vs (−3) + 5.

### 7.6 Pattern-discovery mode

A ladder of mini number lines on one scale, one row per expression, zero ticks aligned. No rule is shown until the child has explained the pattern.

1. **Observe.** Each → press reveals and animates the next row; its landing dot stays.
2. **Predict.** Rows past the familiar ones (3 − (−1), 3 − (−2)) stay hidden; he taps where each dot will land.
3. **Explain.** "Each time the number you subtract goes down by 1, what happens to the answer? Why?" Spoken, not typed.
4. **Prove.** The hidden rows animate with the flip model, then the undo proof: (3 − (−1)) + (−1) = 3, so 3 − (−1) = 4.
5. **Name it.** "Say the rule in your own words." Only then does a − (−b) = a + b appear, labelled "what you just proved".

Ladders: 3 − 5, …, 3 − (−2), giving −2 up to 5 (required) · 3 × (−4), 2 × (−4), …, (−3) × (−4), giving −12 up to 12, whose rise of 4 per row is explained by (a − 1) × b = a × b − b · 5 + 2, …, 5 + (−3). The pattern panel always carries "A pattern is a clue, not a proof."

### 7.7 Knowledge bites

Collapsed by default, in a drawer that slides over the right edge of the canvas and never resizes it. Each ends with a reasoning question. "Places and trips" is an addition to the brief's ten, because stage 1 rests on it.

| Bite | Content | Reasoning question |
| --- | --- | --- |
| What zero means | The reference place, and the trip of no steps. It has no direction, so −0 = 0. Adding 0 changes nothing; 0 copies of anything is 0. | Is 0 positive or negative? What would break if −0 were different from 0? |
| What a negative number means | A place left of 0, or a trip pointing left: the opposite of a positive number. Further left is less, so −3 < −2. The minus belongs to the number. | Which is bigger, −3 or −2? Use the line, not a rule. |
| Places and trips | One number names a place and a trip; the place p is where the trip p ends from 0. The answer is a trip; where you land depends on the start. | Start at 5 and work out 8 + (−7). Did the answer change? |
| Additive inverse | Every trip t has exactly one partner −t with t + (−t) = 0, and −(−t) = t. | If x + (−12) = 0, what is x? Why only one answer? |
| Why a − b = a + (−b) | Subtraction undoes addition; undoing a trip is walking it backwards; (a + (−b)) + b = a. | If subtracting a negative moves you right, does every subtraction move you right? |
| Why ×(−1) flips you | (−1) × t + 1 × t = 0 × t = 0, so (−1) × t is the opposite of t. | What is (−1) × (−1) × (−1) × 5? How many flips? |
| Why (−)(−) = + | The distributive derivation of §5.2; the reversed-film intuition; the honest version: two flips on one trip. | Prove (−4) × (−6) = +24 without quoting a sign rule. |
| Why division is inverse multiplication | a ÷ b = c means b × c = a; signs follow from multiplication; always check by multiplying back. | Without dividing, decide the sign of (−84) ÷ 7, then check. |
| Why ÷ 0 is undefined | 0 × c = 0 for every c. So a ÷ 0 has no answer when a ≠ 0, and 0 ÷ 0 has every number as an answer, so no single one. 0 ÷ b = 0 is fine. | A friend says 5 ÷ 0 = 0. Check him the division way. |
| Common sign misconceptions | (−3) + (−4) ≠ 7; 8 − (−7) ≠ 1; −3 − 4 ≠ 7; −a need not be negative; (−3)² = 9 but −3² = −9; subtracting can increase; multiplying can decrease. | Find the flaw: "−3 − 4 has two minuses, so it's +7." |
| Memorising vs deriving | Rules break under pressure; derivations rebuild in seconds from trips, flips, undo and the distributive law. Patterns deceive: chords on a circle make 1, 2, 4, 8, 16, then 31 regions. | Which model explains (−3) × (−4) directly, and where do we need a second model? |

### 7.8 Keyboard and focus

| Key | Action | Notes |
| --- | --- | --- |
| Space | Play / pause | Ignored while typing in a field; on a focused button, the button's own action runs once, never twice |
| ← / → | Step back / forward | Ignored in fields; inside the scrubber they move between dots |
| Home / End | First / last step | — |
| Enter | Applies an edit at once | In size fields |
| ? | Shows the shortcut list | — |

Every control has a visible 2 px focus ring in the action colour with a 2 px offset. Tab order: the headline left to right, mode controls, the canvas (one stop, described by its live label), narration and Why, playback, speed.

## 8. Visual design specification

The number line is the hero: it gets at least 70% of the viewport at every supported size, and every other element exists to explain what happens on it.

### 8.1 Palette

Hues come from the Okabe–Ito colour-blind-safe set. Each semantic colour reaches at least 4.5:1 on its background in both themes, so it can carry text as well as strokes (ratios computed, WCAG 2 formula).

| Role | Light | Dark | Contrast light / dark | Used for |
| --- | --- | --- | --- | --- |
| Background | #FBFBFD | #121214 | — | Page and canvas |
| Surface | #FFFFFF | #1C1C1F | — | Bars, drawer |
| Text | #1D1D1F | #F5F5F7 | 16.3 / 17.2 | Primary text |
| Quiet text | #6E6E73 | #A1A1A6 | 4.9 / 7.3 | Labels, ticks, tick numbers |
| Hairline | #D2D2D7 | #3A3A3F | decorative only | Dividers between bars, never meaning |
| Positive | #0072B2 | #56B4E9 | 5.0 / 8.1 | Right-pointing trips, positive side |
| Negative | #B34D00 | #FF8A4C | 5.1 / 8.0 | Left-pointing trips, negative side |
| Action | #9C3D73 | #E48FC1 | 6.1 / 8.0 | Operators, flip arcs, focus rings |

Positive and action can look alike to some red-blind viewers, so they never mark the same kind of object: positive marks trips, action marks flips and operators, and each has its own shape.

### 8.2 Never colour alone

| Meaning | Colour | Also shown by |
| --- | --- | --- |
| Positive trip | Positive | Arrowhead pointing right, label "+8", solid stroke |
| Negative trip | Negative | Arrowhead pointing left, label "−7", solid stroke |
| Negative side of the line | Negative at 6% | Faint diagonal hatching and the label "◄ negative side" |
| Positive side | Positive at 6% | No hatching; label "positive side ►" |
| Flip | Action | Curved U-turn arc over the token, the word "flip" and its cause |
| Reasoning trip | Its direction's colour at 55% | Dashed stroke, label "not walked" |
| Answer | Text | Double-weight arrow below the line, label "= +15", filled landing ring |
| Prediction | Text | Hollow ring, label "your prediction" |

### 8.3 Typography

System stack only: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif. Equation ladder and inline maths: "STIX Two Math", "Cambria Math", "Latin Modern Math", ui-serif, Georgia, serif. All numbers use tabular figures. Symbols: − (U+2212), × (U+00D7), ÷ (U+00F7); negative operands in brackets.

| Element | Desktop size / weight | Tablet size |
| --- | --- | --- |
| Headline expression, the one strong headline | 40 / 600 | 32 |
| Equation ladder, current line | 24 / 600; earlier lines 20 / 400 at 60% opacity | 20 |
| Narration | 20 / 450, line height 1.4 | 18 |
| Why text | 16 / 400 | 16 |
| Tick labels | 14 / 500; zero 16 / 700 | 13 |
| Trip labels | 15 / 600 | 14 |
| Quiet labels | 13 / 500 | 12 |

The app name, "Number Line Lab", is quiet text at 15 / 600. The expression is the headline because it is what the child is thinking about.

### 8.4 Number line and token

- **Axis.** 2 px, with arrowheads at both ends meaning "continues". Minor ticks 8 px, labelled ticks 14 px; the zero tick is 22 px, with a faint full-height zero guide.
- **Lanes.** Trips stack above the axis in 28 px lanes, the first trip lowest; copies are hop arcs; reasoning trips take their own lanes. The answer arrow sits below the axis.
- **Token.** An arrow-shaped marker, 30 × 22 px, centred on the axis, filled with its facing direction's colour and outlined in text colour. A flip rotates it 180° in the plane, always over the top (anticlockwise from right to left, clockwise from left to right), so every flip reads as the same act of turning around. The fill crossfades at the halfway point.
- **New trip.** A small trip card ("7 steps") fades in above the token pointing right; if the token faced left, it crossfades to right. Rotation never means anything but a flip.
- **Equation ladder.** Top of the canvas, at most 30% of its height; the current line bold, earlier lines fading upward.

### 8.5 Auto-scaling

Computed once per expression from the whole step array, so the scale never changes during playback.

1. Collect every position: 0, the start, every step's from and to, every ghost endpoint, the landing.
2. lo = smallest, hi = largest. If hi − lo < 10, widen symmetrically to 10, so 1 + 1 is not absurdly zoomed.
3. Add a margin of 8% of the span, at least 1 unit, on each side.
4. Tick = the smallest of 1, 2, 5, 10, 20, 50, … whose spacing is at least 24 px.
5. Labels go on every tick, or every 2nd, 5th or 10th, whichever first gives at least 48 px between labels. 0 and the landing are always labelled; a colliding neighbour label hides.
6. Round both ends out to whole ticks.
7. When a tick is more than 1 unit, show "each tick = 50 units" (the actual value) at the canvas foot.
8. Compare and Pattern modes use the union of all their expressions' positions.
9. On resize, recompute pixels only; keep the step and its progress.

Worked results, canvas 1302 px wide (a 1366 px window): 1 + 1 gives ticks of 1 at 108 px per unit; 999 − (−999) gives ticks of 50, labels every 100; 999 × (−999) gives ticks and labels every 50,000.

Hops are drawn one by one when there are at most 24 and each is at least 14 px; otherwise one arc labelled "× 37 copies" with a counter during the walk. A walked trip under 10 px gets a minimum visible marker and an outside label, "+3 (too small to draw at this scale)". Nothing is ever clipped, because the range contains every position by construction.

### 8.6 Layout

Shown at step 6 of 8 − (−7). The trips, ticks and answer are drawn to scale, 2 characters per unit.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Number Line Lab   start [+|0]   [+|8]  [+ − × ÷]  ([−|7])  = 15          │
│ [Explore|Compare|Pattern]  [Teacher-led|Discovery]  [Predict]  ◐  Bites  │
├──────────────────────────────────────────────────────────────────────────┤
│                    8 − (−7)  =  8 + 7  =  15        ← equation ladder    │
│                                                                          │
│                           ↻ flip: subtracting                            │
│ lane 2                      ──────────────► +7  (−7, flipped twice)      │
│ lane 1      ────────────────► +8                                         │
│ ◄ negative side                                         positive side ►  │
│  ◄──┼───┼───╋───┼───┼───┼───┼───┼───┼───┼─▲─┼───┼───┼───┼───┼────►       │
│    −4  −2   0   2   4   6   8  10  12  14  16  18  20  22  24            │
│             ══════════════════════════════► = +15  answer                │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ Step 6 of 8 · result   We stop at 15. Subtracting a negative trip        │
│ moved us right.                                                [ Why? ]  │
├──────────────────────────────────────────────────────────────────────────┤
│ ⟲  ◀  ▶ ❚❚  ▶   Reset    ●─●─●─●─●─◉─○─○       12 s ──●─────── 0.6 s     │
└──────────────────────────────────────────────────────────────────────────┘
```

Bars, top to bottom: headline and modes (64 px; the knowledge drawer, "Bites", slides over the canvas from the right), canvas, narration strip (88 px, fixed; Why swaps its contents in the same box, so nothing shifts), playback (60 px). The canvas spans the full width, so its share of the viewport equals its share of the height.

| Viewport | Layout | Canvas share |
| --- | --- | --- |
| 1920 × 1080 | Bars as above, 212 px in total | 80% |
| 1440 × 900 | As above | 76% |
| 1366 × 768 | As above | 72% |
| 1024 × 768, tablet landscape | As above | 72% |
| 768 × 1024, tablet portrait | Headline wraps to two rows (64 + 48); narration 104; playback in two rows, 72 | 72% |
| Height under 640, e.g. 1366 × 600 | Narration collapses to one line (56); playback one row (56) | 71% |
| Narrower than 768 | Best effort: controls move into a bottom sheet that never covers the line | — |

### 8.7 Motion

| Motion | Spec | Purpose |
| --- | --- | --- |
| Walk | Cubic ease-in-out per hop; hop arcs lift 4 px | Copies read as separate hops |
| Flip | 180° rotation over the top, ease-in-out | One consistent "turning around" |
| New trip | 200 ms crossfade | Visibly different from a flip |
| Ghost reveal | The dash draws on over 40% of the step | Reasoning appears as it is said |
| Narration pulse | Action colour at 12% opacity fading to 0 over 300 ms, on each step change | Marks the new sentence |
| Hover | Surface tint at 6% | Shows what is clickable |

Reduced motion (prefers-reduced-motion: reduce): no tweening. Each step shows its end state at once; a flip is an instant change plus a static "flipped" badge; the pulse becomes a 3 px left border. Play still advances with the dwell time, and manual stepping is unchanged. Nothing anywhere flashes, there is no sound, and no motion is decorative.

All movement uses transform and opacity on SVG elements, updated by requestAnimationFrame; no layout-affecting property changes per frame.

### 8.8 Themes

Light and dark come from the palette tokens. The default follows the system setting; the ◐ toggle overrides it for the session. A theme change mid-animation swaps the tokens without restarting the step.

## 9. Internal software architecture

Nine modules in one HTML file, wired in one direction: input, then math, then steps, then playback, then screen. The math engine fixes the result before any step exists, and nothing downstream can change it.

<figure class="diagram-gap"><span aria-hidden="true">🖼️</span><figcaption><b>Diagram:</b> module flow · 9 modules, one direction<br><small>This picture is in the original document and will be redrawn here.</small></figcaption></figure>

Arrows run one way: nothing below the math engine can change the value it computed, and the mapper and the narration only read from the step array and the playback position.

### 9.1 Module contracts

| Module | Input | Output | Must guarantee |
| --- | --- | --- | --- |
| a. Parser and validator | Field text, toggles, operator, start | A valid expression {a, op, b, s}, or a list of errors with codes and messages | Integers only; sizes 0–999; 0 carries no sign; ÷ 0 is valid (a teaching case); a non-whole quotient is an error carrying its exact fraction |
| b. Math engine | Expression | {kind: value, value} or {kind: undefined, reason: no-answer or every-number} | Pure integer arithmetic; knows nothing about animation |
| c. Reasoning generator | Expression plus engine result | Step array (§6) | Pure and deterministic: the same input gives an identical array; runs the six invariants (§6.1) and never hands over an array that fails |
| d. Coordinate mapper | Every position in the array(s), canvas width | Scale {lo, hi, px per unit, tick, label step} with toPx and toUnit | Linear; contains every position (§8.5) |
| e. Playback engine | Step array, speed | Current {index, progress, playing} | Driven by requestAnimationFrame; frames from an older expression are dropped by a generation number |
| f. Renderer | Array, index, progress, scale, theme | SVG line, lanes, ghosts, token; DOM chrome | The picture for any (index, progress) is a pure function of those values, so any jump is correct |
| g. Narration and knowledge | Current step, mode | Narration, Why, equation ladder, drawer | The narration region is aria-live polite |
| h. Mode controllers | User actions | Expressions for a; predictions, comparisons, ladders, stages | Never compute a result themselves; always ask b |
| i. Errors and accessibility | Exceptions, preferences | Inline messages, a non-blocking banner, focus and keyboard handling | No uncaught error reaches the console |

### 9.2 State machine

| State | Entered when | Play | Step → | Step ← | Edit |
| --- | --- | --- | --- | --- | --- |
| Invalid | An input fails validation | Disabled | Disabled | Disabled | Validate again |
| Ready | A valid expression produced an array; index 0, paused | To Playing | Animate step 1, then Paused | Disabled | Rebuild, to Ready |
| Playing | Play pressed | To Paused | Pause, animate the next step, then Paused | Pause, show the previous end state | Cancel, rebuild, to Ready |
| Paused | Pause pressed or a manual step finished | To Playing | Animate the next step | Show the previous end state | Rebuild, to Ready |
| Finished | The last step's end state is reached | Restart, to Playing | Disabled | Previous end state, to Paused | Rebuild, to Ready |
| Held (teacher-led) | The next step would reveal the answer | Disabled until Reveal or a prediction | Disabled | Allowed | Rebuild, to Ready |

Rapid input: every edit increments the generation number and cancels the frame loop; callbacks carrying an old number exit at once. Holding → repeats at most one step per 120 ms. A resize recomputes the scale's pixels and keeps index and progress.

### 9.3 Hard invariants

1. The engine's value is computed before the array and is never derived from positions.
2. The token's final place equals start + value, checked when the array is built.
3. Generation is pure: arrays for the same input are deep-equal.
4. The scale is computed once per expression and never changes during playback.
5. Rendering any index is independent of how it was reached.

At load, a silent self-check builds the arrays for every expression with a and b from −12 to 12, all four operators and starts 0 and 5 (5,000 expressions; non-whole quotients are skipped by the validator) and verifies invariants 2 and 3 plus §6.1. A failure shows a non-blocking banner, never a console error.

### 9.4 Limitations of version 1

- Integers only; sizes up to 999 for A, B and the start.
- Division animates only whole-number quotients; others show the exact fraction and a notice.
- One operation per expression; mixed expressions appear only as worked examples in stage 8.
- Three fixed pattern ladders; two expressions in Compare.
- Spoken explanations are never graded; the app never evaluates free text.
- English only; nothing is saved between sessions.
- Built and tested for Chrome desktop and tablets 768 px and wider; other browsers best effort.

## 10. Mathematical edge cases

Every edge case has a specified result, picture and sentence; none falls through to an error. Scale figures are for a 1366 px window.

| Case | Example | Result | What the app shows |
| --- | --- | --- | --- |
| 0 as A in + or − | 0 + (−4); 0 − 6 | −4; −6 | op1 is a zero trip: the token pulses in place, "a trip of no steps" |
| 0 as B in + | 6 + 0 | 6 | A zero trip, no movement |
| 0 as B in − | 6 − 0 | 6 | The token flips a zero trip and nothing moves: "flipping no trip changes nothing, so −0 = 0" |
| 0 as the count | 0 × (−4) | 0 | No hops: "zero copies" |
| 0 as the trip | (−3) × 0 | 0 | A flip of a zero trip |
| 0 as dividend | 0 ÷ (−5) | 0 | Target is a zero trip; the share is 0; check (−5) × 0 = 0 |
| Result 0 | 4 + (−4); (−4) − (−4); 0 ÷ 7 | 0 | Landing ring on 0; "back where you began" when trips cancel |
| Equal sizes | 5 + (−5); 5 − 5; 5 − (−5) | 0; 0; 10 | Cancellation named; 5 − (−5) narrated as "twice as far" |
| Divide by 0 | (−12) ÷ 0 | Undefined: no answer | §6.10; the result slot reads "undefined"; no landing ring |
| 0 ÷ 0 | 0 ÷ 0 | Undefined: every number works | §6.11 |
| Non-whole quotient | 7 ÷ (−2) | −7/2 | Text only, with the v1 notice |
| Largest product | 999 × (−999) | −998001 | Ticks and labels every 50,000; hops collapsed into "× 999 copies" |
| Largest sum | (−999) − 999 | −1998 | Ticks every 50, labels every 100 |
| Large start | Start 999, 999 + 999 | 1998, landing on 2997 | 0 stays in range so the line stays honest; ticks every 100, labels every 200 |
| Tiny trip on a large scale | 900 + 3 | 903 | The 3 is about 4 px: minimum marker plus the label "+3 (too small to draw at this scale)" |
| Negative start | Start −5, 8 + (−7) | 1, landing on −4 | Answer arrow from −5 to −4 labelled "= +1" |
| "−0" entered | Size 0 with the − toggle | 0 | The toggle turns neutral: "0 has no direction" |
| Malformed input | Empty, 1000, 2.5, letters | — | Inline message naming the problem; Play disabled while invalid |
| Edit mid-playback | Any change | — | Playback cancels; rebuild to step 1, paused; the prediction is cleared |
| Speed dragged during a flip | — | — | The rotation continues from its current angle at the new rate |
| Step back while playing | — | — | Pause, then the previous end state |
| Resize mid-step | — | — | Same step and progress at the new size |
| Theme or reduced motion toggled mid-step | — | — | Applied on the next frame; the step is not restarted |
| Rapid Space, or → held down | — | — | Space toggles once per press; → advances at most one step per 120 ms |

## 11. Phase 2 acceptance criteria

The file ships only when every box below is ticked, each by the test named in it.

- [ ] Exactly one .html file; it opens by double-click in Chrome with the network off, and DevTools shows no request beyond the file itself.
- [ ] No library, CDN, font, image or build step; every asset is inline.
- [ ] The load self-check passes on 5,000 expressions (§9.3) and its banner never appears.
- [ ] All four operations are correct for every sign combination: the 16 sign cases plus every row of §4 and §10 match hand calculation.
- [ ] The result is invariant to timing: one expression played at 12 s and at 0.6 s, stepped, scrubbed and restarted mid-step always ends at the same place with the same value.
- [ ] 8 − (−7) is explained by two labelled flips and an undo check; a text search of the file finds "two minuses make a plus" only where it is named as the slogan, never as a reason.
- [ ] (−3) × (−4) shows the distributive derivation line by line, with its trip picture (§6.6).
- [ ] Signed division is shown as b × c = a with a multiply-back check; there is no repeated subtraction anywhere.
- [ ] ÷ 0 shows "undefined" with its reason; 0 ÷ 0 shows its different reason.
- [ ] The scale adapts and nothing is clipped, tested with 1 + 1, 999 × (−999), start 999 with 999 + 999, and 900 + 3.
- [ ] Every step has narration and an expandable Why.
- [ ] Play, Pause, Step back, Step forward, Reset, Restart and the scrubber all work; speed changes take effect mid-step; the slowest setting measures at least 10 s per step by stopwatch.
- [ ] Prediction, Compare and Pattern modes work for every preset, and each diagnosis in §7.4 fires on its own example.
- [ ] Knowledge bites are all collapsed on load.
- [ ] Measured canvas share is at least 70% at 1366 × 768, 1024 × 768 and 768 × 1024; no horizontal scroll; no layout shift when Why opens, a mode changes or the drawer opens.
- [ ] Chrome's performance panel shows about 60 fps through the longest storyboard.
- [ ] Space, ←, →, Home and End work; every control shows a focus ring; with reduced motion on, nothing tweens and manual stepping still works.
- [ ] Both themes meet the contrast values in §8.1.
- [ ] The console stays empty through a full session that touches every control.
