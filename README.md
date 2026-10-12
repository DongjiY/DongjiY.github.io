# DongjiY.github.io

Personal site and an embedded, canvas-backed L2-table demo.

## Run locally

Requirements: Node.js 22 or newer, npm, GNU Make, and Python 3.

Install the locked dependencies once:

```sh
make install
```

Build the complete GitHub Pages site and serve it locally:

```sh
make preview
```

Open [http://localhost:8080](http://localhost:8080), then scroll to the
L2-table section. The embedded demo is lazy-loaded, so it requests its assets
only when it approaches the viewport. Press `Ctrl+C` to stop the server.

Use a different port when needed:

```sh
make preview PORT=3000
```

`make build` writes the same assembled static site that the GitHub Pages
workflow deploys to `_site/`. Run `make clean` to remove generated output.
