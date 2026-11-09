import type { Config } from "@netlify/functions";
import { createSessionCookie, getSession, safeEqual } from "./_shared/auth.js";

export default async (req: Request) => {
  if (req.method === "GET") {
    // Lets a page check "am I already signed in, and as what role?" without
    // re-sending a password — used to skip the login form on reload.
    const session = getSession(req);
    if (!session) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ role: session.role }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const adminPassword = process.env.TRAP_ADMIN_PASSWORD;
  const viewerPassword = process.env.TRAP_VIEWER_PASSWORD;
  if (!adminPassword || !viewerPassword) {
    return new Response(JSON.stringify({ error: "Server not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let role: "viewer" | "admin" | null = null;
  if (typeof password === "string" && password) {
    if (safeEqual(password, adminPassword)) role = "admin";
    else if (safeEqual(password, viewerPassword)) role = "viewer";
  }

  if (!role) {
    return new Response(JSON.stringify({ error: "Incorrect password" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ role }), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "set-cookie": createSessionCookie(role),
    },
  });
};

export const config: Config = {
  path: "/api/trap-login",
};
