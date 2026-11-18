// Shared Netlify Blobs access for the trap viewer. Images live in the "trap-photos"
// store keyed by id; a single JSON index in "trap-gallery" lists all records so the
// gallery/delete endpoints don't have to list the whole photos store on every request.
//
// Blobs reads are eventually consistent (per Netlify's docs, up to ~60s to propagate),
// which is fine here: the ingest function runs sequentially within one scheduled
// invocation, and there's no second writer racing it.

import { getStore } from "@netlify/blobs";

export type PhotoRecord = {
  id: string;
  caption: string;
  capturedAt: string; // ISO timestamp
  receivedAt: string; // ISO timestamp
  contentType: string;
};

const INDEX_KEY = "index.json";

export function photosStore() {
  return getStore("trap-photos");
}

export function galleryStore() {
  return getStore("trap-gallery");
}

export async function readIndex(): Promise<PhotoRecord[]> {
  const data = await galleryStore().get(INDEX_KEY, { type: "json" });
  return Array.isArray(data) ? (data as PhotoRecord[]) : [];
}

async function writeIndex(records: PhotoRecord[]): Promise<void> {
  await galleryStore().setJSON(INDEX_KEY, records);
}

export async function addRecord(record: PhotoRecord): Promise<void> {
  const records = await readIndex();
  records.push(record);
  await writeIndex(records);
}

export async function removeRecords(ids: string[]): Promise<void> {
  const idSet = new Set(ids);
  const records = await readIndex();
  const kept = records.filter((r) => !idSet.has(r.id));
  await writeIndex(kept);

  const store = photosStore();
  await Promise.all(ids.map((id) => store.delete(id)));
}

// Retention policy (Richard's call): keep at most this many photos, and never
// anything older than this many days — whichever limit is more restrictive at
// the time. Pruned photos are deleted permanently, not archived elsewhere —
// there's nowhere else for them to live, and that's the intended behaviour.
const MAX_PHOTOS = 42;
const MAX_AGE_DAYS = 14;

export async function pruneOldRecords(): Promise<{ prunedCount: number }> {
  const records = await readIndex();
  const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  const newestFirst = [...records].sort((a, b) =>
    b.receivedAt.localeCompare(a.receivedAt)
  );
  const keepIds = new Set(
    newestFirst
      .filter((r) => new Date(r.receivedAt).getTime() >= cutoff)
      .slice(0, MAX_PHOTOS)
      .map((r) => r.id)
  );

  const toPrune = records.filter((r) => !keepIds.has(r.id)).map((r) => r.id);
  if (toPrune.length > 0) {
    await removeRecords(toPrune);
  }
  return { prunedCount: toPrune.length };
}
