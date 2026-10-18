# Engineering Decisions

## 1. Application Architecture

The application separates the frontend, backend API, and PostgreSQL database.

The frontend communicates with the backend through HTTP endpoints. The backend is responsible for authentication, authorization, validation, workflow enforcement, and persistence.

This keeps business rules on the server instead of relying on frontend controls.

## 2. Authentication and Team-Based Authorization

The application uses JWT-based authentication.

Users have memberships in teams, and each membership has a role. Authorization is checked against the user's role in the relevant team.

Team membership also limits which work items a user can access.

The frontend may hide unavailable actions, but the backend remains responsible for enforcing permissions.

## 3. Relational Data Model

PostgreSQL stores users, teams, memberships, work items, and activity records.

Prisma provides database access and schema management.

Foreign keys maintain relationships between records. Memberships use a composite key to prevent duplicate membership records for the same user and team.

Indexes support common filtering patterns involving teams, statuses, assignees, and priorities.

## 4. Workflow Enforcement

The backend validates status transitions before updating a work item.

The intended workflow is:

`OPEN → IN_PROGRESS → AWAITING_APPROVAL → RESOLVED → CLOSED`

Approval and rejection require the appropriate Lead or Admin role.

The frontend provides the available actions, but the backend determines whether each transition is permitted.

## 5. Optimistic Concurrency Control

Each work item has a version number.

An update must include the version that the client last retrieved. The backend compares it with the current version and uses a conditional database update.

Successful updates increment the version. If the version is stale, the API returns HTTP `409 Conflict`.

This prevents a client from silently overwriting a newer update.

## 6. Activity History and Transactions

The application records work-item creation and supported updates in an activity history.

For work-item updates, the data change and its corresponding activity events are written within a database transaction.

This reduces the risk of recording an update without its history event, or recording a history event for an update that failed.

The activity history has no API update/delete route. Database-level immutability is not enforced by a trigger.

## 7. Validation and Error Handling

Zod validates incoming request data.

The backend uses HTTP status codes to distinguish common outcomes, including validation errors, authorization failures, missing resources, and stale updates.

This gives API clients a consistent way to handle unsuccessful requests.

## 8. Testing Strategy

The backend test suite uses Vitest and Supertest.

Tests cover health checks, authentication, role restrictions, team access, workflow transitions, stale updates, comments, search, and pagination.

The test suite is run against the application environment initialized by Docker Compose.

## 9. Local Development

Docker Compose provides a repeatable local environment for the frontend, backend, and PostgreSQL database.

Environment-specific configuration is kept outside the source code. The `.env` file is intended for local configuration and should not be committed.

The current setup is intended for development and demonstration rather than production deployment.
