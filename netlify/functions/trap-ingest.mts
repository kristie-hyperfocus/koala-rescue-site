// Scheduled function: polls the trap camera's mailbox over IMAP and turns each new
// email from the camera into a gallery item. Runs every 5 minutes (see `config` below).
//
// Mirrors the behaviour described in KRBS_Trap_Viewer_Developer_Overview.pdf: the
// camera emails a dedicated mailbox (decoupled from the website's own domain), a
// sender allow-list gates what gets published, the subject line becomes the caption,
// and processed messages are removed from the mailbox.
//
// Mail from an address NOT on the allow-list is left in the mailbox (marked \Seen so
// it isn't rechecked every run) rather than deleted, so anything unexpected is still
// there for a human to look at — nothing unrecognised is ever published.

import type { Config } from "@netlify/functions";
import { randomUUID } from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { photosStore, addRecord, pruneOldRecords } from "./_shared/store.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function allowedSenders(): string[] {
  return (process.env.TRAP_CAMERA_SENDER || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// The mail server has been observed to silently hang on an individual IMAP
// command (seen: a plain \Seen flag update never completed, with no error —
// just nothing, until the whole invocation was killed at the platform's hard
// execution limit). Wrapping each command means a single stuck command fails
// loudly and promptly instead of burning the full execution silently, and
// without this a stuck message would also get retried — and get stuck again
// — on every subsequent 5-minute run.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`[trap-ingest] timed out after ${ms}ms: ${label}`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export default async () => {
  const host = requireEnv("TRAP_MAILBOX_HOST");
  const port = Number(process.env.TRAP_MAILBOX_PORT || 993);
  const user = requireEnv("TRAP_MAILBOX_USER");
  const pass = requireEnv("TRAP_MAILBOX_PASSWORD");
  const allowList = allowedSenders();

  if (allowList.length === 0) {
    throw new Error(
      "TRAP_CAMERA_SENDER is not set — refusing to ingest with no sender allow-list"
    );
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  let processed = 0;
  let skipped = 0;

  console.log("[trap-ingest] connecting...");
  try {
    await withTimeout(client.connect(), 20000, "connect");
    console.log("[trap-ingest] connected");
  } catch (err) {
    // connect() can leave the socket half-open on a rejected login; close()
    // forcibly tears it down so it can't fire a stray timeout error after
    // this invocation has already ended (and potentially bleed into the next
    // invocation's logs, since Lambda-style runtimes can reuse containers).
    client.close();
    throw err;
  }

  try {
    console.log("[trap-ingest] acquiring mailbox lock...");
    const lock = await withTimeout(client.getMailboxLock("INBOX"), 15000, "getMailboxLock");
    console.log("[trap-ingest] got lock, fetching unseen messages...");
    try {
      const store = photosStore();
      const toDelete: number[] = [];
      let seen = 0;

      for await (const msg of client.fetch(
        { seen: false },
        { envelope: true, source: true, uid: true }
      )) {
        seen++;
        console.log(
          `[trap-ingest] msg uid=${msg.uid}: fetched, ${msg.source.length} bytes, parsing...`
        );
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.value?.[0]?.address?.toLowerCase() ?? "";
        console.log(`[trap-ingest] msg uid=${msg.uid}: from=${from}`);

        if (!allowList.includes(from)) {
          await withTimeout(
            client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }),
            15000,
            `messageFlagsAdd uid=${msg.uid}`
          );
          skipped++;
          console.log(`[trap-ingest] msg uid=${msg.uid}: sender not allow-listed, skipped`);
          continue;
        }

        const attachment = parsed.attachments.find((a) =>
          a.contentType.startsWith("image/")
        );
        if (!attachment) {
          await withTimeout(
            client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true }),
            15000,
            `messageFlagsAdd uid=${msg.uid}`
          );
          skipped++;
          console.log(`[trap-ingest] msg uid=${msg.uid}: no image attachment, skipped`);
          continue;
        }
        console.log(
          `[trap-ingest] msg uid=${msg.uid}: image attachment ${attachment.content.length} bytes, storing in blobs...`
        );

        const id = randomUUID();
        const timestamp = (parsed.date ?? new Date()).toISOString();
        const caption = (parsed.subject || "Trap camera photo").trim();

        await withTimeout(
          store.set(id, attachment.content, {
            metadata: { contentType: attachment.contentType },
          }),
          20000,
          `blobs store.set id=${id}`
        );
        console.log(`[trap-ingest] msg uid=${msg.uid}: stored as ${id}, adding index record...`);
        await withTimeout(
          addRecord({
            id,
            caption,
            capturedAt: timestamp,
            receivedAt: timestamp,
            contentType: attachment.contentType,
          }),
          15000,
          `addRecord id=${id}`
        );
        console.log(`[trap-ingest] msg uid=${msg.uid}: index updated`);

        toDelete.push(msg.uid);
        processed++;
      }

      console.log(`[trap-ingest] fetch loop done, saw ${seen} unseen message(s)`);

      if (toDelete.length > 0) {
        console.log(`[trap-ingest] expunging ${toDelete.length} processed message(s)...`);
        // Adds \Deleted and expunges in one call.
        await withTimeout(client.messageDelete(toDelete, { uid: true }), 15000, "messageDelete");
        console.log("[trap-ingest] expunge done");
      }
    } finally {
      lock.release();
    }
  } finally {
    await withTimeout(client.logout(), 10000, "logout").catch(() => client.close());
  }

  console.log(`[trap-ingest] processed ${processed}, skipped ${skipped}`);

  const { prunedCount } = await withTimeout(pruneOldRecords(), 20000, "pruneOldRecords");
  if (prunedCount > 0) {
    console.log(`[trap-ingest] pruned ${prunedCount} photo(s) over the 42-photo/14-day limit`);
  }
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
