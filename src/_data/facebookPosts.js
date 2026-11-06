// Recent Facebook posts, pulled from the Graph API at build time.
//
// Facebook's embeddable "Page Plugin" (the iframe widget) only shows a
// follow card to logged-out visitors now, not actual posts — this fetches
// the real post content server-side instead, so it renders as plain HTML
// with no login wall.
//
// To wire up a real feed, in Meta for Developers (developers.facebook.com):
//   1. Create an app (type: Business), using the Facebook account that
//      admins the Koala Rescue Brisbane South page.
//   2. Under the app's "Graph API Explorer" tool, select the app, select
//      the koalarescuebrisbanesouth Page as the token target, and generate
//      a Page Access Token with the pages_read_engagement permission.
//   3. Exchange that short-lived token for a long-lived one (Graph API
//      Explorer has an "extend access token" option, or use the
//      /oauth/access_token debug endpoint) — long-lived page tokens don't
//      expire as long as the page admin doesn't revoke them.
//   4. In Netlify (Site settings > Environment variables) set:
//        FB_PAGE_ID            — the page's numeric ID (shown in Page
//                                 settings > About, or via the Graph API
//                                 Explorer response)
//        FB_PAGE_ACCESS_TOKEN  — the long-lived page token from step 3
//
// Until those are set, this falls back to PLACEHOLDER_POSTS below. A
// production build with both set that then fails to fetch throws rather
// than publishing stale or empty data — a failed Netlify build leaves the
// previous deploy live (safe).

const fetch = require("node-fetch");

const PLACEHOLDER_POSTS = [
  {
    message:
      "Follow our Facebook page for the latest rescues, volunteer stories and community updates from Koala Rescue Brisbane South.",
    createdTime: null,
    imageUrl: null,
    permalinkUrl: "https://www.facebook.com/koalarescuebrisbanesouth/",
  },
];

const formatDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const truncate = (text, max) => {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
};

module.exports = async function () {
  const PAGE_ID = process.env.FB_PAGE_ID;
  const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

  if (!PAGE_ID || !TOKEN) {
    console.warn(
      "[facebookPosts] FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set — using placeholder feed"
    );
    return PLACEHOLDER_POSTS;
  }

  const url =
    `https://graph.facebook.com/v19.0/${PAGE_ID}/posts` +
    `?fields=message,created_time,full_picture,permalink_url` +
    `&limit=5&access_token=${TOKEN}`;

  let json;
  try {
    const res = await fetch(url);
    json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(
        json.error ? json.error.message : `HTTP ${res.status}`
      );
    }
    console.log(`[facebookPosts] Fetched ${json.data.length} posts`);
  } catch (err) {
    throw new Error(
      `[facebookPosts] Graph API fetch failed — ${err.message}. Check FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN (page tokens can be revoked if the page admin's Facebook session changes — regenerate via Graph API Explorer if so).`
    );
  }

  return (json.data || [])
    .filter((post) => post.message || post.full_picture)
    .map((post) => ({
      message: truncate(post.message, 220),
      createdTime: formatDate(post.created_time),
      imageUrl: post.full_picture || null,
      permalinkUrl: post.permalink_url,
    }));
};
