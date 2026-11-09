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
import { photosStore, addRecord } from "./_shared/store.js";

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

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const store = photosStore();
      const toDelete: number[] = [];

      for await (const msg of client.fetch(
        { seen: false },
        { envelope: true, source: true, uid: true }
      )) {
        const parsed = await simpleParser(msg.source);
        const from = parsed.from?.value?.[0]?.address?.toLowerCase() ?? "";

        if (!allowList.includes(from)) {
          await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
          skipped++;
          continue;
        }

        const attachment = parsed.attachments.find((a) =>
          a.contentType.startsWith("image/")
        );
        if (!attachment) {
          await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
          skipped++;
          continue;
        }

        const id = randomUUID();
        const timestamp = (parsed.date ?? new Date()).toISOString();
        const caption = (parsed.subject || "Trap camera photo").trim();

        await store.set(id, attachment.content, {
          metadata: { contentType: attachment.contentType },
        });
        await addRecord({
          id,
          caption,
          capturedAt: timestamp,
          receivedAt: timestamp,
          contentType: attachment.contentType,
        });

        toDelete.push(msg.uid);
        processed++;
      }

      if (toDelete.length > 0) {
        // Adds \Deleted and expunges in one call.
        await client.messageDelete(toDelete, { uid: true });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  console.log(`[trap-ingest] processed ${processed}, skipped ${skipped}`);
};

export const config: Config = {
  schedule: "*/5 * * * *",
};
