# Fit of the draft shapes — petclinic

Written by `spike.shapes`, never edited. A misfit is an instance the draft's shapes cannot say without a key or a term they lack.

## Per shape

| shape | instances | fit | misfit |
|---|---|---|---|
| detects | 7 | 7 | 0 |
| fact | 18 | 6 | 12 |
| interface | 43 | 21 | 22 |
| observable | 1 | 1 | 0 |
| operation | 37 | 10 | 27 |
| projection | 12 | 12 | 0 |
| scenario | 183 | 111 | 72 |
| structure | 6 | 6 | 0 |
| target | 1 | 0 | 1 |
| trigger | 37 | 36 | 1 |

## Misfits by reason

### fact

| reason | count | example |
|---|---|---|
| a count | 6 | `the clinic has a pet` — a count |
| a condition on the call's input | 5 | `a specialty has the body's id` — a condition on the call's input (its body or query) |
| a conversion of a value | 1 | `the pet is the owner's` — a conversion of a value ([:number …]) |

### interface

| reason | count | example |
|---|---|---|
| a type no answer shows: only noise, or an empty list | 22 | `failing-request` — a type no answer shows: only noise, or an empty list [:responses 500 :schemaValidationErrors :each] |
| a key absent from some answers | 9 | `add-owner` — a key absent from some answers [:request :body :id] |

### operation

| reason | count | example |
|---|---|---|
| otherwise after an effect not of facts | 20 | `list-owners` — otherwise after an effect not of facts (its when, their negation, is not of facts) |
| an effect conditioned on the call's input | 19 | `list-owners` — an effect conditioned on the call's input |
| a refusal with no fact to require: written as an effect | 18 | `fail-on-purpose` — a refusal with no fact to require: written as an effect |
| the accepted answer has no body | 13 | `update-owner` — the accepted answer has no body (answers names nothing) |
| the accepted answer shows no structure the spike declares | 4 | `page-owners` — the accepted answer shows no structure the spike declares |
| a requirement that is not one denied fact | 3 | `add-visit` — a requirement that is not one denied fact [:and [:present [:call :body :id]] [:not "a visit has the body's id"]] |
| an effect conditioned on the database's rows | 2 | `delete-specialty` — an effect conditioned on the database's rows |

### scenario

| reason | count | example |
|---|---|---|
| an instance appeared or vanished, no fact reads it | 33 | `add an owner` — an instance appeared or vanished, no fact reads it ["owner" [:status]] |
| the call's query | 20 | `list owners by the start of a last name` — the call's query (the draft's call shows :params and :body) |
| a field of a list element | 17 | `update an owner` — a field of a list element (which instance?) ["owners" [:body 0 :address]] |
| an element of a list field | 13 | `update an owner's pet` — an element of a list field ["owner" [:body :pets 1 :name]] |
| a field of another instance than the call names | 10 | `delete a pet type one pet has` — a field of another instance than the call names ["owner" [:body :pets]] |
| a prepared call that creates an actor | 5 | `delete an owner without a pet` — a prepared call that creates an actor (:as) |
| a value taken from an earlier answer | 5 | `delete an owner without a pet` — a value taken from an earlier answer ([:ref …]) |

### target

| reason | count | example |
|---|---|---|
| the version is held only in a comment of the binding | 1 | `petclinic` — the version is held only in a comment of the binding |

### trigger

| reason | count | example |
|---|---|---|
| no accepted answer observed | 1 | `trigger failing-request` — no accepted answer observed |

## Judgements (defaults applied)

```clojure
{:then-observed-added 17,
 :refusal-names-derived 31,
 :run {:version-and-at "not held by the reference: nil"},
 :interface-schemas
 {:provenance :observed,
  :path-parameters-typed-string-by-default
  [["delete-specialty" "specialtyId"]]},
 :otherwise-when {:derived 17, :not-derivable 20},
 :assert
 {:facts-asserted 185,
  :facts-asserted-for-another-actor 0,
  :shows-asserted 63,
  :readings {:by-fact 155, :lost-changed 66, :lost-unchanged 1},
  :readings-no-fact-no-shows-accounts-for 67,
  :before-agrees-with-facts-evaluated 85,
  :before-disagrees-with-facts-evaluated 0},
 :rules
 {:requires 31,
  :effects 103,
  :mixed-evidence [],
  :denies-a-fact-but-no-scenario
  [["list-owners" "empty"]
   ["list-pet-types" "empty"]
   ["list-pets" "empty"]
   ["list-visits" "empty"]
   ["list-specialties" "empty"]
   ["list-vets" "empty"]],
  :refusal-without-fact 33},
 :readers-dropped-from-projections 0,
 :inexpressible-in-the-spike 9,
 :then-observed-differs-across-scenarios 12,
 :then-not-declared 103}
```

## The verdict test

| verdict | scenarios |
|---|---|
| :not-derivable | 153 |
| :verified | 30 |

Not derivable, by reason:

| reason | scenarios |
|---|---|
| when not of facts (call input or rows) | 70 |
| otherwise after an effect not of facts | 53 |
| then not declared (no when, holds whenever accepted) | 20 |
| then not declared | 7 |
| a requirement that is not one fact | 3 |

## Several rules per scenario

| measure | value |
|---|---|
| scenarios | 183 |
| scenarios-proving-more-than-one | 6 |
| effects-without-when-holding-whenever-accepted | 12 |
| rules-not-evaluable | 84 |

Rules with no scenario today that would gain one: none

Examples:

| scenario | other rules that apply |
|---|---|
| get an owner with a negative id | unknown |
| get an owner with an id that is not a number | unknown |
| update an unknown owner with an invalid body | unknown |
| add a pet without a type | unknown-type |
| get a pet of an unknown owner | not-the-owners-pet |
| add a visit by pet id without a pet | unknown-pet |

## The binding test

Refusals answered with several statuses: none

Distinct refusals of one operation that answer the same status:

| operation | status | refusals |
|---|---|---|
| add-pet-to-owner | 404 | unknown-owner, unknown-type |
| update-pet | 404 | unknown, unknown-type |
| get-owners-pet | 404 | not-the-owners-pet, unknown-owner |
| update-owners-pet | 404 | unknown-owner, unknown-pet, unknown-type |

## Side effects and `detects`

| side effect | count |
|---|---|
| :asserted | 24 |
| :blind-spot | 8 |
| :missing-assert | 42 |

Blind spots (no `detects`): roles, users

Missing assert (place, what it concerns), in 35 scenarios:

| place | concerns |
|---|---|
| owners | Owner |
| pets | Pet |
| specialties | Specialty |
| types | PetType |
| vet_specialties | Vet |
| vets | Vet |
| visits | Visit |
