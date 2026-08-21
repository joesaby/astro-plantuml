# Agent Instructions - astro-plantuml

## Project Summary

astro-plantuml is an Astro integration that converts PlantUML code blocks in markdown into diagrams (SVG/PNG) via a PlantUML server or pre-generated local files. Published to npm as `astro-plantuml`.

## Architecture

- **Integration entry**: `src/index.ts` — detects `markdown.processor` and registers remark or Sätteri mdast plugins
- **Remark plugin**: `src/remark-plugin.ts`
- **Sätteri plugin**: `src/satteri-plugin.ts`
- **Shared render**: `src/render.ts`
- **CLI**: `bin/generate.js` + `src/remark-cli.ts`
- **Docs**: Starlight site under `docs/`

## Commit Convention

This project uses **semantic-release** with **Conventional Commits**. All commits must follow:

```
<type>[optional scope]: <description>
```

| Type | Release | Example |
|------|---------|---------|
| `fix` | Patch | `fix: fall back to server when local SVG missing` |
| `feat` | Minor | `feat: support Astro 7 Sätteri markdown processor` |
| `feat!` / `BREAKING CHANGE:` | Major | `feat!: require Astro 7` |
| `chore`, `docs`, `ci`, `test`, `refactor`, `style` | None | `chore: update typescript` |

### Rules

- PR titles should use conventional commit format (they become the squash-merge commit message)
- Never manually edit `version` in `package.json` — semantic-release manages it
- `chore:` commits do **not** trigger a release

## Release Pipeline

1. Push/merge to `main` triggers `.github/workflows/release.yml`
2. Workflow runs `npm ci`, `npm run build`, then `semantic-release`
3. If a releasable commit is found: bumps version, publishes to npm, creates GitHub release and tag
4. Authentication uses **npm Trusted Publishing (OIDC)** — same as `astro-mermaid`. There is **no** `NPM_TOKEN` secret. Configure the Trusted Publisher on https://www.npmjs.com/package/astro-plantuml for workflow `release.yml`.

## Development Workflow

```bash
npm install
npm run build
npm run dev   # tsc --watch
```
