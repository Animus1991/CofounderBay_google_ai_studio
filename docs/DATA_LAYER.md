# Data layer

Every screen and the assistant read the same records. Three rules keep them
from disagreeing; `src/test/dataLayer.test.ts` fails when one is broken.

## 1. Account data is named once

Each account list has one storage key, in `keys` (`src/lib/localLists.ts`).
From there it is scoped to the account, synced to the cloud for signed-in
members (`src/lib/cloudSync.ts`, except the device-only keys in `NOT_SYNCED`)
and cleared by "Reset data". A key spelled anywhere else gets none of that —
the deal-room ventures, page usage and both preference lists were such keys
until round 4.

Only the device itself has keys of its own (interface language, device id,
the post-deploy reload flag, the pre-account fit check); the test lists them.

## 2. Pages read entities, not storage

`src/lib/entities.ts` gives a record one type, one fallback and one reader:

```ts
const startup = useEntity(startupRecord);   // React: re-reads on any change
startupRecord.write({ ...startup, name });  // pages, the assistant, anywhere
const name = useVentureName(profile?.company);
```

`ventureName()` is the one answer to "what is the venture called" — the name
set in Founder Tools, else the profile's company, else the sample venture.
Founder Tools, Fundraising (its data room and due-diligence links), the weekly
digest, the templates and the assistant all use it; before, five of them
resolved it five different ways, so renaming the venture in Founder Tools left
the investor links on the old name.

Lists without an entity yet go through `keys` and the helpers in
`localLists` (`useStored(readRound, [keys.round])`); new records should get an
entity.

## 3. Server data goes through the query cache

Outreach data on the server — due-diligence links, email status and log,
digest settings and history — is read with the hooks in
`src/lib/outreachQueries.ts` (TanStack Query, `src/lib/queryClient.ts`):

- one request per resource however many components show it;
- every write updates the cache — creating or revoking a link (from a page or
  the assistant), sending an email, saving the digest — so nothing re-fetches
  by hand or listens for window events;
- the share-open watcher polls through the same cache, so the due-diligence
  panel shows new view counts without polling itself;
- a call that needs sign-in (401) or is refused (422) is not retried; a
  dropped connection is, twice.

`src/lib/outreachQueries.test.tsx` holds those four behaviours.
