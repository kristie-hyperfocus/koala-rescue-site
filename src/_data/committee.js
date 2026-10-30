// Committee list, pulled from a published Google Sheet CSV at build time.
//
// To wire up a real Sheet: in Google Sheets, File > Share > Publish to web,
// choose the committee tab, format CSV, copy the URL, and set it as the
// COMMITTEE_CSV_URL environment variable in Netlify (Site settings >
// Environment variables). Expected columns: Name, Role, Email, ACNC Link
// (Email and ACNC Link are optional — leave the cell blank to omit them).
//
// Until that's set up, this falls back to PLACEHOLDER_COMMITTEE below, which
// matches what's live on the site today. A production build with
// COMMITTEE_CSV_URL set that then fails to fetch throws rather than
// publishing stale or empty data — a failed Netlify build leaves the
// previous deploy live (safe); silently falling back would risk quietly
// wiping the committee section.

const fetch = require("node-fetch");
const { parse } = require("csv-parse/sync");

const PLACEHOLDER_COMMITTEE = [
  { name: "Richard Unwin", role: "President", email: "", acncUrl: "" },
];

const get = (row, ...names) => {
  for (const name of names) {
    const v = (row[name] || "").trim();
    if (v) return v;
  }
  return "";
};

module.exports = async function () {
  const SHEET_URL = process.env.COMMITTEE_CSV_URL;
  if (!SHEET_URL) {
    console.warn(
      "[committee] No COMMITTEE_CSV_URL set — using placeholder committee data"
    );
    return PLACEHOLDER_COMMITTEE;
  }

  const bust = (SHEET_URL.includes("?") ? "&" : "?") + "cb=" + Date.now();
  let text;
  try {
    const res = await fetch(SHEET_URL + bust);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
    console.log("[committee] Fetched sheet CSV");
  } catch (err) {
    throw new Error(
      `[committee] CSV fetch failed — ${err.message}. Fix COMMITTEE_CSV_URL or the sheet's publish-to-web permissions.`
    );
  }

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  return rows
    .map((row) => ({
      name: get(row, "Name"),
      role: get(row, "Role"),
      email: get(row, "Email"),
      acncUrl: get(row, "ACNC Link", "ACNC link"),
    }))
    .filter((person) => person.name);
};
