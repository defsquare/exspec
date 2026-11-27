import type { Trigger } from "../shapes/bindings.ts";
import type { Evidence } from "../shapes/roles.ts";

// the statuses a trigger accepts a call with: status 200 -> [200]; [200, 302] -> [200, 302]
export const acceptedStatuses = ({ answers: { status } }: Pick<Trigger, "answers">) =>
  typeof status === "number" ? [status] : status;

// the status a recording's call was accepted with, none when it was refused or unanswered:
//   call answered 200, the trigger accepts [200, 202] -> 200;  answered 400 -> undefined
export function acceptedStatusOf(
  exchanges: Evidence["exchanges"],
  trigger: Pick<Trigger, "answers">,
): number | undefined {
  const call = exchanges.find(({ when }) => when === "call");
  return call !== undefined &&
    "response" in call &&
    acceptedStatuses(trigger).includes(call.response.status)
    ? call.response.status
    : undefined;
}
