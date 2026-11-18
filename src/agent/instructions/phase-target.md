# This phase: make the target startable, seedable and resettable

Write `specimen/target.yaml` and, under `specimen/target/`, whatever it runs. Do not
write `specimen/interfaces.yaml`: listing the interfaces is the next session's task, and
a list found there would be taken as done. When you are
done, `{{specimen}} target up .` must succeed, your reset must run, and `{{specimen}} target down .` must
leave nothing running.

## What to find out, from the checkout

How the system is built and started (a build file, a Dockerfile, a compose file, a README);
which database it needs; where its API is rooted (a context path, a port); how a caller is
authenticated (a token from a login, basic auth, nothing).

## What to write

**A compose file of your own**, `specimen/target/compose.yaml`:

- It builds the application from this checkout — a Dockerfile of yours under
  `specimen/target/` with the build inside it (a multi-stage build), so that nothing but
  Docker is needed on the machine. Reuse the checkout's own Dockerfile only if it builds
  from source.
- A **real database server** in its own service, never an in-memory or embedded one: the
  reset must be able to restore it while the application keeps running. If the target
  defaults to an embedded database, select the profile or settings that use a server.
- No volume: a `down -v` followed by an `up` starts from nothing.
- A project name of its own (`name: specimen-<target>`), and host ports unlikely to be
  taken — check they are free before choosing (`lsof -i :PORT`). Not 8080, 5432, 3000.
- If a setting bounds how long a session or a token lives, set it to days: the same
  credentials serve a whole run.

**A seed**, `specimen/target/seed.sh` — from the empty, freshly started target to the
**starting state** every trial of the system starts from:

- Go through the target's API where it has one for the thing (register, create); go to
  the database only for what the API cannot create.
- Make a small world that lets the rules be exercised: if the target has callers, at least
  two of them with plain names (`ann`, `bob`), each owning something, so that "not yours"
  and "someone else's" exist; a few instances of each main concept, some related to each
  other. Small: a human must be able to hold it in their head.
- If callers are authenticated, write `specimen/target/credentials.json`: for each actor,
  the request headers that sign it in.
- Last, take a **snapshot** of the starting state for the reset — for a SQL database, a
  data-only dump including the sequences, left under `specimen/target/`.
- It must fail loudly (`set -euo pipefail`, non-2xx answers checked): a half-seeded target
  is worse than none.

**A reset**, `specimen/target/reset.sh` — from whatever a trial left, back to the
starting state, **without restarting the application** if it can be avoided: empty the
tables and reload the snapshot, sequences included, so that the next thing created gets
the same identifier every time. It runs before every trial: it must take about a second.
If the application keeps state in memory that the database restore does not undo (a
cache, a pool of identifiers), say so in your final message.

Scripts find their files relative to their own location, are executable, and write
nothing outside `specimen/target/`. Add `specimen/.gitignore` for what they produce (the
credentials, the snapshot).

**`specimen/target.yaml`**, as described. `alive` is a cheap request that needs no caller.

## Check your work

1. `{{specimen}} target up .` — the first build may take minutes. Read the failure if it fails:
   the application's logs are in `docker compose -f specimen/target/compose.yaml logs`.
2. Call the API by hand (`curl`) as one of your actors: the credentials work, the seeded
   world is there.
3. Change something through the API, run your reset lines, look again: the change is gone,
   and creating the same thing again gives the same identifier as the first time.
4. `{{specimen}} target down .`

End with a short message: how the target starts, what the starting state holds (the
actors, the instances), and anything the reset does not restore.
