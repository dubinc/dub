#!/usr/bin/env node
/**
 * Posts revalidated HIGH/CRITICAL DeepSec findings to Slack.
 * Usage: node scripts/notify-slack.mjs [findings.json]
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const WEBHOOK = process.env.DEEPSEC_SLACK_HOOK;
const BLOB_BASE = "https://github.com/dubinc/dub/blob/main/apps/web";
const HIGH = new Set(["HIGH", "CRITICAL"]);

const findingsPath = resolve(
  process.argv[2] ?? new URL("../findings.json", import.meta.url).pathname,
);

function fileUrl(finding) {
  const meta = finding.metadata ?? {};
  const filePath = meta.filePath;
  const lines = meta.lineNumbers ?? [];
  const first = lines[0];
  const last = lines[lines.length - 1];
  const anchor =
    first == null ? "" : first === last ? `#L${first}` : `#L${first}-L${last}`;
  if (
    typeof meta.githubUrl === "string" &&
    meta.githubUrl.includes("/apps/web/")
  ) {
    return meta.githubUrl;
  }
  if (!filePath) return BLOB_BASE;
  return `${BLOB_BASE}/${filePath}${anchor}`;
}

function keep(finding) {
  const severity = finding.metadata?.severity ?? finding.severity;
  if (!HIGH.has(severity)) return false;
  const verdict = finding.metadata?.revalidation?.verdict;
  return verdict === "true-positive";
}

function titleText(finding) {
  return String(finding.title ?? "Untitled finding").replace(
    /^\[[A-Z_]+\]\s*/,
    "",
  );
}

if (!WEBHOOK) {
  console.log("DEEPSEC_SLACK_HOOK is not set; skipping Slack notify.");
  process.exit(0);
}

let raw;
try {
  raw = await readFile(findingsPath, "utf8");
} catch (error) {
  console.error(`Could not read ${findingsPath}: ${error.message}`);
  process.exit(1);
}

const parsed = JSON.parse(raw);
const findings = (
  Array.isArray(parsed) ? parsed : parsed.findings ?? []
).filter(keep);

const header =
  findings.length === 0
    ? "DeepSec full scan: no HIGH+ after revalidation"
    : `:alert: DeepSec full scan: ${findings.length} HIGH+ finding(s) after revalidation`;

const lines = findings.slice(0, 20).map((finding) => {
  const severity = finding.metadata?.severity ?? finding.severity;
  const filePath = finding.metadata?.filePath ?? "(unknown file)";
  return `• *${severity}* <${fileUrl(finding)}|${filePath}> — ${titleText(finding)}`;
});

if (findings.length > 20) {
  lines.push(
    `_…and ${findings.length - 20} more (see the workflow artifact)._`,
  );
}

const text = [header, ...lines].join("\n").slice(0, 2900);

const response = await fetch(WEBHOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text },
      },
    ],
  }),
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Slack webhook failed (${response.status}): ${body}`);
  process.exit(1);
}

console.log(`Posted ${findings.length} HIGH+ finding(s) to Slack.`);
