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
