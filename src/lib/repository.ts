import { realpath } from "node:fs/promises";
import path from "node:path";
import { simpleGit, type SimpleGit } from "simple-git";
import type { CommitInfo } from "@/lib/domain";

export class RepositoryError extends Error {}

function approvedRoot() {
  return path.resolve(process.env.BRANCHLINE_REPO_ROOT ?? path.join(process.cwd(), ".."));
}

function isDescendant(root: string, target: string) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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

export async function connectRepository(inputPath: string): Promise<{ repositoryPath: string; commits: CommitInfo[] }> {
  const repositoryPath = await validateRepositoryPath(inputPath);
  const git = simpleGit(repositoryPath);
  const log = await git.log({ maxCount: 24 });
  if (!log.all.length) throw new RepositoryError("Branchline needs at least one commit to inspect a release change.");
  return {
    repositoryPath,
    commits: log.all.map((commit) => ({ hash: commit.hash, message: commit.message, date: commit.date })),
  };
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
