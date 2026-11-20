import { type Trigger, triggerSchema } from "../shapes/bindings.ts";
import { type Common, type Protocol, type Rules, readYaml } from "../shapes/roles.ts";
import { acceptedStatuses } from "./accepted.ts";

// The trigger written beside an operation's rules, checked against them and against the
// target's wire. A finding is a line the reader can fix:
//   'trigger.yaml: refuses says nothing of "r", the refusal of "a", nor does protocol.yaml'
export function checkTrigger({
  name,
  interfaces,
  rules,
  common,
  protocol,
  text,
}: {
  // the interface, and the folder the trigger is in
  readonly name: string;
  // the target's interfaces; undefined when interfaces.yaml does not parse
  readonly interfaces: readonly string[] | undefined;
  readonly rules: Rules;
  readonly common: Common | undefined;
  readonly protocol: Protocol | undefined;
  // undefined: the file is not there
  readonly text: string | undefined;
}): { readonly trigger?: Trigger; readonly findings: readonly string[] } {
  if (text === undefined) return { findings: ["trigger.yaml: missing"] };
  const read = readYaml("trigger.yaml", text, triggerSchema);
  if (!("value" in read)) return read;
  const trigger = read.value;
  const listed = trigger.protocol ?? [];
  const wire = protocol?.rules ?? [];
  const named = [
    ...rules.requires.map(({ rule, otherwise }) => ({ rule, refusal: otherwise })),
    ...(common?.rules ?? [])
      .filter(({ rule }) => rules.common.includes(rule))
      .map(({ rule, otherwise }) => ({ rule, refusal: otherwise })),
  ];
  const refusals = new Set([
    ...named.map(({ refusal }) => refusal),
    ...wire.flatMap(({ rule, otherwise }) =>
      listed.includes(rule) && otherwise !== undefined ? [otherwise.refusal] : [],
    ),
  ]);
  const said = (refusal: string) =>
    Object.hasOwn(trigger.refuses, refusal) ||
    Object.hasOwn(protocol?.refuses ?? {}, refusal);
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
          `trigger.yaml: refuses says nothing of "${refusal}", the refusal of "${rule}", nor does protocol.yaml`,
      ),
    ...Object.keys(trigger.refuses)
      .filter((refusal) => !refusals.has(refusal))
      .map(
        (refusal) =>
          `trigger.yaml: refuses names "${refusal}", which no rule of this operation names`,
      ),
    ...listed
      .filter((rule) => !wire.some((one) => one.rule === rule))
      .map(
        (rule) =>
          `trigger.yaml: protocol names "${rule}", which is not a rule of protocol.yaml`,
      ),
  ];
  return findings.length === 0 ? { trigger, findings } : { findings };
}
