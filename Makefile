SHELL := /bin/sh

PORT ?= 8080
SITE_DIR := _site

.PHONY: help install build preview clean

help:
	@printf '%s\n' \
		'make install  Install the locked npm dependencies.' \
		'make build    Build the demo and assemble the GitHub Pages site in _site/.' \
		'make preview  Build and serve the complete site at http://localhost:$(PORT).' \
		'make clean    Remove generated build output.'

install:
	npm ci

build:
	npm run build:l2-table-demo
	rm -rf $(SITE_DIR)
	mkdir -p $(SITE_DIR)/demos
	cp index.html layout.css style.css pigling.png $(SITE_DIR)/
	cp -R demos/swipe $(SITE_DIR)/demos/swipe
	cp -R demos/l2-table/dist $(SITE_DIR)/demos/l2-table
	rsync -a --exclude='/concert/template.html' symphony/ $(SITE_DIR)/symphony/
	touch $(SITE_DIR)/.nojekyll
	node scripts/inject-tracking.mjs $(SITE_DIR)

preview: build
	npx concurrently --kill-others-on-fail \
		"npm run watch:site" \
		"npx vite --host 127.0.0.1 --port $(PORT) $(SITE_DIR)"

clean:
	rm -rf $(SITE_DIR)
