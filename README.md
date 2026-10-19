# Work Items — Team Workflow App

A full-stack team workflow application with role-based access, work items, a server-enforced status workflow, optimistic concurrency control, activity history, comments, filtering, search, and pagination.

## Technology Stack

* **Frontend:** React 19, Vite, TanStack Query
* **Backend:** Node.js 22, Express 5, Zod, JWT
* **Database:** PostgreSQL 16, Prisma with the PostgreSQL driver adapter
* **Testing:** Vitest, Supertest
* **Local environment:** Docker Compose

## Prerequisites

* Docker Desktop installed and running.
* Docker Compose available through Docker Desktop.
* An internet connection for the initial image and package downloads.

For Windows installation instructions, see the [Docker Desktop installation guide](https://docs.docker.com/desktop/setup/install/windows-install/).

## Getting Started

### 1. Open the project directory

Open PowerShell and navigate to the directory containing `docker-compose.yml`.

```powershell
cd path\to\workflow-app
```

### 2. Configure environment variables

The project includes an `.env.example` file.

For local development, you can copy it to `.env`:

```powershell
Copy-Item .env.example .env
```

Review the environment variables before starting the application. Keep `.env` private and never commit it to Git.

### 3. Build and start the application

Run:

```powershell
docker compose up --build
```

Docker Compose starts the PostgreSQL database, backend API, and frontend.

Wait until the backend has initialized the database, applied migrations, seeded the demo users, and started listening on port 4000.

Keep the terminal open to monitor service logs.

### 4. Open the application

* **Frontend:** http://localhost:5173
* **Backend health check:** http://localhost:4000/health

The health endpoint should return:

```json
{
  "status": "ok"
}
```

## Demo Accounts

All seeded accounts use the password `password123`.

| Email               | Role                                |
| ------------------- | ----------------------------------- |
| `admin@example.com` | Admin in Support and Payments       |
| `lee@example.com`   | Lead in Support, Member in Payments |
| `mia@example.com`   | Member in Support                   |
| `sam@example.com`   | Member in Payments                  |
| `vic@example.com`   | Viewer in Support                   |

These credentials are intended for local demonstrations only.

## Running Tests

Start the application with Docker Compose. Open a second PowerShell terminal in the project directory and run:

```powershell
docker compose exec backend npm test
```

The tests use the database initialized by the backend. They create additional work items and do not automatically reset the database.

## Application Features

### Authentication and Authorization

* JWT-based authentication.
* Team memberships with roles.
* Role-based restrictions on work-item creation and updates.
* Team-based access control.

### Work Items

Work items include a title, description, type, priority, status, team, assignee, creator, due date, version, and timestamps.

### Workflow

The main workflow is:

`OPEN → IN_PROGRESS → AWAITING_APPROVAL → RESOLVED → CLOSED`

Additional supported transitions include:

* `IN_PROGRESS → OPEN`
* `AWAITING_APPROVAL → IN_PROGRESS` when a Lead or Admin rejects an item.
* `RESOLVED → IN_PROGRESS` when an item is reopened.

A closed item is read-only.

The backend validates workflow transitions and approval permissions. Updates use version checks to detect stale changes and return HTTP `409 Conflict`.

### Activity History and Comments

The application records work-item creation and supported changes in an activity history. Update events are written in the same database transaction as the corresponding work-item changes.

Comments are available through the comments API.

### Dashboard

The application supports:

* Items assigned to the current user.
* Unassigned urgent items.
* Items awaiting approval in teams where the user has the required role.
* Search and filtering.
* Server-side pagination.

## API Overview

| Method | Endpoint              | Purpose                                         |
| ------ | --------------------- | ----------------------------------------------- |
| GET    | `/health`             | Health check                                    |
| POST   | `/auth/login`         | Authenticate and receive a token                |
| GET    | `/auth/me`            | Retrieve the current user                       |
| GET    | `/teams`              | Retrieve teams, roles, and teammates            |
| POST   | `/items`              | Create a work item; requires Member or higher   |
| GET    | `/items`              | Retrieve filtered and paginated work items      |
| GET    | `/items/:id`          | Retrieve work-item details and activity history |
| PATCH  | `/items/:id`          | Update a work item using a version check        |
| POST   | `/items/:id/comments` | Add a comment; requires Member or higher        |

## Useful Docker Commands

View service status:

```powershell
docker compose ps
```

Follow all service logs:

```powershell
docker compose logs -f
```

Follow backend logs:

```powershell
docker compose logs -f backend
```

Stop services while preserving database data:

```powershell
docker compose down
```

Rebuild and start services:

```powershell
docker compose up --build
```

**Warning:** The following command deletes the named database volume and its local data:

```powershell
docker compose down -v
```

Use it only when you are comfortable losing the local database contents.

## Troubleshooting

### Docker is not recognized

Install Docker Desktop, reopen PowerShell, and check:

```powershell
docker --version
docker compose version
```

### Docker is not running

Open Docker Desktop and wait for the engine to finish starting.

### A port is already in use

Check whether another application is using port 5173 or 4000. Stop the conflicting application or adjust the host-side port mapping in `docker-compose.yml`.

### The frontend cannot reach the backend

Check service status and backend logs:

```powershell
docker compose ps
docker compose logs backend
```

Confirm that `http://localhost:4000/health` responds successfully.

### Database initialization or migration fails

Inspect the backend logs:

```powershell
docker compose logs backend
```

Avoid deleting the database volume unless you intend to remove its data.

## Known Limitations

This project is intended for local development and demonstration, not production deployment.

* The frontend uses the Vite development server inside Docker.
* Production deployment would require appropriate secret management, HTTPS, and deployment hardening.
* Rate limiting and a notification/outbox worker are not implemented.
* Search uses database queries rather than a dedicated full-text search index.
* Activity history has no API update/delete route, but database-level immutability is not enforced by a trigger.

## License

No license has been specified for this project.
