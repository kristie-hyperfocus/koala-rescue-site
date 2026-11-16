import type { Config } from "@netlify/functions";
import { requireRole } from "./_shared/auth.js";
import { readIndex } from "./_shared/store.js";

const MAX_ITEMS = 24;

export default async (req: Request) => {
  if (!requireRole(req, "viewer")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const records = await readIndex();
  const newest = records
    .slice()
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
    .slice(0, MAX_ITEMS)
    .map((r) => ({
      id: r.id,
      caption: r.caption,
      receivedAt: r.receivedAt,
      imageUrl: `/api/trap-image/${encodeURIComponent(r.id)}`,
    }));

  return new Response(JSON.stringify({ items: newest }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/trap-gallery",
};
