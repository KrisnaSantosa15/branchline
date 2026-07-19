import { createHash } from "node:crypto";
import { mkdir, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { simpleGit, type SimpleGit } from "simple-git";
import type { RepositorySource } from "./domain";

export class RepositoryError extends Error {}

function approvedRoot() {
  return path.resolve(process.env.BRANCHLINE_REPO_ROOT ?? path.join(/* turbopackIgnore: true */ process.cwd(), ".."));
}

function remoteCacheRoot() {
  return path.join(process.cwd(), "data", "remote-repositories");
}

function isDescendant(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function exists(target: string) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function isBareRepository(git: SimpleGit) {
  try {
    return (await git.raw(["rev-parse", "--is-bare-repository"])).trim() === "true";
  } catch {
    return false;
  }
}

export function isRemoteRepositorySource(input: string) {
  try {
    return new URL(input).protocol === "https:";
  } catch {
    return false;
  }
}

export function validateRemoteRepositoryUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new RepositoryError("Enter a valid public HTTPS Git URL.");
  }
  const host = url.hostname.toLowerCase();
  const privateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.port || host === "localhost" || host.endsWith(".local") || privateIpv4.test(host)) {
    throw new RepositoryError("Remote sources must be a credential-free public HTTPS Git URL on the standard HTTPS port.");
  }
  return url.toString();
}

export async function validateRepositoryPath(inputPath: string): Promise<string> {
  if (!inputPath.trim()) throw new RepositoryError("Enter a local repository path.");
  let resolvedPath: string;
  let root: string;
  try {
    [resolvedPath, root] = await Promise.all([realpath(inputPath), realpath(approvedRoot())]);
  } catch {
    throw new RepositoryError("The repository path or approved root does not exist on this server.");
  }
  if (!isDescendant(root, resolvedPath)) throw new RepositoryError("Repository must stay within the approved Branchline repository root.");
  const git = simpleGit(resolvedPath);
  if (!(await git.checkIsRepo())) throw new RepositoryError("That path is not a Git work tree.");
  return resolvedPath;
}

async function commitsFor(repositoryPath: string, source: RepositorySource) {
  const git = simpleGit(repositoryPath);
  const log = await git.log({ maxCount: 24 });
  if (!log.all.length) throw new RepositoryError("Branchline needs at least one commit to inspect a release change.");
  return {
    repositoryPath,
    source,
    commits: log.all.map((commit) => ({ hash: commit.hash, message: commit.message, date: commit.date })),
  };
}

export async function connectRepository(inputPath: string) {
  const repositoryPath = await validateRepositoryPath(inputPath);
  return commitsFor(repositoryPath, { kind: "local", value: repositoryPath });
}

export async function connectRemoteRepository(inputUrl: string) {
  const remoteUrl = validateRemoteRepositoryUrl(inputUrl);
  const cachePath = path.join(remoteCacheRoot(), createHash("sha256").update(remoteUrl).digest("hex").slice(0, 24));
  await mkdir(remoteCacheRoot(), { recursive: true });
  if (await exists(cachePath)) {
    const git = simpleGit(cachePath);
    if (!(await isBareRepository(git))) throw new RepositoryError("The managed remote-repository cache is invalid. Choose a different cache directory.");
    await git.fetch(["--prune", "--depth=50", "origin"]);
  } else {
    await simpleGit().clone(remoteUrl, cachePath, ["--bare", "--depth=50"]);
  }
  return commitsFor(await realpath(cachePath), { kind: "remote", value: remoteUrl });
}

export async function connectRepositorySource(input: string) {
  return isRemoteRepositorySource(input) ? connectRemoteRepository(input) : connectRepository(input);
}

export function gitFor(repositoryPath: string): SimpleGit {
  return simpleGit(repositoryPath);
}

export async function trackedFiles(git: SimpleGit, commit: string): Promise<string[]> {
  const output = await git.raw(["ls-tree", "-r", "--name-only", commit]);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function fileAtCommit(git: SimpleGit, commit: string, file: string): Promise<string> {
  return git.raw(["show", `${commit}:${file}`]);
}
