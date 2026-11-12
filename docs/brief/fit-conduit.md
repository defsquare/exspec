# Fit of the draft shapes — conduit

Written by `spike.shapes`, never edited. A misfit is an instance the draft's shapes cannot say without a key or a term they lack.

## Per shape

| shape | instances | fit | misfit |
|---|---|---|---|
| detects | 7 | 7 | 0 |
| fact | 12 | 7 | 5 |
| interface | 23 | 17 | 6 |
| observable | 1 | 1 | 0 |
| operation | 19 | 9 | 10 |
| projection | 9 | 7 | 2 |
| scenario | 167 | 78 | 89 |
| structure | 4 | 3 | 1 |
| target | 1 | 0 | 1 |
| trigger | 19 | 19 | 0 |

## Misfits by reason

### fact

| reason | count | example |
|---|---|---|
| a condition on the call's input | 2 | `the email given is the caller's` — a condition on the call's input (its body or query) |
| a count | 1 | `the article has comments` — a count |
| membership in a read's list | 1 | `the tag the filter names is in use` — membership in a read's list |
| the caller's identity as a value | 1 | `the caller is the article's author` — the caller's identity as a value |

### interface

| reason | count | example |
|---|---|---|
| a key absent from some answers | 4 | `schema User` — a key absent from some answers [:email] |
| a type no answer shows: only noise, or an empty list | 3 | `schema Article` — a type no answer shows: only noise, or an empty list [:createdAt] |
| a type no answer shows: only null | 2 | `schema Article` — a type no answer shows: only null [:author :image] |

### operation

| reason | count | example |
|---|---|---|
| an effect conditioned on the call's input | 9 | `register` — an effect conditioned on the call's input |
| otherwise after an effect not of facts | 9 | `register` — otherwise after an effect not of facts (its when, their negation, is not of facts) |
| a refusal with no fact to require: written as an effect | 8 | `register` — a refusal with no fact to require: written as an effect |
| an effect conditioned on the database's rows | 3 | `register` — an effect conditioned on the database's rows |
| the accepted answer has no body | 2 | `delete-article` — the accepted answer has no body (answers names nothing) |
| a requirement that is not one denied fact | 1 | `update-user` — a requirement that is not one denied fact [:and [:present [:call :body :user :email]] [:> [:rows "users" {"email" [:call :body :user :email]}] 0] [:not "the email given is the caller's"]] |

### projection

| reason | count | example |
|---|---|---|
| a probe with a body | 2 | `projection login-as-alice` — a probe with a body {:user {:email "alice@conduit.test", :password "alice-pw-123"}} |

### scenario

| reason | count | example |
|---|---|---|
| a noise wildcard: a value whose equality class changed between the two runs | 29 | `register with a fresh email` — a noise wildcard: a value whose equality class changed between the two runs (9 leaves) |
| the call's query | 24 | `list articles of an author` — the call's query (the draft's call shows :params and :body) |
| a list's elements changed | 21 | `follow oneself` — a list's elements changed (membership, count or order) ["feed" [:body :articles]] |
| a change outside the structures shown | 18 | `update the email to a fresh one` — a change outside the structures shown (a count, a total) ["login-as-alice" [:body :errors]] |
| an instance appeared or vanished, no fact reads it | 16 | `register with a fresh email` — an instance appeared or vanished, no fact reads it ["profile" [:status]] |
| a prepared call that creates an actor | 13 | `register with an email already taken` — a prepared call that creates an actor (:as) |
| a raw token, not a caller | 11 | `current user with a garbage token` — a raw token, not a caller |
| a value taken from an earlier answer | 10 | `profile of alice as carol, who follows nobody` — a value taken from an earlier answer ([:ref …]) |
| a field of a list element | 6 | `update the title of her own article` — a field of a list element (which instance?) ["articles" [:body :articles 2 :updatedAt]] |
| a field of another instance than the call names | 4 | `update bio and image only` — a field of another instance than the call names ["profile" [:body :profile :bio]] |

### structure

| reason | count | example |
|---|---|---|
| a structure that is a bare value | 1 | `structure Tag` — a structure that is a bare value (identity :value) |

### target

| reason | count | example |
|---|---|---|
| the version is held only in a comment of the binding | 1 | `conduit` — the version is held only in a comment of the binding |

## Judgements (defaults applied)

```clojure
{:then-observed-added 12,
 :refusal-names-derived 26,
 :run {:version-and-at "not held by the reference: nil"},
 :interface-schemas
 {:provenance :observed,
  :path-parameters-typed-string-by-default
  [["delete-article-comment" "commentId"]]},
 :otherwise-when {:not-derivable 9, :derived 10},
 :assert
 {:facts-asserted 374,
  :facts-asserted-for-another-actor 171,
  :shows-asserted 25,
  :readings
  {:by-fact 160, :by-shows 7, :lost-changed 148, :lost-unchanged 64},
  :readings-no-fact-no-shows-accounts-for 212,
  :before-agrees-with-facts-evaluated 99,
  :before-disagrees-with-facts-evaluated 0},
 :rules
 {:requires 26,
  :effects 64,
  :mixed-evidence [],
  :denies-a-fact-but-no-scenario [],
  :refusal-without-fact 17},
 :readers-dropped-from-projections 6,
 :inexpressible-in-the-spike 5,
 :then-observed-differs-across-scenarios 5,
 :then-not-declared 64}
```

## The verdict test

| verdict | scenarios |
|---|---|
| :not-derivable | 137 |
| :verified | 30 |

Not derivable, by reason:

| reason | scenarios |
|---|---|
| when not of facts (call input or rows) | 60 |
| otherwise after an effect not of facts | 36 |
| then not declared | 35 |
| then not declared (no when, holds whenever accepted) | 5 |
| a requirement that is not one fact | 1 |

## Several rules per scenario

| measure | value |
|---|---|
| scenarios | 167 |
| scenarios-proving-more-than-one | 7 |
| effects-without-when-holding-whenever-accepted | 2 |
| rules-not-evaluable | 43 |

Rules with no scenario today that would gain one: `get-article/author-followed`

Examples:

| scenario | other rules that apply |
|---|---|
| get an article as bob, who favorited it | author-followed |
| get an article favorited by the caller | author-followed |
| update an unknown article | not-author |
| update an article without a token | not-author |
| delete an unknown article | not-author |
| delete an article twice | not-author |
| delete without a token | not-author |

## The binding test

Refusals answered with several statuses: none

Distinct refusals of one operation that answer the same status:

| operation | status | refusals |
|---|---|---|
| update-article | 401 | anonymous, not-author, unknown |
| add-comment | 401 | anonymous, unknown |
| unfollow-user | 401 | anonymous, unknown |
| unfavorite-article | 401 | anonymous, unknown |
| follow-user | 401 | anonymous, unknown |
| delete-article | 401 | anonymous, not-author, unknown |
| favorite-article | 401 | anonymous, unknown |
| delete-comment | 401 | anonymous, unknown-article |

## Side effects and `detects`

| side effect | count |
|---|---|
| :asserted | 31 |
| :missing-assert | 23 |

Blind spots (no `detects`): none

Missing assert (place, what it concerns), in 13 scenarios:

| place | concerns |
|---|---|
| article_tag | Article |
| articles | Article |
| comments | Comment |
| tags | Tag |
