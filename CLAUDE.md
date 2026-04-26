# MISE

React SPA (client-side Babel, no build step) + Supabase Auth + Vercel.

## Architecture

- `index.html` — entry point, loads all `.jsx` via `<script type="text/babel">`
- `app.jsx` — `INITIAL` state, `appReducer` (useReducer), `AuthGate` wrapper, `BottomNav`, `Header`
- `pages.jsx` — `BrandsPage`, `ProductsPage`, `TimelinePage`, `BookmarksPage`, `SettingsPage`, `ProductCard`
- `brands.jsx` — `BrandCard`, `BrandRow`, `BrandsPage` helpers
- `components.jsx` — shared: `Button`, `Swatch`, `Modal`, `useToast`, `Toast`
- `auth.jsx` — `AuthGate` (Supabase session guard)
- `styles.css` — single stylesheet, CSS variables in `:root`
- `api/` — Vercel serverless: `config.js` (env), `fetch-meta.js` (OGP), `cron/sync-products.js`

## State shape (INITIAL in app.jsx)

```js
{ view, brands, products, genres, budget, ui: { modal, ... } }
```

All persisted as one JSONB blob in Supabase `user_data` table (migration4.sql).

## Cross-file symbol sharing

`Object.assign(window, { ComponentName })` at bottom of each file — no imports.

## Key patterns

- `dispatch({ type: 'saveProduct', product: {...} })` — upserts by id
- `??` not `||` for numeric/boolean fields in loadData (0 is valid)
- `cx()` for conditional classnames
- `fmtYen(n)` for price display
- `useToast()` hook from components.jsx

## Dev branch

`claude/finalize-project-features-mYikb`
