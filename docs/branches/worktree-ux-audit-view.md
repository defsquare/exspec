# worktree-ux-audit-view

## Frame

**Goal.** The page of `exspec view`, read on Petclinic (361 rules, 95 of them not holding),
says first what is wrong with the target, and keeps the gates of an operation readable
while the proof of a rule or a scenario is open:

- the overview lists what does not hold apart from what is not shown;
- the structures and their operations are one list, the operations folded under their
  structure;
- the gates are drawn at their size beside a panel;
- the link to the checks of the extraction is not read as "the target has no problem";
- a rule of the gates is reached and its panel closed from the keyboard.

**Non-goals.** The data the page is given (`src/cli/view.ts`, `src/derive/`): only
`src/cli/view.html.txt` changes. The other findings of the audit, below.

## Journal

- The four changes, in the thread — one module, no brief. Checked in a browser at 1440,
  1200 and 390 px on the Petclinic page rebuilt from its own data with the new template:
  20 lines under "Rules that do not hold", the 75 others in 10 lines by rule (16 since
  the challenger's verdict, below); the gates
  640 px wide at 1440 and 1200 with a panel open (299 px before); a gate takes the focus
  and opens its rule; Escape closes. `bun test` 210 pass, `bun run check` clean.
- One list for the two columns, asked by the user after the first four: a structure is a
  `<details>`, unfolded when the reader walks into it, folded after that only by the
  reader; one with no operation is a plain row. Checked in the browser: a fold survives a
  walk within the structure, the gates keep 640 px beside a panel.
- A measure in place of an operation's dot, asked by the user: the dot was red for one
  rule contradicted of nineteen. A bar of the rules held, wrong and left, and the count of
  the wrong ones. A structure keeps the count of its operations: the same bar on it was
  tried and taken away, its number read as the operations'. Checked in the browser: the measures of the 37 operations add up to
  the overview's 266, 20 and 75.
- The scenarios under the gates are taken away, asked by the user: a rule's panel lists
  them. Kept under the gates, the scenarios no rule lists — one with no reference yet in an
  extraction without the roles, one whose rule is not of the operation — which nothing
  else would reach.
- A scenario's panel is stacked on its rule's, asked by the user: the rule's edge stays in
  view above and to the left of it and leads back, as do Close and Escape. The rule under
  is the one the reader came from when the scenario proves it, else the first it proves.
- The panels on the right take 40% of the page, 28rem at least; in a rule's panel a
  scenario is a card that opens it whole. Both asked by the user.
- The path a scenario takes is blue, asked by the user: in red, the path of a scenario
  that holds read as an error. Through the gates it is a band from blue to violet to cyan sliding down,
  still under `prefers-reduced-motion`; the judged call of a sequence is the same blue.
  Red is left to a verdict and to the status the target answered instead.
- A rule of the gates says its verdict by a mark in its corner, asked by the user: its
  edge is grey, and the path's when the scenario goes through it. The colour of the path
  was first named `taken`, as the gates' own `taken(n)`: inside them it was a function,
  and the arrow and the ends of the band were drawn black — renamed `pathColor`.
- The walk by the keyboard, asked by the user: `&` (or `1`) goes to the list; in it the
  arrows move and fold, Enter opens; into an operation the focus is on its first rule, the
  arrows moving from row to row and along the marks of an input; into a rule, on its first
  scenario, the arrows moving to the next; in a scenario the arrows go from Close to
  each body sent or answered, and fold it; Escape gives the focus back to the scenario, then to the rule, the reader was
  on. With Cmd the browser keeps `&` for its first tab: the key is read with or without.
- A scenario of a rule's panel draws its path through the gates as soon as it has the
  focus, asked by the user: the gates are drawn again with it, and without it at the blur.
- The keys are said where they act, asked by the user: `&` at the head of the list and
  its arrows at its foot, the gates' in their legend, the scenarios' beside their heading,
  `esc` on Close. None where nothing hovers.
- Challenger (opus), on `git diff main...worktree-ux-audit-view`, by reading alone: merge
  after fixes, nothing Critical, no concept without its ADR. Important, all taken: the
  branch started from a commit `main` no longer holds — rebased; "Rules not shown" made
  one rule of every rule of the same name, a heuristic on names ADR-0011 had set aside —
  only a shared rule is grouped now, 16 lines on Petclinic, and a line whose causes differ
  says so; the focus moved under a pointer too, drawing a path nobody asked — it follows
  the keyboard only; this file was not emptied. Minor, fixed: `onclick` in `h()` and
  `s()` had no caller left; the names `left`, `rest`, `fold`, `flow`, `at`, `next`,
  `from`, `.name`; the arrows did nothing on Close in a rule's panel; `Object.groupBy`
  left the page blank before Safari 17.4; a blur with no gates to draw again raised; two
  greys for "declared only". Kept against it: `&` is read with Cmd held, asked by the
  user. Read again in a browser at 1440 px, by the keyboard and by the pointer.
- Not checked: the page of an extraction without the roles (`mode` other than `roles`) —
  its headings become "Rules refuted" and "Rules not verified", no data at hand to draw it.

## Backlog

- A verdict is a colour alone on a scenario's chip, and amber is in no legend.
- No filter of the overview by verdict.
- `open-access` is drawn with an exit "none, refused with 200".
- Under 900 px the two lists are cut at 13rem with nothing saying they scroll.
- No `aria-current` on the row that is on; the confidence of a judgement has no label.
