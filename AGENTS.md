# Repository Guidelines

## Project Structure & Module Organization
- `index.html` wires the UI layout, Tailwind CDN, and modal markup.
- `style.css` holds custom styles layered over Tailwind classes.
- `js/` contains ES modules split by responsibility (`main.js`, `game.js`, `render.js`, `ui.js`, `state.js`, etc.).

## Build, Test, and Development Commands
- No build step is required; this is a static HTML/CSS/JS project.
- Run locally with a static server:
  - `python -m http.server` (then open `http://localhost:8000/index.html`).
- Use a local server (ES modules are blocked on `file://` URLs) to avoid import errors and ensure consistent canvas behavior.

## Coding Style & Naming Conventions
- Indentation: 4 spaces; keep semicolons and trailing commas consistent with existing files.
- Constants: `UPPER_SNAKE_CASE` for config objects and enums (see `CONFIG`, `ITEMS`).
- Functions/variables: `lowerCamelCase`.
- CSS: kebab-case class names; keep component-specific selectors scoped where possible.
- UI text: keep labels short; avoid introducing non-ASCII symbols unless the file already uses them.

## Testing Guidelines
- No automated test framework is configured.
- Validate changes manually in the browser: build placement, UI panels, modals, and canvas rendering.
- When adding features, include a short manual test checklist in your PR description.

## Commit & Pull Request Guidelines
- Git history is not available in this repo; use clear, imperative commit subjects (e.g., "Add condenser tooltip").
- PRs should include:
  - What changed and why.
  - Screenshots or short clips for UI/UX changes.
  - Any gameplay or balancing notes that affect tuning.

## Security & Configuration Tips
- Tailwind is loaded via CDN in `index.html`; if you add new utilities, confirm they exist in the CDN build.
- Avoid introducing a build pipeline unless there is a strong need and the team agrees.
