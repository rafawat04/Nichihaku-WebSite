# nichihaku.com｜TOP — design reference

This is a design mockup created in a visual design tool, exported as a
standalone page. Treat it as a REFERENCE MOCKUP, not production code:
the markup and inline styles carry the design's precise values — colors,
font sizes, spacing, radii, shadows, layout — which an implementation
should replicate faithfully in its own components and styling system
rather than copy wholesale.

## Contents

- `Main.dc.html` — the artboard (a Design Component: an `<x-dc>`
  template + a small logic class). The values to replicate live in its
  inline `style="…"` attributes and the `<helmet><style>` block.
- `assets/` — files uploaded to the design (images, fonts, media)
- `support.js`, `vendor/react*.js` — the runtime that renders the
  component in a browser; not part of the design.

## Uploaded files

Images, fonts and media uploaded to the design are written once each under
`assets/` — 3 in this export — and the exported files refer to them there. A
reference a script puts together while the page runs (for example
`"/_blob/" + id`) is not rewritten and does not load from this folder.

## Viewing

Serve the folder (e.g. `python3 -m http.server`) and open `Main.dc.html`;
some browsers block the scripts over file://.

## Site

`index.html` is the Nichihaku home page served at https://nichihaku.com. The UNS→N pages live in their own repository and are served at https://uns-n.com.

## Contact form

The home page form (09 — CONTACT) posts to `/api/contact`, handled by the Cloudflare Pages Function in `functions/api/contact.js`, which emails the submission through Resend. It reads these variables from the Pages project settings:

- `RESEND_API_KEY` — Resend API key (secret)
- `CONTACT_TO` — recipients, comma-separated
- `CONTACT_FROM` — sender on the verified domain, e.g. `Nichihaku <contact@nichihaku.com>`

## Deploy

Every push to `main` deploys to the Cloudflare Pages project `nichihaku` through GitHub Actions (`.github/workflows/deploy.yml`). The workflow needs a `CLOUDFLARE_API_TOKEN` repository secret with Cloudflare Pages edit permission. It can also be run by hand from the Actions tab.

The site is served at https://nichihaku.com (Cloudflare Pages project `nichihaku`). DNS is on Cloudflare; mail for @nichihaku.com stays on Xserver via the `mail` A record and MX.
