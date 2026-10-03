# EduAdmin Pro — Brand assets

## Official logo in the application

The app does **not** use a raster logo file (PNG/JPG). The official identity is built in React/CSS:

| Element | Specification |
|---------|----------------|
| Icon | Font Awesome `faGraduationCap` (graduation cap) |
| Icon container | Rounded square (`rounded-xl`), `bg-gradient-primary` |
| Default gradient | `linear-gradient(135deg, #3b82f6 → #2563eb → #1d4ed8)` (blue theme) |
| Wordmark | **EduAdmin** (display font) + **Pro** (primary color / uppercase tracking) |
| Display font | **Sora** (`font-display` in Tailwind) |

## Files in this folder (presentation-ready)

| File | Type | Use case |
|------|------|----------|
| `eduadmin-pro-logo-light.svg` | Full logo (dark text) | **PFE cover — light/white slides** |
| `eduadmin-pro-logo-dark.svg` | Full logo (white text) | Dark slide backgrounds |
| `eduadmin-pro-icon.svg` | Icon only 512×512 | App icon, favicon replacement, square placements |

**Recommended for PowerPoint cover:** `eduadmin-pro-logo-light.svg` or `eduadmin-pro-logo-dark.svg` depending on slide background.

SVG scales to any resolution in PowerPoint (Insert → Pictures). For PNG export: open in browser or Inkscape and export at 300 DPI (e.g. 2400px width).

## Not the project logo

| Path | Note |
|------|------|
| `frontend/dist/vite.svg` | Default **Vite** favicon — not EduAdmin Pro |
| `frontend/index.html` | `href="/vite.svg"` — should be replaced with `eduadmin-pro-icon.svg` for production |

## Frontend references (code locations)

| Location | File | Lines / component |
|----------|------|-------------------|
| Sidebar brand | `frontend/src/components/sidebar/PremiumSidebar.jsx` | Logo block (~84–101) |
| Landing navbar & footer | `frontend/src/pages/landing/LandingPage.jsx` | `BrandLogo` (~85–96) |
| Login page | `frontend/src/pages/auth/Login.jsx` | Icon + "EduAdmin Pro" (~131–134) |
| Forgot password | `frontend/src/pages/auth/ForgotPassword.jsx` | (~31–35) |
| Reset password | `frontend/src/pages/auth/ResetPassword.jsx` | (~74–77) |
| Auth split layout | `frontend/src/components/auth/AuthSplitLayout.jsx` | (~25–29) |
| Page title / meta | `frontend/index.html` | `<title>EduAdmin Pro</title>` |

## Dark vs light mode

In the live app, the same icon + gradient is used everywhere; only text colors change:

- **Light:** `EduAdmin` → dark (`text-surface-900`), `Pro` → `text-primary-500`
- **Dark:** `EduAdmin` → white, `Pro` → primary tint

There is no separate image asset per theme—only CSS/Tailwind variants.
