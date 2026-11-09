import type { Config } from "@netlify/functions";
import { requireRole } from "./_shared/auth.js";
import { removeRecords } from "./_shared/store.js";

export default async (req: Request) => {
  if (!requireRole(req, "admin")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let ids: unknown;
  try {
    ({ ids } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== "string")) {
    return new Response(
      JSON.stringify({ error: "ids must be a non-empty array of strings" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  await removeRecords(ids as string[]);

  return new Response(JSON.stringify({ deleted: ids.length }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config: Config = {
  path: "/api/trap-delete",
};
