# Astro PlantUML Integration Project

## Overview
This is an Astro integration that automatically converts PlantUML code blocks in markdown files to diagrams using the PlantUML server.

## Project Structure
```
astro-plantuml/
├── src/               # Source TypeScript files
│   ├── index.ts      # Main integration entry point
│   ├── remark-plugin.ts  # Remark plugin implementation
│   ├── types.ts      # TypeScript type definitions
│   └── utils.ts      # Utility functions (base64 encoding)
├── dist/             # Compiled JavaScript files (generated)
└── docs/             # Documentation site (Starlight)
```

## Key Features
- Automatic PlantUML diagram rendering
- Configurable PlantUML server URL
- Error handling with fallback
- CSS class injection for styling
- TypeScript support

## Development Commands
```bash
# Build the integration
npm run build

# Watch mode for development
npm run dev
```

## Testing & Validation
Before committing changes:
1. Run `npm run build` to ensure TypeScript compilation succeeds
2. Test the integration in your Astro project
3. Verify all PlantUML diagram types render correctly

## Integration Architecture
The integration uses Astro's hook system to inject a remark plugin that:
1. Finds code blocks with language "plantuml" in the markdown AST
2. Extracts the PlantUML content before syntax highlighting
3. Encodes it using PlantUML's custom base64 encoding with raw deflate
4. Fetches the diagram from the PlantUML server
5. Replaces the code block with an HTML image element

## Publishing Checklist
Releases are automated via semantic-release on `main` (`.github/workflows/release.yml`).

- [ ] Use Conventional Commits (`feat:`, `fix:`, …) — these drive the version bump
- [ ] Ensure `"withastro"` keyword is present
- [ ] Run `npm run build` locally before merging
- [ ] Update README with any new features
- [ ] Merge to `main` — do **not** manually edit `version` or run `npm publish`

## Common Issues
1. **Build errors**: Ensure all dependencies are installed
2. **Diagram rendering fails**: Check PlantUML server URL and network connectivity
3. **TypeScript errors**: Run `npm run build` to catch type issues early

## Recent Changes (v0.2.0)
- Astro 7 Sätteri markdown processor support
- Processor-aware registration (Sätteri / unified / legacy)
- Shared render helpers for remark, Sätteri, and CLI paths

## Important Notes
- The package is published to npm as `astro-plantuml`
- Documentation site available in the /docs directory
- npm publish uses the `npm_token` GitHub Actions secret (`NODE_AUTH_TOKEN`); semantic-release updates CHANGELOG.md and commits release assets