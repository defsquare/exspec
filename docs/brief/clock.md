# Fineract — the life of a loan, recorded, replayed, replayed another day

Hand-written from the runs of 2026-11-11 (each replay's JSON under `replays/`). The
question: does a reference recorded on one day hold when the target's clock has moved?

## The target and its clocks

`apache/fineract:latest` on Postgres 18, 280 tables in the tenant schema. Every rule of the slice
that looks at "today" reads Fineract's **business date** (`DateUtils.getBusinessLocalDate()`,
the row `BUSINESS_DATE` of `m_business_date`, read per request once the configuration
`enable-business-date` is on). No class of the slice reads the tenant's wall clock
(`getLocalDateOfTenant` appears only in the calendar of meeting-linked loans). The JVM's clock
reaches the audit columns only (`created_on_utc`, `last_modified_on_utc`, `made_on_date_utc`).
The database's `now()` is not read by the slice.

So the clock moved here is the business date, set by `seed.sh` (`BUSINESS_DATE`, default
2026-11-11 = D) through Fineract's own API — no container clock touched. The JVM and the database
ran on the real day, which only the audit columns show. Not moved: the JVM clock (the image is
Alpine, running as `nobody`, without libfaketime — moving it needs a derived image) and the
database's.

## Recording (`record`, two fresh stacks)

| | |
|---|---|
| operations · scenarios | 12 · 52 |
| tables in the schema · watched | 280 · 6 (`watched.edn`) |
| readings played · scenarios with readings | 43 · 31 |
| unstable | 3 |
| masked leaves | 927: 619 as tokens, 308 as the wildcard |
| record (two stacks, starts included) | 1550 s; a pass of the 52 scenarios ≈ 240 s, a start ≈ 9–10 min |

**The schema is too big to restore and read whole.** Restoring the 280 tables took 3.3–4.3 s,
reading them 1.5 s; a scenario costs one restore and two reads per play, two plays when it
writes: 18.7 s for the first scenario tried, ~16 min a pass. `spike.harness watch` plays every
scenario once over the whole schema (409 s) and keeps the tables any of them wrote, prepared calls
included: `m_client`, `m_loan`, `m_loan_repayment_schedule`, `m_loan_transaction`,
`m_loan_transaction_repayment_schedule_mapping`, `m_portfolio_command_source` — then 1.5–9 s a
scenario. Left out by the binding (`:unwatched-tables`): the scheduler's eight tables (a job runs
every minute and writes `batch_*`, `job`, `job_run_history`) and the two notification tables,
written by a listener after the call has answered (seen as a side effect of the next call). A
table a scenario writes and no pass of `watch` saw leaks into the next scenario; nothing checks it.

**Masked leaves by kind** (`clojure -M:dev -m spike.fineract.noise noise dev/spike/fineract`):

| kind | leaves | where |
|---|---|---|
| a schedule row paired with an id drawn in another order (`installment`, `duedate`, `fromdate`, the row's id) | 417 | side effects |
| a technical timestamp (`…_utc`) | 402 | side effects |
| the order of a list: two transactions of one date | 64 | response, readings — the 3 unstable |
| a key drawn per command (`idempotency_key`) | 44 | side effects |
| a date the business computed | **0** | |
| an amount | **0** | |

No business date and no amount is masked: two stacks on the same business date record every
date the business derives from today as a constant. The API shows no technical timestamp at all;
every masked leaf the verdict reads is the order of the transaction list.

**The three unstable scenarios** (`repay the whole loan`, `repay more than is owed`, `list the
transactions of a repaid loan`): the disbursement and its accrual carry one date, and
`GET /loans/{id}/transactions` answers them in either order — and the transactions' ids are not
the database's sequence's (an id pool held in the JVM survives the restore: they differ between
stacks). A fourth scenario (`write off an active loan`) drew the same order on both recording
stacks and the other order on the first replay.

## Replays

| replay | business date | green | red | unstable | unseen | wall time |
|---|---|---|---|---|---|---|
| same day 1 | D 2026-11-11 | 48 | 1 | 3 | 3 | 789 s |
| same day 2 | D | 48 | 1 | 3 | 3 | 760 s |
| same day 3 | D | 49 | 0 | 3 | 4 | 743 s |
| **D + 1 business day** | 2026-11-12 | **29** | **20** | 3 | 1 | 733 s |
| **D + 35 days** | 2026-12-16 | **17** | **32** | 3 | 0 | 743 s |

Same day: the one red, twice of three, is `write off an active loan` — the list's order (above),
drawn alike on both recording stacks and otherwise on two replays: (d), an order the target does
not determine. The unseen side effects are the schedule rows' pairing with their ids. Nothing
about the clock: a replay costs 12–13 min, of which the stack's start is 9–10.

### D + 1: every red scenario classed

(a) a technical timestamp that should have been noise — **none**: the API shows none.
(d) other — **none**.

**(c) a branch changed because a date crossed today — 8**, each refused at D and accepted at D+1
(`[:response :status]` 400/403 → 200, the refusal's body gone, and the readings show the change):

| scenario | leaf |
|---|---|
| create a client activated tomorrow | `[:response :status]` 400 → 200 (`error.msg.clients.activationDate.in.the.future`) |
| create a pending client submitted tomorrow | `[:response :status]` 400 → 200 (`…submittedOnDate.in.the.future`) |
| submit a loan dated tomorrow | `[:response :status]` 403 → 200 (`…submittal.cannot.be.a.future.date`) |
| approve a loan dated tomorrow | 403 → 200; reading `status.id` 100 → 200 |
| reject a loan dated tomorrow | 403 → 200; reading `status.id` 100 → 500 |
| disburse a loan dated tomorrow | 403 → 200; reading `status.id` 200 → 300 |
| repay dated tomorrow | 403 → 200; reading `totalElements` 2 → 3 |
| write off a loan dated tomorrow | 403 → 200; reading `totalElements` 2 → 3 |

**(b) a value the business derives from today — 12**:

| scenario | leaf that differs |
|---|---|
| create a pending client without a submission date | reading `timeline.submittedOnDate` `[2026 11 11]` → `[… 12]` |
| get a pending client | `[:response :body :timeline :submittedOnDate 2]` 11 → 12 |
| disburse an approved loan | `transactions[i].submittedOnDate` (the day a transaction is entered, the business date) 11 → 12; `summary.totalUnpaidPayableNotDueInterest` 2.4 → 2.8 (interest accrued up to today) |
| disburse a loan today, later than expected | the same two; `totalUnpaidPayableNotDueInterest` 0.0 → 0.4 |
| disburse a loan twice | the same two |
| undo the approval of a disbursed loan | the same two |
| repay part of the first instalment | `content[i].submittedOnDate` "2026-11-11" → "2026-11-12" |
| repay today | the same |
| repay before the disbursement | the same, and `totalUnpaidPayableNotDueInterest` 2.4 → 2.8 |
| repay nothing | the same |
| write off an active loan | `content[i].submittedOnDate` |
| get a disbursed loan with its schedule and transactions | `[:response :body :transactions i :submittedOnDate 2]` 11 → 12 |

The 8 of (c) also carry the (b) leaves where they read a transaction.

### D + 35: every red scenario classed

The first instalment of every loan of the scenarios falls due 2026-12-05 (disbursed or expected
11-05, monthly): at 12-16 it is overdue. (a) none, (d) none.

**(c) a branch changed — the same 8 as at D + 1**, accepted where D refused them (the date
"tomorrow", 2026-11-12, is now 34 days in the past).

**(b) a value the business derives from today — 24**: the 12 of D + 1, the dates now 12-16
(`timeline.submittedOnDate` `[2026 11 11]` → `[2026 12 16]`, two leaves of the triple), and 12
more that D + 1 left green, every one through what is overdue today:

| scenario | leaf that differs |
|---|---|
| submit a loan | reading `repaymentSchedule.periods[1].totalOverdue` absent → 112.0 — the schedule of a loan **not yet approved** shows an instalment overdue |
| approve a submitted loan · approve a loan before its submission · approve more than was applied for · approve a loan twice | the same leaf, before and after |
| reject a submitted loan · reject an approved loan | the same |
| undo an approval | the same |
| disburse a loan before its approval · disburse a loan not approved | the same |
| repay a loan not disbursed | the same |
| get a disbursed loan nothing was repaid on | `[:response :body :summary :totalOverdue]` 0 → 112.0, `principalOverdue` 0 → 100.0, `interestOverdue` 0 → 12.0, and `feeChargesOverdue` `0` → `0.0` — a zero written as an integer when nothing is overdue and as a decimal when something is: red on the type of a zero |

and the loans of D + 1's list add `summary.totalOverdue` 0 → 112.0, `totalUnpaidPayableDueInterest`
0 → 12.0, `totalUnpaidPayableNotDueInterest` 2.4 → 4.26.

Green at D + 35, 17: the creations of a client that do not look at today (and "activated today",
11-11, still in the past), the gets of a client, of an unknown loan, of the product, and every
refusal of `submit-loan` — a refusal reads no schedule.

## What would make (b) and (c) hold

1. **The clock held at replay** — replay with the reference's business date (`BUSINESS_DATE` = D).
   No code: it is what the three same-day replays did. It holds every scenario by never moving
   today: a rule whose branch crosses today is checked on one side only, forever. The cheapest;
   it changes nothing of what is measured.
2. **The scenario's dates written relative to today** — `[:today n]` in a call, resolved against
   the target's own clock read at the start of the pass (the binding's `:clock`,
   `GET /businessdate/BUSINESS_DATE`). Turns (c) back: "tomorrow" stays tomorrow. **Tried** (below).
3. **Today as an input of the fact** — a rule "the date is after today" reading the clock as a
   projection (`[:read {:path "/businessdate/BUSINESS_DATE"}]`), plus a date term to order it
   (question 5). Classes the scenarios of (c) correctly on any day; makes nothing green by itself.
4. **A noise class that keeps a relation** — a date leaf recorded as its offset to today
   (`transactions[i].submittedOnDate` = today + 0, `timeline.submittedOnDate` = today + 0), or to
   another leaf of the scenario (a due date = the disbursement + 1 month). Needed by every (b) once
   (2) moves the inputs: with every input relative to today the overdue amounts become invariant
   (nothing is ever overdue), and what is left differing is every echoed date, shifted by the same
   number of days. Not for a month's arithmetic: Nov 5 + 1 month and Dec 5 + 1 month are 30 and
   31 days.

## Can facts.edn say "the disbursement date is after today"?

No. What the vocabulary has and lacks, piece by piece:

- **today** — reachable here only because Fineract happens to expose its clock as a route:
  `[:read {:path "/businessdate/BUSINESS_DATE" :as nil} :body :date]` answers `[2026 11 11]`.
  A target that keeps "today" to itself (Petclinic's `LocalDate.now()` behind "a birth date in the
  future") has no such route. Missing in general: **a projection of the clock** — `[:today]`, a
  term of the situation the harness records with it (the date it held or read at that pass), so
  a rule evaluated on a recording is evaluated against the day of the recording.
- **the call's date** — `[:call :body :actualDisbursementDate]` is the string `"2026-11-12"` in the
  call's own `dateFormat`; an answer's date is the triple `[2026 11 12]`.
- **the order** — `:>` `:<` compare numbers only (a non-number makes the condition false), and no
  term turns either form of a date into a number: no substring, no parse. Missing: **a date term**,
  `[:date t]` reading a `yyyy-MM-dd` string or a `[y m d]` triple as one comparable value (an epoch
  day would let the present `:>` order it). Then the fact is
  `{:when [:> [:date [:call :body :actualDisbursementDate]] [:today]]}`.
- For (b), "due = disbursed + 1 month" needs **calendar arithmetic** too (a month is not a number
  of days): `[:+ [:date …] [:months 1]]`.

The 15 rules this leaves out are `rules.edn` › `:inexpressible`: 8 against today, 6 between two
dates of the call or of the target (they need the date term only), and one reading's value
(what is overdue).

### Remedy 2 tried: the dates relative to today, replayed at D + 1

A copy of this directory (not kept) whose `scenarios.edn` writes each 2026-11-dd as
`[:today dd−11]` (180 dates; 2008-12-31, before the office opened, stays absolute) and whose
binding reads the clock (`:clock {:read [:get "/businessdate/BUSINESS_DATE"] :at [:date]}`),
replayed against the **unchanged** reference — at D the copy sends exactly the reference's
requests — with the business date at 2026-11-12:

| | green | red | unstable | unseen |
|---|---|---|---|---|
| absolute dates, D + 1 | 29 | 20 | 3 | 1 |
| relative dates, D + 1 | **12** | **37** | 3 | 7 |

**What it did.** The 8 of (c) take their branch back: every `[:response :status]` equals the
reference again (400 / 403, the date "tomorrow" refused). And every scenario that echoes a date
went red instead: the 37 reds part **only on dates** — `errors[0].args[0].value` "2026-11-12" →
"2026-11-13", `timeline.*Date`, `repaymentSchedule.periods[i].dueDate` / `fromDate`,
`transactions[i].date`, `changes.approvedOnDate`, and a message quoting a date — never on a status,
an amount or a count (the report keeps five mismatches per root; none of those kept is anything
else). Twelve stay green: the refusals that echo no date and the reads of what does not exist.
So relative inputs trade (c) for a (b) on every echoed date: they hold only with remedy 4, a date
leaf compared as its offset to today.

## The spec layer, as it stands on D

`classify` (on a stack at D, 68 s with its start): 52 of 52 scenarios classed, 33 rules, 32
exercised, 30 shown; `write-off-loan › not-active` has no scenario. **8 rules have more than one
outcome** — every one an `otherwise` holding the scenarios of a date rule that is
`:inexpressible` (14 scenarios under a sentence not theirs: "approve a loan dated tomorrow" under
"the loan is approved on the date"). `spike.structures`: 65 claims verified, 3 declared only, 17
refuted — 15 a date or an amount (no type for `[y m d]` nor `1200.0`; a transaction's `date`
is `"2026-11-05"` through `GET /loans/{id}/transactions` and `[2026 11 5]` through
`GET /loans/{id}`, one field in two forms; a zero is `0`, any other amount `1200.0`), the
instalment's identity (`period` missing on the disbursement row of the schedule), and
`Loan.transactions` (keys a transaction shows and the declaration does not). A start of the stack took 9–10 min under the machine's
load of the evening (load 6–10) and about one with the load gone, the database restored from the
dump either way.

## What the harness needed, and what forced it

| change (`dev/spike/harness.clj`) | forced by |
|---|---|
| `:every-call-headers` of the binding on every request, readings and facts' reads included (`request`) | every Fineract call needs the tenant header and the user's credentials; a binding's `:headers` could not be reused — Conduit's hold a caller's token |
| `watch <dir>` writes `watched.edn`; the seed image, the restore and the reads narrowed to it (`seed-image!`, `with-target!`) | 280 tables: a restore 3–4 s, a read 1.5 s, ~16 min a pass; 6 tables watched, 1.5–9 s a scenario |
| `restore-watched!`, a DELETE per table, the foreign keys suspended | `db/restore!`'s one `TRUNCATE` is refused when a table outside the image references one inside it (`m_account_transfer_details` → `m_client`) |
| `:unwatched-tables` of the binding, left out by `watch` | a scheduler writing 8 tables every minute; a listener writing the notifications after the call answered |
| `[:today n]` in a call, resolved against the binding's `:clock` (`dated`, `clock!`) — the remedy tried | the scenarios' dates written relative to the target's today |

Request building and the record / replay path changed: Petclinic's control replay is below.

## What the shapes and the metamodel could not carry

- **An operation is an interface and a command.** Fineract multiplexes four transitions on
  `POST /loans/{loanId}` and two transactions on `POST /loans/{loanId}/transactions`, told apart by
  `?command=`. `operations.edn` names the interface only; each call repeats `:query {:command …}`,
  and nothing checks that an `approve-loan` call says `approve`.
- **A date and an amount have no type.** `[y m d]` and `1200.000000` are neither of the five types
  (`:date` wants a `yyyy-MM-dd` string, `:int` an integer): the structures check refutes them.
- **A structure nested at a path that is not a field**: an instalment lives at
  `repaymentSchedule.periods[*]`; `Loan` cannot declare the field, only `Instalment` its `:at`. The
  disbursement row of the schedule (period 0) has no `period`, the identity.
- **No write answers a structure**: every command answers an envelope (`{officeId clientId loanId
  resourceId changes}`), whose `changes` echo the input — nothing for `:shown-by`.
- **An order the target does not determine**, again (Petclinic's pets of one name): two
  transactions of one date. The scenario has no way to say "a set".
- **State past the database**: transaction and schedule ids come from a pool held in the JVM; the
  restore resets the sequences, not the pool. Harmless on the API (no id is judged there that
  moves, but for the transaction list) — and the schedule's rows pair with drawn ids.
- **The clock** (question 5): no projection of today, no date term, no calendar arithmetic.
- **The model has no "the target's clock"**: `StartingWorldState` is rows and a twin; today is an
  input of the seed here (`BUSINESS_DATE`) and of every rule that compares a date, and nothing in
  `Reference` records which day it was taken on.

## Verdict

The recording holds on a clock **only on the day it was taken**. Same day, three fresh stacks:
48–49 of 52 green, the rest an order Fineract does not determine — nothing about time. One
business day later, 20 of 52 are red; 35 days later, 32. None of them is a timestamp the noise
missed (the API shows none): 8 are rules whose branch crossed today, the rest values the business
derives from today (the day a transaction is entered, a pending client's submission, interest
accrued to date, what is overdue). Two stacks on one day never see those values move, so the
noise records them as constants: nothing is masked that should not be, and everything about today
is frozen. It holds under two conditions: the target's clock is an input the harness sets
(Fineract's business date, through its own API — most targets have no such knob, and then the
JVM's clock must be moved from outside), and the reference names the day it was recorded on and is
replayed on that day. What breaks first is the comparison, not the recording: writing the inputs
relative to today restores the 8 branches and turns every echoed date red (37 of 52), so a
reference that is to hold on another day needs a date leaf compared as its offset to today — a
relation, not a joker — and the rule layer a projection of today and a date term. Second, the size:
a schema of 280 tables restored and read whole costs ~16 min a pass; restricted to the 6 tables
the scenarios write, it costs 4 — with nothing to tell a table a new scenario writes from one it
leaks into the next.
