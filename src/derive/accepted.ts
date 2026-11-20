import type { Trigger } from "../shapes/bindings.ts";

// the statuses a trigger accepts a call with: status 200 -> [200]; [200, 302] -> [200, 302]
export const acceptedStatuses = ({ answers: { status } }: Pick<Trigger, "answers">) =>
  typeof status === "number" ? [status] : status;
