import type { Config, Context } from "@netlify/functions";
import { requireRole } from "./_shared/auth.js";
import { photosStore, readIndex } from "./_shared/store.js";

export default async (req: Request, context: Context) => {
  if (!requireRole(req, "viewer")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const id = context.params.id;
  if (!id) {
    return new Response("Not found", { status: 404 });
  }

  const records = await readIndex();
  const record = records.find((r) => r.id === id);
  if (!record) {
    return new Response("Not found", { status: 404 });
  }

  const image = await photosStore().get(id, { type: "arrayBuffer" });
  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(image, {
    status: 200,
    headers: {
      "content-type": record.contentType || "image/jpeg",
      // Private: only ever meant for a logged-in viewer, never a shared/public cache.
      "cache-control": "private, max-age=3600",
    },
  });
};

export const config: Config = {
  path: "/api/trap-image/:id",
};
