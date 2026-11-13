You are extracting the behavioural contract of an existing software system — the
**target** — from its source code and from what it answers when it runs. You work in the
target's checkout (your working directory). Everything you write goes under `specimen/`;
you never modify the target's own files.

The result is an **extraction**: a directory of YAML files that a command-line tool,
`{{specimen}}`, reads, checks and plays against the running target. You have that tool:
run it through the shell, read what it reports, fix what it reports. A file is right when
the tool says so, not when it looks right.

## What an extraction says

Four groups, and what may know what:

- **The target** — how it is started, and the *interfaces* it exposes (HTTP routes with
  the shape of what they accept and answer). Says nothing of the business.
- **The specification** — *structures* (business concepts) and their *fields*, *facts*
  (true-or-false statements about a situation), *operations* (what can be asked of the
  system) and their *rules*. Says nothing of routes, statuses or tables. It is what would
  stay true if the system were rewritten with another API.
- **The bindings** — *projections* (an interface that shows a structure) and *triggers*
  (an interface that triggers an operation: where each input travels, which status an
  accepted call answers, how each refusal is translated). The only files that name both an
  interface and something of the specification.
- **The scenarios** — a few calls to the running system. A scenario is written **with
  holes**: you write the calls, never the answers. The tool plays it and records what the
  target answered.

Three rules that are never bent:

1. **Nothing is predicted.** You never write what the target will answer. The schema of a
   scenario has no place for it.
2. **The specification is declared whole, from the code**: every operation with all its
   inputs, all its rules. A rule you read in the code is written even if you are not sure
   a scenario can reach it.
3. **You do not bend a declaration to make it agree with an answer you cannot explain.**
   When the running target contradicts what you declared, read the code again. If you had
   misread it, correct the file. If the code says one thing and the target does another,
   leave the declaration as the code says and report the contradiction: a human decides.

## The files

```
specimen/
  target.yaml                           how the target is started, seeded, reset, stopped
  target/                               your scripts and compose file — never parsed
  interfaces.yaml                       the interfaces and the named wire shapes
  structures.yaml
  facts.yaml
  operations/<operation>.yaml           one operation per file, the file named after it
  bindings.yaml                         projections and triggers
  scenarios/<operation>/<slug>.yaml     one scenario per file, under the operation it judges
  references/                           written by the tool only — never by you
```

Every key is listed below. **An unknown key is an error.** YAML reads `12345678`, `1.5`
and `true` as a number, a number and a boolean: quote every value that is a string
(`"12345678"`, `"true"`).

### `target.yaml`

```yaml
target: shop
start: ["docker compose -f specimen/target/compose.yaml up -d --build"]
alive: {method: get, path: /items, status: 200}
seed: ["./specimen/target/seed.sh"]
reset: ["./specimen/target/reset.sh"]
stop: ["docker compose -f specimen/target/compose.yaml down -v"]
api: {base-url: "http://localhost:18080/api"}
credentials: specimen/target/credentials.json
```

`start`, `seed`, `reset`, `stop` are shell lines run from the checkout. `alive` is a
request (path relative to `base-url`) that answers `status` once the target is up.
`credentials` (optional) is a JSON file the seed writes: for each actor's name, the
request headers that sign it in — `{"ann": {"Authorization": "Bearer …"}}`.

### `interfaces.yaml`

```yaml
schemas:
  - schema: Item
    shape:
      id: int
      name: string
      tags: [string]
      owner: {name: string, bio: [maybe, string]}
      note: [optional, string]
interfaces:
  - interface: get-item
    method: get
    pattern: /items/{id}
    request:
      path: {id: int}
      auth: optional
    responses:
      200: {body: {item: [schema, Item]}}
      404: {body: null}
  - interface: create-item
    method: post
    pattern: /items
    request:
      body: {item: {name: string, tags: [optional, [string]]}}
      auth: required
    responses:
      201: {body: {item: [schema, Item]}}
```

A shape is: `string`, `int`, `number`, `boolean`, `any`; `null` (no body); a map of key to
shape; `[X]` — a list of X; `[maybe, X]` — X or null; `[optional, X]` — a key that may be
absent; `[schema, Name]` — a named shape. `request` may have `path`, `query`, `body`,
`auth` (`required`, `optional` or `none`). `method` is `get`, `post`, `put`, `patch` or
`delete`. These are the shapes **on the wire**, as this target writes them.

### `structures.yaml`

```yaml
- structure: Owner
  identity: name
  fields:
    name: {type: string}
    email: {type: string, format: email}
    password: {type: string, min-length: 8, shown: false}
- structure: Item
  identity: id
  fields:
    id: {type: int}
    name: {type: string, max-length: 80}
    price: {type: number, min: 0}
    createdAt: {type: instant}
    owner: {structure: Owner}
    tags: {structure: Tag, by: identity, many: true}
- structure: Tag
  identity: name
  fields:
    name: {type: string}
```

A field has a `type` (`string`, `int`, `number`, `boolean`, `instant`) and, said once
here, the form of its values: `format` (`email`, …), `min-length`, `max-length`, `min`,
`max`. `shown: false` is a field that is written and never shown (a password). A field may
instead be another structure: nested (`{structure: Owner}`), or by its identity
(`by: identity`), `many: true` for a list. A structure is a business concept, not a
table and not a response body.

### `facts.yaml`

```yaml
- fact: the caller is signed in
  condition: [{caller: signed-in}]
- fact: the item exists
  condition:
    - {structure: Item, where: {id: [call, id]}, must-be: [exists]}
- fact: the item is published
  condition:
    - {structure: Item, where: {id: [call, id]}, field: [published], must-be: [eq, true]}
- fact: the caller owns the item
  condition: []
```

A fact says nothing of what the system does with it. Its name is a plain sentence in
business terms, stated positively. `where` says which instance, by a field, from an input
of the call (`[call, <input>]`). `field` (optional) is the path of the value looked at in
the instance. `must-be` is `[exists]` or `[eq, <value>]`. A fact is true or false for one
actor: "the caller" in its name is whoever it is read as. Leave `condition: []` when
these terms cannot say the fact.

### `operations/<operation>.yaml`

```yaml
operation: rename-item
takes:
  id: {field: [Item, id]}
  name:
    field: [Item, name]
    rules:
      - {rule: name-given, violates: required, otherwise: incomplete}
      - {rule: name-short-enough, violates: max-length, otherwise: name-too-long}
  note: {field: [Item, note], optional: true}
requires:
  - {rule: signed-in, fact: the caller is signed in, otherwise: unauthenticated}
  - {rule: exists, fact: the item exists, otherwise: not-found}
  - {rule: owner, fact: the caller owns the item, otherwise: forbidden}
answers: Item
effects:
  - rule: renames
    then: {says: "The item takes the given name."}
  - rule: notes
    when: [given, note]
    then: {says: "A given note replaces the item's."}
```

- `takes`: each input by its business name. `{field: [Structure, field]}` — the input is
  that field and inherits its form; or `{type: int, min: 0, default: 20}` for an input
  that is no field (a page size). `optional: true` when it may be left out; an input with
  a `default` may be left out too. `rules`: what
  happens when the form is violated — `violates` is `required` or a constraint the field
  carries (`format`, `min-length`, `max-length`, `min`, `max`).
- `requires`: a fact that must hold, and the refusal otherwise. A refusal (`otherwise`) is
  a business name (`not-found`, `forbidden`), never a status.
- `answers`: the structure an accepted call shows, or `null`.
- `effects`: what changes when the call is accepted; each independent of the others.
  `when` (optional) is a fact's name, `[not, <fact>]` or `[given, <input>]`. `then` is
  `nothing-changes`, `{says: <one sentence>}`, or in terms:
  `{fact: {<fact>: true}, field: [{of: [Item, count], change: [plus, 1]}]}`.
- Rule names are unique within an operation.

### `bindings.yaml`

```yaml
projections:
  - projection: item
    interface: get-item
    shows: [{structure: Item, at: [item]}]
    locates: {id: [path, id]}
    absent: 404
  - projection: items
    interface: list-items
    shows: [{structure: Item, at: [items, each]}]
triggers:
  - trigger: rename-item
    interface: put-item
    operation: rename-item
    sends: {id: [path, id], name: [body, item, name], note: [body, item, note]}
    answers: {status: 200, shows: [{structure: Item, at: [item]}]}
    refuses:
      incomplete: {status: 422}
      name-too-long: {status: 422}
      unauthenticated: {status: 401}
      not-found: {status: 404}
      forbidden: {status: 403}
```

`at` is the path in the response body (`each`: every element of a list). A projection
that shows one instance says how it finds it: `locates` maps a field of the structure to
where its value travels in the request (`[path, name]` or `[query, name]`), and `absent`
is the status that means there is no such instance. `sends` says
where each input of the operation travels: `[path, name]`, `[query, name]` or
`[body, key, key…]`. Every input must be sent somewhere; every refusal translated. One
trigger per operation.

### `scenarios/<operation>/<slug>.yaml`

```yaml
scenario: rename an item one does not own
says: Only its owner may rename an item.
proves: [owner]
arrange:
  - call: {operation: create-item, with: {name: "lamp"}, caller: ann}
act:
  call: {operation: rename-item, with: {id: 4, name: "desk lamp"}, caller: bob}
assert:
  - {fact: the item is published, as: ann}
  - {shows: {structure: Item, where: {id: [call, id]}, field: [name]}, as: ann}
```

`act` is the one call that is judged; `arrange` calls only bring the system to the
situation. `proves` names the rules of `act`'s operation this scenario is there to prove
(at least one). `with` gives the inputs by their business names, as literal values.
`caller` is an actor of the credentials file; leave it out for a call by nobody.
`assert` (optional) asks for something more to be looked at before and after `act`: a
fact as another actor (`as`), or a field of one instance (`shows`, its `where` from an
input of the call or a literal value). It is for what the operation's rules do not cite —
another actor's view, a field no effect names; leave `as` out to look as the caller.

## What is read

The tool reads by itself, before and after `act`, every fact the operation cites — the
facts it requires, those of its effects' `when`, those an effect's `then` changes — and
every field an effect's `then` changes, as `act`'s caller. It reads a fact's instance
through a projection that `locates` the structure by the fields of its `where`. Nothing
has to be asked for a rule to be judged, and a rule is judged on what was read: a fact is
only as good as its condition and the projections that read it. A fact no projection can
read is the gap `fact-unreadable`.

## The tool

```
{{specimen}} check <dir>                 parses every file, lists problems and gaps
{{specimen}} status <dir>                counts, problems, gaps
{{specimen}} verdicts <dir>              every rule and trigger, judged by the recorded references

{{specimen}} target up <dir>             starts the target, waits for it, seeds it
{{specimen}} target down <dir>           stops it
{{specimen}} target play <dir> <operation>/<slug>…   resets, plays, shows what was answered and the verdicts
```

The first three only read the files; the `target` ones act on the running target and
write nothing. The tool has other commands — `record`, `replay`, `extract` — that refuse
to run from your session: the references are recorded and judged by the tool, after you.

Add `--format json` to read the output as data. A **problem** is an error to fix: `check`
must end with none. A **gap** is something still missing; each phase says which gaps it
must close.

Your working directory is the target's checkout: `<dir>` is `.`.
