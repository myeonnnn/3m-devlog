.PHONY: db-up db-down test test-e2e test-all

db-up:
	docker compose up -d

db-down:
	docker compose down

test:
	npm test

test-e2e: db-up
	npm run test:e2e

test-all: test test-e2e
