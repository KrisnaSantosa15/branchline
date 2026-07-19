# Branchline distribution and harness compatibility

Branchline's evidence engine is deliberately independent of an LLM vendor. A
harness invokes its local binary, receives a Markdown brief, then applies its
own reasoning to that explicit evidence. The binary reads Git metadata and
committed files only; it never runs target code, deploys, opens a pull request,
or sends repository evidence to a provider.

## Compatibility matrix

| Harness | Installation route | Project destination | Native package |
| --- | --- | --- | --- |
| Codex | `branchline init codex` | `.agents/skills/` | [`plugins/branchline`](plugins/branchline) + `.agents/plugins/marketplace.json` |
| Claude Code | `branchline init claude-code` | `.claude/skills/` | [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) |
| Cursor | `branchline init cursor` | `.cursor/skills/` | Portable skill |
| GitHub Copilot | `branchline init github-copilot` | `.github/skills/` | Portable skill |
| OpenCode | `branchline init opencode` | `.opencode/skills/` | Portable skill |
| Gemini CLI | `branchline init gemini` | `.gemini/skills/` | Portable skill |

`branchline init all` installs all six adapters into a selected project. The
command skips a skill directory that already exists; it only replaces one when
the caller passes `--force`.

## CLI contract

```text
branchline init <harness|all> [--cwd <project-path>] [--force]
branchline analyze <local-git-path-or-public-https-url> [base-commit] [head-commit]
branchline doctor
```

`analyze` prints an evidence-led Markdown brief. It supports a local Git
repository or a credential-free public HTTPS remote. Local paths are constrained
by the authorized workspace root; remote repositories are shallow-cloned into a
managed cache. No model key is part of this contract.

## Maintainer verification

Run these checks before a release:

```powershell
npm test
npm run typecheck
npm run build
npm run test:distribution
npm run test:codex-plugin
npm run test:claude-plugin
npm run package:check
```

The test suite verifies the engine and simulation. `test:distribution` creates
an isolated temporary project and checks all 12 installed skill files.
`test:claude-plugin` also runs `claude plugin validate .` when Claude Code is
available. `test:codex-plugin` mirrors the official manifest contract; the
bundled Codex helper validator additionally needs `PyYAML` in its Python
runtime.

For the strongest publish-candidate check, pack and execute the result rather
than merely running from the working tree:

```powershell
npm pack --pack-destination .\output\package-smoke
npm exec --package=.\output\package-smoke\krisnasantosa15-branchline-0.2.0.tgz -c "branchline doctor"
```

## Release checklist

1. Change the version in `package.json`, the Codex plugin manifest, and the
   Claude marketplace/plugin manifests together.
2. Run the verification commands above, including a packed-tarball smoke test.
3. Publish the npm package from the owner-authorized npm account:

   ```sh
   npm publish --access public
   ```

4. Push the repository commit before sharing either marketplace command.
5. Test a clean Codex marketplace install and a clean Claude Code marketplace
   install using the published repository.

Publishing is deliberately not automated: npm publication creates a public,
versioned package and must remain an explicit account-owner decision.
