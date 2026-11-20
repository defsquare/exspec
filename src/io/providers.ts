import { join } from "node:path";
import { providerSchema } from "../shapes/provider.ts";
import { readYaml, type SideEffect } from "../shapes/roles.ts";
import type { Observable, Target } from "../shapes/target.ts";
import { startProxy } from "./proxy.ts";
import {
  type ConditionGiven,
  deadline,
  putGiven,
  type ServedTwins,
  serveTwins,
} from "./twins.ts";

export class TwinsNotServed extends Error {
  readonly type = "twins-not-served";
}

export type ConditionTaken = { readonly taken: true } | { readonly refused: string };

export type StoodProviders = {
  readonly takeSideEffects: () => Promise<readonly SideEffect[]>;
  // what was recorded, dropped; each twin given its fresh state
  readonly resetProviders: () => Promise<void>;
  readonly giveCondition: (given: ConditionGiven) => Promise<ConditionTaken>;
  // the proxy stopped and the twins' process killed, whatever fails first
  readonly stopProviders: () => Promise<void>;
};

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function twinsOf(dir: string, names: readonly string[]): Promise<ServedTwins> {
  const twins = await serveTwins(dir, names);
  if ("failed" in twins) {
    throw new TwinsNotServed(
      `exspec/providers/serve.ts did not serve the twins of ${names.join(", ")}: ${twins.failed}`,
    );
  }
  return twins;
}

// the service each provider renders, read from exspec/providers/<p>/provider.yaml:
//   [p, q] -> {rendered: {s: p}, unread: ["providers/q/provider.yaml: absent"]}
// a provider whose file is missing or does not parse renders nothing, and says why
export async function renderersOf(
  dir: string,
  names: readonly string[],
): Promise<{
  readonly rendered: ReadonlyMap<string, string>;
  readonly unread: readonly string[];
}> {
  const rendered = new Map<string, string>();
  const unread: string[] = [];
  for (const name of names) {
    const path = `providers/${name}/provider.yaml`;
    const file = Bun.file(join(dir, "exspec", path));
    if (!(await file.exists())) {
      unread.push(`${path}: absent`);
      continue;
    }
    const read = readYaml(path, await file.text(), providerSchema);
    if ("value" in read) rendered.set(read.value.renders, name);
    else unread.push(...read.findings);
  }
  return { rendered, unread };
}

// "s", ["providers/q/provider.yaml: absent"]
//   -> "no provider renders s — providers/q/provider.yaml: absent"
export const noRenderer = (service: string, unread: readonly string[]) =>
  [`no provider renders ${service}`, ...unread].join(" — ");

// The proxy in front of a target's providers, and their twins, served by exspec:
//   {observable: p}  -> behind: "http://127.0.0.1:<twins' port>/p"
export async function standProviders({
  dir,
  proxy,
  observables,
}: {
  readonly dir: string;
  readonly proxy: NonNullable<Target["proxy"]>;
  readonly observables: readonly Observable[];
}): Promise<StoodProviders> {
  const names = observables.map(({ observable }) => observable);
  const { rendered: renderers, unread } = await renderersOf(dir, names);
  const twins = names.length === 0 ? undefined : await twinsOf(dir, names);
  let started: ReturnType<typeof startProxy>;
  try {
    started = startProxy({
      ...proxy,
      observables:
        twins === undefined
          ? []
          : names.map((observable) => ({
              observable,
              behind: `${twins.at}/${observable}`,
            })),
    });
  } catch (error) {
    // the proxy's port held: the twins are not left running
    await twins?.stopTwins();
    throw error;
  }
  return {
    takeSideEffects: started.takeSideEffects,
    resetProviders: async () => {
      await started.forgetSideEffects();
      if (twins === undefined) return;
      for (const name of names) {
        const put = await fetch(`${twins.at}/${name}/__state`, {
          method: "PUT",
          body: "{}",
          signal: AbortSignal.timeout(deadline),
        }).catch((error: unknown) => {
          throw new TwinsNotServed(`PUT /${name}/__state: ${messageOf(error)}`);
        });
        if (!put.ok) {
          throw new TwinsNotServed(
            `PUT /${name}/__state answered ${put.status}: ${await put.text()}`,
          );
        }
      }
    },
    giveCondition: async ({ service, condition, with: values }) => {
      const provider = renderers.get(service);
      if (provider === undefined || twins === undefined) {
        return { refused: noRenderer(service, unread) };
      }
      try {
        const { status, text } = await putGiven(twins.at, provider, {
          condition,
          with: values,
        });
        return status === 200
          ? { taken: true }
          : { refused: `${provider} answered ${status}: ${text}` };
      } catch (error) {
        // a twin that does not answer refuses the condition: the step is unplayable, told why
        return { refused: `${provider} did not answer: ${messageOf(error)}` };
      }
    },
    stopProviders: async () => {
      try {
        await started.stopProxy();
      } finally {
        await twins?.stopTwins();
      }
    },
  };
}
