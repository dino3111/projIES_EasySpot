.PHONY: help up down logs bootstrap setup clean

PYTHON := python3
COMPOSE := docker compose

help:
	@echo "EasySpot - Local Development"
	@echo ""
	@echo "  make setup      First-time setup: copy .env, start services"
	@echo "  make up         Start all local services"
	@echo "  make down       Stop all services"
	@echo "  make logs       Follow logs (all services)"
	@echo "  make bootstrap  Run Authentik bootstrap (auto-creates akadmin if needed)"
	@echo "  make clean      Stop and remove all volumes"
	@echo ""
	@echo "First time? Run: make setup && make bootstrap"

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

bootstrap:
	@grep -v '^\s*#' .env | grep -v '^\s*$$' | grep -v '^UID=' | grep -v '^GID=' > /tmp/.env.bootstrap && \
	export $$(cat /tmp/.env.bootstrap | xargs -d '\n') 2>/dev/null; \
	$(PYTHON) bootstrap_authentik.py; \
	rm -f /tmp/.env.bootstrap

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example — fill in secrets before continuing."; \
		echo "Then run: make setup again"; \
		exit 0; \
	fi
	$(COMPOSE) up -d
	@echo ""
	@echo "Services are starting. Authentik may take 1-2 minutes."
	@echo ""
	@echo "Next step: run 'make bootstrap' to auto-configure Authentik"

clean:
	$(COMPOSE) down -v
