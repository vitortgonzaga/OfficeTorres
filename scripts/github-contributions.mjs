// Saves the public contribution graph. Run with: npm run contributions
import { writeFile } from "node:fs/promises";

const USER = "vitortgonzaga";
const response = await fetch(`https://github.com/users/${USER}/contributions`, { headers: { "User-Agent": "portfolio-snapshot" } });
if (!response.ok) throw new Error(`contributions: ${response.status}`);
const html = await response.text();

const counts = new Map();
for (const match of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)</g)) {
  const amount = /^(\d[\d,]*) contribution/.exec(match[2].trim());
  counts.set(match[1], amount ? Number(amount[1].replace(/,/g, "")) : 0);
}
const days = [];
for (const match of html.matchAll(/<td\b[^>]*>/g)) {
  const date = /data-date="([^"]+)"/.exec(match[0])?.[1];
  const id = /\bid="([^"]+)"/.exec(match[0])?.[1];
  const level = /data-level="(\d)"/.exec(match[0])?.[1];
  if (date && level !== undefined) days.push([date, Number(level), counts.get(id) ?? 0]);
}
days.sort((a, b) => a[0].localeCompare(b[0]));
const total = days.reduce((sum, day) => sum + day[2], 0);
await writeFile(new URL("../src/content/contributions.json", import.meta.url), `${JSON.stringify({ takenAt: new Date().toISOString().slice(0, 10), total, days })}\n`);
console.log(`Saved ${total} contributions across ${days.length} days`);
