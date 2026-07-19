import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import type { AnalysisResult, Mitigation, MitigationStatus, Scenario, Workspace } from "@/lib/domain";

type WorkspaceRow = { id: string; name: string; repository_path: string; repository_source_json?: string | null; commits_json: string; created_at: string; updated_at: string };

let sqlite: Database.Database | undefined;

function database() {
  if (sqlite) return sqlite;
  const databasePath = process.env.BRANCHLINE_DB_PATH ?? join(process.cwd(), "data", "branchline.db");
  mkdirSync(dirname(databasePath), { recursive: true });
  sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repository_path TEXT NOT NULL,
      repository_source_json TEXT,
      commits_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS analyses (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scenarios (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      analysis_id TEXT NOT NULL,
      scenario_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mitigations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      analysis_id TEXT NOT NULL,
      mitigation_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  const columns = database().prepare("PRAGMA table_info(workspaces)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "repository_source_json")) {
    database().exec("ALTER TABLE workspaces ADD COLUMN repository_source_json TEXT");
  }
  return sqlite;
}

function hydrateWorkspace(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    repositoryPath: row.repository_path,
    source: row.repository_source_json ? JSON.parse(row.repository_source_json) : { kind: "local", value: row.repository_path },
    commits: JSON.parse(row.commits_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createWorkspace(input: Omit<Workspace, "id" | "createdAt" | "updatedAt">): Workspace {
  const now = new Date().toISOString();
  const workspace: Workspace = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
  database()
    .prepare("INSERT INTO workspaces (id, name, repository_path, repository_source_json, commits_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(workspace.id, workspace.name, workspace.repositoryPath, JSON.stringify(workspace.source), JSON.stringify(workspace.commits), now, now);
  return workspace;
}

export function getWorkspace(id: string): Workspace | undefined {
  const row = database().prepare("SELECT * FROM workspaces WHERE id = ?").get(id) as WorkspaceRow | undefined;
  return row ? hydrateWorkspace(row) : undefined;
}

export function listWorkspaces(): Workspace[] {
  return (database().prepare("SELECT * FROM workspaces ORDER BY updated_at DESC, created_at DESC").all() as WorkspaceRow[]).map(hydrateWorkspace);
}

export function saveAnalysis(analysis: AnalysisResult): AnalysisResult {
  database()
    .prepare("INSERT OR REPLACE INTO analyses (id, workspace_id, result_json, created_at) VALUES (?, ?, ?, ?)")
    .run(analysis.id, analysis.workspaceId, JSON.stringify(analysis), analysis.createdAt);
  return analysis;
}

export function getLatestAnalysis(workspaceId: string): AnalysisResult | undefined {
  const row = database()
    .prepare("SELECT result_json FROM analyses WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(workspaceId) as { result_json: string } | undefined;
  return row ? (JSON.parse(row.result_json) as AnalysisResult) : undefined;
}

export function getAnalysis(id: string): AnalysisResult | undefined {
  const row = database().prepare("SELECT result_json FROM analyses WHERE id = ?").get(id) as { result_json: string } | undefined;
  return row ? (JSON.parse(row.result_json) as AnalysisResult) : undefined;
}

export function saveScenario(scenario: Scenario): Scenario {
  database()
    .prepare("INSERT OR REPLACE INTO scenarios (id, workspace_id, analysis_id, scenario_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(scenario.id, scenario.workspaceId, scenario.analysisId, JSON.stringify(scenario), scenario.createdAt, scenario.updatedAt);
  return scenario;
}

export function getScenario(id: string): Scenario | undefined {
  const row = database().prepare("SELECT scenario_json FROM scenarios WHERE id = ?").get(id) as { scenario_json: string } | undefined;
  return row ? (JSON.parse(row.scenario_json) as Scenario) : undefined;
}

export function listScenarios(workspaceId: string): Scenario[] {
  return (database().prepare("SELECT scenario_json FROM scenarios WHERE workspace_id = ? ORDER BY created_at ASC").all(workspaceId) as Array<{ scenario_json: string }>).map(
    (row) => JSON.parse(row.scenario_json) as Scenario,
  );
}

export function saveMitigation(mitigation: Mitigation): Mitigation {
  database()
    .prepare("INSERT OR REPLACE INTO mitigations (id, workspace_id, analysis_id, mitigation_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(mitigation.id, mitigation.workspaceId, mitigation.analysisId, JSON.stringify(mitigation), mitigation.createdAt, mitigation.updatedAt);
  return mitigation;
}

export function listMitigations(analysisId: string): Mitigation[] {
  return (database().prepare("SELECT mitigation_json FROM mitigations WHERE analysis_id = ? ORDER BY created_at ASC").all(analysisId) as Array<{ mitigation_json: string }>).map(
    (row) => JSON.parse(row.mitigation_json) as Mitigation,
  );
}

export function updateMitigation(id: string, status: MitigationStatus, editedContent?: string): Mitigation | undefined {
  const row = database().prepare("SELECT mitigation_json FROM mitigations WHERE id = ?").get(id) as { mitigation_json: string } | undefined;
  if (!row) return undefined;
  const current = JSON.parse(row.mitigation_json) as Mitigation;
  const updated: Mitigation = {
    ...current,
    status,
    editedContent: editedContent ?? current.editedContent,
    updatedAt: new Date().toISOString(),
  };
  return saveMitigation(updated);
}

export function resetDatabaseForTests() {
  if (!process.env.VITEST) return;
  database().exec("DELETE FROM mitigations; DELETE FROM scenarios; DELETE FROM analyses; DELETE FROM workspaces;");
}
