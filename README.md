# CDC GitHub Pages Materials Navigator

This repository is a scalable GitHub Pages site for CDC project materials.

## What this includes

- A custom landing page at `index.html` for long-term resource navigation
- An `artifacts/` area for static deliverables and references
- An interactive checklist at `artifacts/preclearance-checklist/`
- An `apps/` area for future app subprojects
- A GitHub Actions workflow for Pages deployment at `.github/workflows/pages.yml`

## Structure

- `index.html` - main landing page
- `styles/main.css` - shared styling for the hub page
- `artifacts/` - project artifacts and static outputs
- `artifacts/preclearance-checklist/` - interactive pre-clearance rubric artifact
- `artifacts/standalone/` - your current standalone page location
- `apps/` - future web apps or interactive tools
- `.github/workflows/pages.yml` - deployment workflow

## First artifact

The first artifact is a pre-clearance self-review checklist with:

- Dynamic per-section counts
- Overall progress bar
- Completion banner
- Browser persistence using local storage

## Add your current standalone page

Replace the contents of `artifacts/standalone/index.html` with your existing HTML.

## Add future apps

Create a new folder under `apps/`, for example:

- `apps/dashboard/`
- `apps/data-viewer/`

Then link each app from `apps/index.html` and optionally from the homepage cards.

## Publish on GitHub Pages

1. Push this repo to GitHub on branch `main`.
2. In repository settings, ensure Pages source is set to **GitHub Actions**.
3. The workflow deploys automatically on each push to `main`.

## Local preview

From the repository root, run:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser.
