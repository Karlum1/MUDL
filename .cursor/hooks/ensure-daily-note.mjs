import fs from "node:fs";
import path from "node:path";

const dateKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const dir = path.join(process.cwd(), "Daily");
if (!fs.existsSync(dir)) {
  process.stdout.write("{}\n");
  process.exit(0);
}

const file = path.join(dir, `${dateKey}.md`);
if (!fs.existsSync(file)) {
  fs.writeFileSync(file, `# ${dateKey}\n\n## MUDL\n\n`, "utf8");
}

process.stdout.write("{}\n");
