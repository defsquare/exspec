import { type CommonTrigger, type Trigger, triggerSchema } from "../shapes/bindings.ts";
import { type Common, type Rules, readYaml } from "../shapes/roles.ts";
import type { Interface, NamedShape } from "../shapes/target.ts";
import { acceptedStatuses } from "./accepted.ts";
import { hasPlace } from "./check-bindings.ts";
import { placesOfInputs } from "./input-places.ts";

// The trigger written beside an operation's rules, checked against them and against the
// shared trigger. A finding is a line the reader can fix:
//   'trigger.yaml: refuses says nothing of "r", the refusal of "a", nor does common-trigger.yaml'
//   'trigger.yaml: "s" is a shared refusal, said in common-trigger.yaml: not said again'
// An input a call could not send is one too: left to the builder, each step that gives it
// is written as a request, held to this target's wire.
//   takes {x}, "post /s" taking body {a: {x}}, no sends
//   -> 'trigger.yaml: sends says nothing of "x": no … body field … of post /s is named "x"'
export function checkTrigger({
  name,
  interfaces,
  bound,
  schemas = [],
  rules,
  common,
  commonTrigger,
  text,
}: {
  // the interface, and the folder the trigger is in
  readonly name: string;
  // the target's interfaces; undefined when interfaces.yaml does not parse
  readonly interfaces: readonly string[] | undefined;
  // the interface as the target describes it, when it does: where an input may be sent
  readonly bound?: Interface | undefined;
  readonly schemas?: readonly NamedShape[] | undefined;
  readonly rules: Rules;
  readonly common: Common | undefined;
  readonly commonTrigger: CommonTrigger | undefined;
  // undefined: the file is not there
  readonly text: string | undefined;
}): { readonly trigger?: Trigger; readonly findings: readonly string[] } {
  if (text === undefined) return { findings: ["trigger.yaml: missing"] };
  const read = readYaml("trigger.yaml", text, triggerSchema);
  if (!("value" in read)) return read;
  const trigger = read.value;
  const shared = commonTrigger?.refuses ?? {};
  const named = [
    ...rules.requires.map(({ rule, otherwise }) => ({ rule, refusal: otherwise })),
    ...(common?.rules ?? [])
      .filter(({ rule }) => rules.common.includes(rule))
      .map(({ rule, otherwise }) => ({ rule, refusal: otherwise })),
  ];
  const refusals = new Set(named.map(({ refusal }) => refusal));
  const said = (refusal: string) =>
    Object.hasOwn(trigger.refuses, refusal) || Object.hasOwn(shared, refusal);
  const takes = Object.keys(rules.takes ?? {});
  const findings = [
    ...(trigger.interface === name
      ? []
      : [`trigger.yaml: interface is "${trigger.interface}", the folder is "${name}"`]),
    ...(interfaces === undefined || interfaces.includes(trigger.interface)
      ? []
      : [
          `trigger.yaml: interface "${trigger.interface}" is not an interface of the target`,
        ]),
    ...(trigger.operation === rules.operation
      ? []
      : [
          `trigger.yaml: operation is "${trigger.operation}", rules.yaml's is "${rules.operation}"`,
        ]),
    ...(acceptedStatuses(trigger).length > 0
      ? []
      : [
          "trigger.yaml: the trigger says no accepted status: answers.status lists each status an accepted call is answered with",
        ]),
    ...named
      .filter(
        ({ refusal }, i) =>
          !said(refusal) && named.findIndex((n) => n.refusal === refusal) === i,
      )
      .map(
        ({ rule, refusal }) =>
          `trigger.yaml: refuses says nothing of "${refusal}", the refusal of "${rule}", nor does common-trigger.yaml`,
      ),
    ...Object.keys(trigger.refuses).flatMap((refusal) =>
      Object.hasOwn(shared, refusal)
        ? [
            `trigger.yaml: "${refusal}" is a shared refusal, said in common-trigger.yaml: not said again`,
          ]
        : refusals.has(refusal)
          ? []
          : [
              `trigger.yaml: refuses names "${refusal}", which no rule of this operation names`,
            ],
    ),
    ...Object.entries(trigger.sends).flatMap(([input, place]) => [
      ...(takes.includes(input)
        ? []
        : [`trigger.yaml: sends names "${input}", which takes does not declare`]),
      ...(bound === undefined || hasPlace(bound, place, schemas)
        ? []
        : [
            `trigger.yaml: sends.${input} is ${place.join(".")}, which the request of ${bound.method} ${bound.pattern} does not have`,
          ]),
    ]),
    ...(bound === undefined
      ? []
      : placesOfInputs({ inputs: takes, sends: trigger.sends, bound }).unplaced.map(
          ({ input, why }) => `trigger.yaml: sends says nothing of "${input}": ${why}`,
        )),
  ];
  return findings.length === 0 ? { trigger, findings } : { findings };
}
