# This phase: the specification and the bindings

Write `specimen/structures.yaml`, `specimen/facts.yaml`, one file per operation under
`specimen/operations/`, and `specimen/bindings.yaml`. Read the code that serves each
interface down to where the decision is taken — the controller, the service, the
validation annotations, the queries, the security configuration, the database constraints.

## In this order

1. **Structures.** The business concepts the interfaces show and accept, with their
   fields. The form of a value (required length, format, bounds) is written on the field,
   once, from the validation the code applies. Not every response type is a structure: a
   wrapper, a page, an error body are not. A link between two concepts with no life of
   its own (a like, a membership) is not a structure either: it is a fact.
2. **Operations**, one per thing a caller can ask — normally one per interface that is
   not a plain read by identity, and one per read that takes inputs worth a rule (a
   search, a filtered or paged list). For each, **whole**:
   - every input, by a business name; whether it is optional; which field it is;
   - an input rule for each way the code refuses a value (missing, malformed, too short…);
   - a requirement for each condition on the situation the code checks before acting
     (signed in, exists, is the owner, not already taken…), with the refusal otherwise;
   - what an accepted call answers;
   - an effect for each thing an accepted call changes, each on its own. Write `then` in
     terms when the terms can say it; otherwise one plain sentence in `says`.
   Name a rule by what it demands (`owner`, `title-given`), a refusal by what the caller
   is told in business terms (`forbidden`, `title-missing`). Two rules whose refusals the
   code does not distinguish may share one refusal name.
3. **Facts**, as the operations need them. One fact per statement, shared by every
   operation that requires it. Positive, in business terms, about the situation — never
   about what the call sends (that is an input rule).
4. **Bindings.** A projection for each interface that shows a structure. A trigger for
   each operation: where each input travels, the status and the place of the answer of an
   accepted call, the status of each refusal — as the contract or the code says.

## What is not allowed

- A route, a status code, a table or a class name in `structures.yaml`, `facts.yaml` or
  an operation.
- An "otherwise" rule that says what happens when no other rule applies.
- A rule you did not read in the code or the contract.

## Done when

`{{specimen}} check .` reports no problem, and none of these gaps:
`operation-without-trigger`, `refusal-not-translated`. The gaps `rule-without-scenario`
are expected: the scenarios come next. Look at `interface-not-bound` and
`structure-not-shown` one by one: bind it, or be able to say why it stays.

End with a short message: the operations, the number of rules, and what you could not
express with the terms you were given (each with the file where a `says` or an empty
`condition` stands for it).
