# feat/input-rules-in-view

## Frame

**Goal.** In `specimen view`, an operation shows first what it asks of the situation and
what it does; the requirements about the form or the presence of one input — 137 of 174
on one target, 17 of 19 on one operation — are gathered under the input they are about,
in a compact block. Asked by the user: they matter, but not at the same level.

How the page knows: the reader says it, with a key on the requirement naming the input
(chosen by the user over a deduction from the rules' names).

**Non-goals.** Changing a verdict or what the judge is given. Bounds on a structure's
field (ADR-0010 set them aside). Reading the largest target again.

**How it is judged.** One target read again with the key, its page looked at: the main
list of an operation holds no requirement about one input's form unless it does not hold.

## Journal

- **The challenger on the design: go, with changes**, all taken. The test given to the
  reader is "the request alone, with nothing stored, is enough" — "about one input" made
  real rules hesitate (a uniqueness check answered as a form check). The judge is kept
  from the key, by named keys rather than by dropping one. A new ADR, not an amendment of
  an accepted one. The page already drew the extraction's rules declared under an input:
  the line carries `input`, the word it had.
- **The key, its check, the judge's task, the line, the reader's instruction** (`5a953f7`,
  implementer; reviewer: conforms, approved; two Minor on comments).
- **The page**: one stop "inputs" in the column, a mark and a word per requirement by
  input; looked at on a copy of one reading with the key guessed from the names, 18
  requirements of one operation in five rows.

## Backlog

- **One target read again with the key**, its page looked at.
- **The runs were made before the reads were held** (moved from `docs/backlog.md`).
  - **Seen.** Until the last fixes of the branch a session's reads were held by a callback
    the SDK calls only for what it would ask a person: nothing inside the checkout. Read in
    the transcripts of the three targets: none of the 205 builder sessions read or searched
    outside its own files; nearly every reader searched from the checkout's root at least
    once, and 2 such searches on Conduit, 14 on Petclinic, 21 on Kadai came back naming
    files of the earlier extraction or of the evidence. A hook holds every call now; a
    reader refused its searches from the root narrows them and ends (one operation tried).
    The judgements stored under the checkouts read as stale: their hash now covers the
    requirements and what the target runs with.
  - **Settled.** The separation is built (ADR-0010): a hook on every call, not a brief.
  - **Next.** Read one whole target again with the hook — Conduit, 7 USD — and compare the
    rules with the run kept: whether a reader that cannot search from the root reads less,
    and whether any rule of the kept run came from a file it should not have seen. Judge
    again what is kept, or drop it.
  - **Source.** `docs/branches/spike-three-roles.md` at `d88b471`, "The challenger before
    the merge"; the transcripts are under `~/.claude/projects/` of the machine that ran
    them, not in the repository.
