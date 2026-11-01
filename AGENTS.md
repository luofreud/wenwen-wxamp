# Repository Guidelines

## Project Structure & Module Organization

Application code lives under `miniprogram/`: `app.*` defines global behavior and styling; `pages/<name>/` contains each page's `.ts`, `.json`, `.wxml`, and `.less` files; reusable UI belongs in `components/`; shared helpers in `utils/`; and images, fonts, and demo data in `assets/`. WeChat API declarations are in `typings/`. Root-level `project.config.json` and `tsconfig.json` configure WeChat DevTools and TypeScript.

## Build, Test, and Development Commands

- `npm install` installs the Mini Program API type declarations.
- `npx tsc --noEmit` performs a strict TypeScript check without generating files.
- Open the repository root in WeChat DevTools to compile, preview, and debug the app. The tool uses `miniprogram/` as the source root and compiles TypeScript and Less.

There are no npm build, lint, or test scripts. Do not depend on one until it is added to `package.json`.

## Coding Style & Naming Conventions

Use 2-space indentation, single quotes in TypeScript, trailing commas in multiline objects, and the existing semicolon-free style. Keep TypeScript strict: avoid `any`, handle nullable values, and remove unused declarations. Use `camelCase` for variables and functions, `PascalCase` for types, and uppercase snake case for shared constants. Name page and component directories with kebab-case, such as `star-chart/`, and their entry files `index.*`. Move reusable behavior to `utils/` or `components/`.

## Testing Guidelines

No automated test framework or coverage threshold is configured. Before submitting, run `npx tsc --noEmit` and exercise affected flows in the WeChat DevTools simulator. Check navigation, canvas rendering, interactions, and a representative device size. Name future tests descriptively with `*.test.ts`.

## Commit & Pull Request Guidelines

Recent commits use short Conventional Commit subjects such as `feat: initial project` and `chore: adjust project config`. Continue with imperative subjects in the form `type: summary` (`feat`, `fix`, `chore`, `refactor`, or `docs`). Keep each commit focused. Pull requests should explain the user-visible change, list verification steps, link relevant issues, and include screenshots or recordings for UI or canvas changes. Call out changes to `project.config.json`, permissions, or bundled assets explicitly.

## Configuration & Security

Do not add secrets or session data to either project configuration file. Coordinate changes to the tracked `project.private.config.json`, and review licenses before adding fonts or images.
