# EasySpot
### IES Group Project G703

## About
EasySpot is a real-time parking analytics platform that shows live parking occupancy, EV charger status, and accessible-bay availability across urban sites.

## Team

| Student Number | Name | Role |
|----------------|------|------|
| 127368 | Claudino Martins | DevOps |
| 125895 | Ines Gomes | Product Owner |
| 125102 | Maria Mane | Team Manager |
| 124833 | Martim Gil | Architect |


### First Run

1. Enter the local environment folder:

```bash
cd projX
```

2. Run initial setup:

```bash
make setup
```

If `.env` does not exist, this command creates it from `.env.example` and exits.

3. Edit `.env` and fill in the required secrets/variables.

4. Run setup again:

```bash
make setup
```

5. Bootstrap Authentik:

```bash
make bootstrap
```

## How the Makefile Works

The Makefile is located at `projX/Makefile` and wraps Docker Compose and bootstrap commands.

### Available Targets

- `make help`
  Shows available commands and the recommended flow.

- `make setup`
  First-time setup flow.
  - If `.env` does not exist, copies `.env.example` to `.env` and asks you to fill secrets.
  - If `.env` exists, runs `docker compose up -d` and suggests `make bootstrap`.

- `make up`
  Starts all services in the background (`docker compose up -d`).

- `make down`
  Stops services without removing volumes (`docker compose down`).

- `make logs`
  Follows logs from all services (`docker compose logs -f`).

- `make bootstrap`
  Runs `bootstrap_authentik.py` with Python 3 to auto-configure Authentik.

- `make clean`
  Stops services and removes volumes (`docker compose down -v`).
  Warning: this command deletes persisted local database data.