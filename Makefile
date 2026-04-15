# Prag – Prague Explorer – Makefile
# ══════════════════════════════════════════════════

PYTHON = python
VENV = .venv
PIP = $(VENV)/Scripts/pip
PY = $(VENV)/Scripts/python
NPM = npm

.PHONY: help setup setup-python setup-node dev build clean fetch-places enrich descriptions pipeline deploy

help:
	@echo ""
	@echo "  Prag - Prague Explorer"
	@echo "  ═══════════════════════════════════════════"
	@echo ""
	@echo "  SETUP"
	@echo "    make setup          Create .venv and install Python + Node deps"
	@echo "    make setup-python   Python venv only"
	@echo "    make setup-node     npm install only"
	@echo ""
	@echo "  DEVELOPMENT"
	@echo "    make dev            Start Next.js dev server (http://localhost:3000)"
	@echo "    make build          Production build"
	@echo ""
	@echo "  DATA PIPELINE"
	@echo "    make fetch-places   Run Places API searchText for every query"
	@echo "    make descriptions   Generate short AI descriptions"
	@echo "    make pipeline       fetch-places + descriptions"
	@echo ""
	@echo "  DEPLOY"
	@echo "    make deploy         git push origin main (Vercel auto-deploys)"
	@echo ""

setup: setup-python setup-node
	@echo "All dependencies installed"

setup-python:
	$(PYTHON) -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -e ".[dev]"

setup-node:
	$(NPM) install

dev:
	$(NPM) run dev

build:
	$(NPM) run build

fetch-places:
	$(PY) scripts/fetch_places.py

descriptions:
	$(PY) scripts/generate_descriptions.py

pipeline: fetch-places descriptions

deploy:
	git add -A
	git diff --cached --quiet || git commit -m "Update"
	git push origin main

clean:
	rm -rf $(VENV) node_modules .next
