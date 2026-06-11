import { readFile } from "node:fs/promises";
import { stdin } from "node:process";

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

async function readToken() {
  const chunks = [];
  for await (const chunk of stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").trim();
}

const token = await readToken();

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

const ref = await github(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
const headSha = ref.object.sha;
const headCommit = await github(`/repos/${owner}/${repo}/git/commits/${headSha}`);

const tree = [];
for (const file of files) {
  tree.push({
    path: file,
    mode: "100644",
    type: "blob",
    content: await readFile(file, "utf8"),
  });
}

const nextTree = await github(`/repos/${owner}/${repo}/git/trees`, {
  method: "POST",
  body: JSON.stringify({
    base_tree: headCommit.tree.sha,
    tree,
  }),
});

const commit = await github(`/repos/${owner}/${repo}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: "Publish tracker site",
    tree: nextTree.sha,
    parents: [headSha],
  }),
});

await github(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
  method: "PATCH",
  body: JSON.stringify({ sha: commit.sha, force: false }),
});

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
  commit: commit.sha,
  pages: pages.html_url,
}, null, 2));
