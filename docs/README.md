# Variational Streaming Flow project page

This directory contains a dependency-free static project page for **Variational Streaming Flow: Probabilistic Forecasting in Physical Time**.

## Local preview

From the repository root, run:

```bash
python3 serve_docs.py
```

Then open <http://localhost:8090/>. This development server disables caching, so a normal refresh always requests the current HTML, CSS, JavaScript, and figures. There is no build step.

If a previous server is still using port `8090`, stop it with `Ctrl+C` before starting this one.

## Structure

- `index.html` — page content and metadata
- `static/css/site.css` — responsive visual design
- `static/js/site.js` — mobile navigation, the linked bifurcation explainer, result tabs, and citation copying
- `assets/paper.pdf` — local manuscript copy
- `assets/figures/` — web-ready figures converted from the LaTeX project

## GitHub Pages

The site can be published directly from `main` → `/docs` in the repository's **Settings → Pages** screen. The `.nojekyll` marker keeps GitHub Pages from applying Jekyll processing.

The page uses the author list from the named `arxiv.tex` build. Before public deployment during double-blind review, confirm that the chosen release timing and author visibility comply with the venue's policy.

When the final public domain is known, replace the relative `og:image` metadata and add an absolute `og:url` in `index.html` so social link previews can resolve the project image reliably.
