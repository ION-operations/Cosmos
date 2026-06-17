import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const jobs = [
  {
    template: path.join(root, "_blocked-file-templates", "index-html.md"),
    target: path.join(root, "index.html")
  },
  {
    template: path.join(root, "_blocked-file-templates", "validationSmoke-wgsl.md"),
    target: path.join(root, "src", "gpu", "wgsl", "validationSmoke.wgsl")
  }
];

function extractTemplate(markdown) {
  const marker = "```text";
  const start = markdown.indexOf(marker);
  if (start < 0) throw new Error("Template has no text fence");
  const bodyStart = markdown.indexOf("\n", start) + 1;
  const end = markdown.indexOf("```", bodyStart);
  if (end < 0) throw new Error("Template fence is not closed");
  return markdown.slice(bodyStart, end).trimEnd() + "\n";
}

for (const job of jobs) {
  const markdown = fs.readFileSync(job.template, "utf8");
  const content = extractTemplate(markdown);
  fs.mkdirSync(path.dirname(job.target), { recursive: true });
  fs.writeFileSync(job.target, content, "utf8");
  console.log(`materialized ${path.relative(root, job.target)}`);
}
