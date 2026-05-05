# P2 Developer Notes — VoteChain / AmVote
**Role:** P2 (Frontend) | **Date:** May 5, 2026

This document logs every deviation from the PDF task tracker, with reasons.

---

## T7 — mesh-config.ts

| | PDF | What Was Done |
|---|---|---|
| Code | `new MeshWallet()` with no args | Removed MeshWallet entirely |
| File exports | `initWallet()` function + `supportedWallets` | `supportedWallets` + `NETWORK_ID` constants only |

**Why:** MeshSDK updated — `MeshWallet()` now requires a mandatory `options` object `(networkId, fetcher, submitter)`. Calling it empty throws `Expected 1 arguments, but got 0`. More importantly, `MeshWallet` is for server/programmatic wallets. AmVote is a browser dApp where users connect their own wallets (Eternl, Lace) — `@meshsdk/react`'s `useWallet()` hook handles this automatically. `initWallet()` is simply not needed.

---

## T8 — WalletConnect Component

| | PDF | What Was Done |
|---|---|---|
| Show address | `wallet.address` (broken) | `name` property |
| connect call | `connect()` no args | `connect('eternl')` |
| MeshProvider | Not mentioned | Added to `main.jsx` |

**Why:**
- `wallet.address` does not exist on the `useWallet()` hook object — it returns `undefined`. To get the address you must call `await wallet.getChangeAddress()` (async). For the connect button, `name` (e.g. `"eternl"`) is sufficient to show connection status.
- `connect()` requires a wallet name string argument in the current MeshSDK version.
- `MeshProvider` is non-negotiable — without it, `useWallet()` throws `useWallet must be used within a MeshProvider` and the entire app crashes. The PDF forgot this step entirely.

---

## T9 — useWallet Hook

| | PDF | What Was Done |
|---|---|---|
| Get address | `meshWallet.wallet.address` (sync) | `await meshWallet.wallet.getChangeAddress()` (async) |
| File extension | `useWallet.ts` | `useWallet.js` |

**Why:**
- `.wallet.address` is not a valid property in the browser context — always returns `undefined`. The correct method is the async `getChangeAddress()`, wrapped in an async function inside `useEffect`.
- Extension changed to `.js` because the project was scaffolded with `--template react` (plain JavaScript), not `--template react-ts`. Using `.ts` without TypeScript configured causes errors.

---

## vite.config.js — Node.js Polyfills (Not in PDF)

The PDF had no mention of Vite configuration. MeshSDK depends on Node.js built-ins that don't exist in the browser, causing these fatal errors:

| Error | Cause |
|---|---|
| `global is not defined` | MeshSDK uses Node.js `global` |
| `process is not defined` | MeshSDK uses Node.js `process` |
| `Buffer is not defined` | Cardano crypto libs need `Buffer` |
| `events` / `util` externalized | Node.js-only modules |

**Fix applied:**
```bash
npm install --save-dev vite-plugin-node-polyfills
```
```js
// vite.config.js
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills()],
  define: { global: 'globalThis' },
})
```

---

## App.css — Cleared Default Vite Styles (Not in PDF)

**Why:** The default Vite template CSS had dark background colors for the Vite welcome page, making the entire page appear black and hiding the WalletConnect button. Since `App.jsx` was fully replaced, the old CSS was irrelevant and was cleared.

**Replaced with:**
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background-color: #ffffff; color: #000000; }
#root { padding: 20px; }
```

---

## Summary

| Task | PDF Instruction | What Was Done | Reason |
|---|---|---|---|
| T7 mesh-config | `new MeshWallet()` | Constants only | API changed, not needed for browser dApp |
| T8 WalletConnect | `wallet.address` | `name` property | `.address` doesn't exist on hook |
| T8 connect() | `connect()` | `connect('eternl')` | Wallet name arg now required |
| T8 MeshProvider | Not mentioned | Added to `main.jsx` | App crashes without it |
| T9 get address | `.wallet.address` sync | `await getChangeAddress()` async | `.address` returns undefined |
| T9 file extension | `.ts` | `.js` | Project uses plain JS not TypeScript |
| vite.config.js | Not mentioned | `nodePolyfills()` added | MeshSDK needs Node.js polyfills in browser |
| App.css | Not mentioned | Cleared old styles | Default Vite CSS caused black screen |
