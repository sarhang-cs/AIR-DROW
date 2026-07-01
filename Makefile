.PHONY: web-install web-check web-build server-install server-run run docker-up preflight

web-install:
	cd web && npm install

web-check:
	cd web && npm run check

web-build:
	cd web && npm run build

server-install:
	cd server && python3 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt

server-run:
	cd server && . .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8787

run:
	bash scripts/start-local.sh

docker-up:
	docker compose up --build

preflight:
	cd web && npm run preflight
