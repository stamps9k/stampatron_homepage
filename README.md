# stampatron_homepage

Source for [stampatron.com](https://www.stampatron.com), the hub that links out to my hobby projects: software renderers, WebGPU experiments, Mega Drive homebrew and small web tools.

It's a plain static site. No framework and no build step; the HTML, CSS and JS in `www/` are exactly what gets served.

## Pages

| Page | What it does |
| --- | --- |
| `index.html` | Landing page. The hero is a "render viewport" showing the 3D Stampatron logo rotating over a scrolling synthwave landscape, drawn with WebGL (falls back to a CPU rasteriser on a 2D canvas, then to a static image) |
| `projects.html` | Filterable project grid plus a live "recent activity" feed pulled from the GitHub API |
| `cv.html` | Online CV, with a downloadable PDF at `docs/cv.pdf` |
| `contact.html` | Contact links, with a decorative particle-network canvas |

## Projects linked from the site

Each project lives on its own subdomain and in its own repo:

- [homebrew.stampatron.com](https://homebrew.stampatron.com): Sega Mega Drive homebrew (68000 assembly)
- [hopdrop.stampatron.com](https://hopdrop.stampatron.com): WebRTC file transfer
- [webgpu-particles.stampatron.com](https://webgpu-particles.stampatron.com/): Particle Playground (WebGPU/WGSL)
- [model-viewer.stampatron.com](https://model-viewer.stampatron.com): 3D model viewer
- [webasm-triangle.stampatron.com](https://webasm-triangle.stampatron.com): Rust/WASM triangle renderer

## Layout

```
www/
├── *.html          site pages
├── css/new/        shared stylesheet set (see below)
├── js/             page scripts (hero renderer + logo mesh data, particles, GitHub feed)
├── img/            logo, headshot, hero fallback image, favicons
├── docs/cv.pdf
└── robots.txt
Dockerfile          nginx image that serves www/
.github/workflows/  image build and publish
```

### Shared CSS

`css/new/base.css` is the canonical design-token set for every stampatron.com site and subdomain. Each site loads Bootstrap 5.3 (from jsDelivr), then `base.css`, then its own `<site-name>.css`. The per-site files for the other projects (`particles.css`, `hopdrop.css`, `model-viewer.css`, `webasm-triangle.css`) are kept here as the reference copy.

This site's own files are `homepage.css` (shared by all four pages), `github-feed.css` (projects page) and `synthwave-panel.css` (the homepage hero, which uses the `base.css` tokens rather than its own colours).

### Homepage hero

`js/synthwave-panel.js` draws the hero with no libraries. `js/synthwave-logo-data.js` holds the logo's triangle mesh (positions, normals and colours) as `window.StampatronLogoMesh`. The renderer tries WebGL first, then a CPU painter's-algorithm rasteriser on a 2D canvas, then a static image (`img/stampatron-synthwave-fallback.webp`, only downloaded if needed); the HUD's PIPELINE/SHADER labels show which one is active. Animation pauses when the hero is off-screen or the tab is hidden, and stops for visitors with reduced motion enabled.

## Running locally

Any static file server pointed at `www/` works:

```sh
cd www
python3 -m http.server 8000
```

## Deployment

The `Dockerfile` copies `www/` into `nginx:stable-alpine`. Pushing to the `deploy-latest` branch (or triggering the workflow manually) runs `.github/workflows/build-and-push.yml`, which builds the image and publishes it to `ghcr.io/stamps9k/stampatron_homepage:latest`. The server then pulls and runs that image behind the main NGINX reverse proxy.

## External dependencies

Loaded at runtime from CDNs: Bootstrap 5.3.3 (CSS and JS bundle), Google Fonts (JetBrains Mono, Inter). The projects page also calls `api.github.com` for the activity feed and degrades to a short message if that request fails.

## License

[GPL-3.0](LICENSE)

