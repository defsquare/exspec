// the files of a small extraction: one target, interface, fact, operation f, trigger

export const target = `
target: t
start: [start]
alive: {method: get, path: /alive, status: 200}
seed: [seed]
reset: [reset]
stop: [stop]
api: {base-url: "http://h"}
`;

export const interfaces = `
interfaces:
  - {interface: i, method: get, pattern: "/f/{a}", request: {path: {a: string}}, responses: {200: {body: any}, 404: {body: null}}}
`;

export const operation = `
operation: f
takes: {a: {type: string}}
requires: [{rule: q, fact: p, otherwise: missing}]
answers: null
effects: [{rule: r, then: nothing-changes}]
`;

export const facts = "- {fact: p, condition: []}";

export const bindings = `
triggers:
  - {trigger: t, interface: i, operation: f, sends: {a: [path, a]}, answers: {status: 200}, refuses: {missing: {status: 404}}}
`;

export const reference = `
scenario: s
says: s
proves: [r]
run: {target: t, version: v, at: "2026-11-13T10:00:00.000Z", clock: null}
arrange: []
act:
  call: {operation: f, with: {a: x}, caller: u}
  response: {status: 200, body: null}
noise: []
`;
