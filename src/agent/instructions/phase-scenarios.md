# This phase: the scenarios

Write the scenarios under `specimen/scenarios/<operation>/`, so that every rule of every
operation has at least one scenario that proves it. The target is running and seeded:
`{{specimen}} play . <operation>/<slug>` resets it, plays one scenario and shows what was
answered.

## Which scenarios

Start from the rules, one operation at a time (`{{specimen}} check .` lists the rules no
scenario proves yet):

- **The accepted call**: everything required holds, every input is valid. It proves the
  effects that apply. If an effect has a `when`, one scenario where it holds and one where
  it does not.
- **A requirement**: one scenario where that fact — and **only that one** — does not
  hold. A call that is refused for two reasons at once proves neither.
- **An input rule**: one scenario where that constraint — and only that one — is
  violated. For a bound (a minimum length of 8), two scenarios, one on each side: the
  shortest value accepted, the longest refused.
- **A read with inputs** (a filter, a page): a scenario per input that changes what is
  answered.

## How to write one

- Every scenario starts from the starting state — the target is reset before each. Read
  the seed (`specimen/target/seed.sh`) to know what is there: its actors, its instances,
  their identifiers.
- Bring the system to the situation with `arrange` calls. If the starting state already
  holds what you need, use it.
- Literal values, plain and distinct (`"lamp"`, `"ann@shop.test"`). Never a value that
  depends on the day or on chance.
- An identifier that an `arrange` call will create is the one the reset makes it be:
  play the scenario once to see it, then write it.
- `says`: one sentence a business reader would agree with, saying the rule, not the call.
- A file name that says the case: `not-the-owner.yaml`, `password-of-seven-characters.yaml`.

## Play each one, and read the answer

After writing a scenario, play it. Compare the answer with what you meant:

- The call went through where you meant a refusal, or the reverse: your scenario does not
  reach the situation. Fix the scenario.
- A status the trigger does not declare, an answer of another shape than the interface
  declares: read the code again. If you had misread it, correct the binding or the
  interface. If the code or the contract says one thing and the target answers another,
  change nothing and keep it for your final message.
- The rule itself is contradicted — the target accepts what the rule refuses: same thing.
  Correct the rule only if the code, read again, says you misread it.
- A scenario that cannot be played (`unplayable`): the message says what is missing.

Do not write a scenario's answer anywhere. Do not touch `specimen/references/`: playing
keeps nothing, and the references are recorded by the tool once this phase is done.

## Done when

`{{specimen}} check .` reports no problem and every scenario plays. A rule you could not
reach with any scenario stays as a `rule-without-scenario` gap: list each one in your
final message, with why (the situation cannot be arranged through the interfaces, the
rule guards something only another system triggers…).

End with a short message: how many scenarios, the rules left without one and why, and
every contradiction between what is declared and what the target answered.
