# ParkGuard

Parking on autopilot. One codebase, two brands, and the same build feeds the web
app, Android and iOS.

Based on the `parkguard_v12` prototype, with the start/stop timing replaced by
the shared autopilot engine.

## The rule the app is built around

Ignoring your phone is never the expensive option:

| | prompt 1 | prompt 2 | no answer |
| --- | --- | --- | --- |
| **Start** | "Parking detected" | "Last reminder" | **nothing happens** — you can't be charged by accident |
| **Stop** | "You drove off" | "Last reminder" | **session keeps running** — you can't be fined by accident |

That asymmetry lives in `src/core/autopilot.js` and is covered by `npm test`.

## Where to make a change

**General change — both brands, both platforms get it.** Everything outside
`brands/`:

```
src/core/     autopilot engine, session logic   ← the shared rules
src/ui/       screens, styles, the bridge       ← the shared interface
index.html    markup
```

**Brand-specific change — only that brand.** Everything inside `brands/<id>/`:

```
brands/parkguard/brand.json    name, appId, colours, copy, language
brands/parkguard/icons/        icon-192 / icon-512 / icon-512-maskable / apple-touch-icon
```

Nothing in `src/` names a brand. `scripts/sync-brand.mjs` reads the chosen
`brand.json` and writes `src/brand/active.json`, `capacitor.config.json` and the
icons into `public/` before every build — so a general change physically cannot
miss a brand, and `npm run build:all` proves it by building all of them.

Adding a third brand is a new folder under `brands/` and nothing else.

## Commands

```bash
npm install
npm run dev                 # ParkGuard by default
BRAND=parkmatiq npm run dev # the other brand
npm test                    # the autopilot rules
npm run build               # → dist/
npm run build:all           # → dist-parkguard/, dist-parkmatiq/
```

## On your phone

**As a web app (no store, updates on push):** the Pages workflow publishes
`dist/` on every push to `main`. Open the published URL on the phone and use
Add to Home Screen — it then launches standalone, with its own icon, and updates
itself on next launch.

**As a native app (needed for background start/stop):** the web build is wrapped
by Capacitor. Both platforms are driven from the same `dist/`, so a general
change reaches them together.

```bash
npm run android:add    # once — needs Android Studio
npm run ios:add        # once — needs Xcode, so macOS only
npm run native:sync    # after any change — rebuilds every brand and pushes it into all their native shells
npm run android:open   # build, sync, open Android Studio
npm run ios:open       # build, sync, open Xcode
```

A browser gives the app no location once it is closed, which is why the
autopilot only runs while the app is open on the web build. Background operation
needs the native wrapper plus a background-geolocation plugin —
`@capacitor/geolocation` is foreground-only.
