import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";

const owner = "gnozt90";
const repo = "ptcg-slabs-tracker";
const branch = "main";
const files = [
  ".gitignore",
  ".nojekyll",
  "README.md",
  "app.js",
  "data/slabs.json",
  "index.html",
  "scripts/publish-to-github.mjs",
  "styles.css",
];

const input = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
const token = (await input.question("")).trim();
input.close();

if (!token) {
  throw new Error("GitHub token is required on stdin.");
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${JSON.stringify(data)}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function getExistingSha(path) {
  try {
    const data = await github(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}?ref=${branch}`);
    return Array.isArray(data) ? null : data.sha;
  } catch (error) {
    if (error.status === 404 || error.status === 409) return null;
    throw error;
  }
}

const uploaded = [];
for (const file of files) {
  const content = await readFile(file);
  const sha = await getExistingSha(file);
  const result = await github(`/repos/${owner}/${repo}/contents/${encodeURIComponent(file).replaceAll("%2F", "/")}`, {
    method: "PUT",
    body: JSON.stringify({
      message: `${sha ? "Update" : "Add"} ${file}`,
      content: content.toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  uploaded.push({ path: file, commit: result.commit.sha });
}

let pages;
try {
  pages = await github(`/repos/${owner}/${repo}/pages`, {
    method: "POST",
    body: JSON.stringify({ source: { branch, path: "/" } }),
  });
} catch (error) {
  if (error.status !== 409 && error.status !== 422) {
    throw error;
  }
  pages = await github(`/repos/${owner}/${repo}/pages`);
}

console.log(JSON.stringify({
  repo: `https://github.com/${owner}/${repo}`,
  pages: pages.html_url,
  uploaded,
}, null, 2));
