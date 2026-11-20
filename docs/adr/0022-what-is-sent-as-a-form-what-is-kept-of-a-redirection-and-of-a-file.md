# ADR-0022 — A request may be sent as a form; a redirection is the target's answer; a file and a text too long to read are kept as their digest

Status: Accepted (2026-11-19) — each met on the first target driven through a back office;
none read by the challenger before it was built.

## Context

The first targets answered JSON to JSON. A back office takes forms, answers redirections,
streams a PDF; and a target that calls a PDF compiler sends it fonts, megabytes of base64
per call. Three things then went wrong: a field sent as JSON was ignored by a route that
reads a form, and its scenario exercised nothing; a redirection followed by the tool
recorded the next page in place of the answer; an evidence weighed 30 to 60 MB and its
judge could not read it.

## Decision

- **A step's request may carry `form` in place of `body`** — a flat map of field to
  scalar, sent URL-encoded. Never both. An interface's description says which it takes
  (`request.form`, a map of field to shape), and a builder writes what the description
  says.

  ```yaml
  request: {method: post, path: /a, form: {to: x, copy: true}}
  ```

- **A redirection is not followed.** The target's answer is the 3xx; where it leads is
  another call, which a scenario makes if it wants it shown.

- **A body that is a file is kept as `{bytes, sha256}`**, in an answer of the target and
  in what it sends to a provider alike: what is not text or JSON by its content type (XML is
  kept as a file too); a base64 string longer than 1024 characters — one line, its length
  a multiple of four — with or without a `base64:` or `data:…;base64,` prefix; any string longer than 16 384 characters. The judge reads that
  a file was there and whether it is the same one, never the file. A form-encoded body is
  text.

## Alternatives

- *Bodies kept whole*: the evidence is the judge's prompt.
- *A digest by content type alone*: the fonts travel inside JSON.
- *Following a redirection and keeping both answers*: the second is a call no scenario
  wrote.

## Consequences

- The two lengths are thresholds, and so a heuristic: a long text a rule is about is not
  readable in the evidence. To revisit with the first rule that needs one.
- A redirection's `Location` is a header, and no header is recorded (ADR-0018): where a
  call redirects to stays not shown.
- A file upload (`multipart/form-data`) is not sent yet.
