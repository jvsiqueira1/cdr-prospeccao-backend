# ADR 0001 - Server-Side Gamification

**Status:** Proposed
**Date:** 2024-01-01

## Context

The current gamification system allows clients to add arbitrary points via `POST /api/gamificacao/pontos`. This endpoint accepts any value from the request body without validation, enabling users to:

- Add unlimited points to their account
- Send negative values to reduce points
- Bypass the entire gamification system

This design flaw makes the gamification meaningless and vulnerable to fraud.

## Decision

Move all point calculation to the server. Points should be derived from **domain events** rather than client requests:

- Contact registered with lead
- Lead temperature increased (cold to warm, warm to hot)
- Overdue contact resolved
- Lead converted to customer
- Daily mission completed

Create an event ledger model (`GamificationEvent`) to track all point-granting actions with timestamps and metadata.

## Consequences

**Positive:**
- Eliminates gamification fraud
- Enables audit trail of all point changes
- Allows implementing point decay (rank points vs XP)
- Supports anti-spam rules (e.g., max points per day)
- Makes leaderboards trustworthy

**Negative:**
- Requires refactoring existing endpoints to emit events
- More complex server logic
- Need to migrate existing point data

**Implementation Notes:**
- Remove `POST /api/gamificacao/pontos` endpoint
- Add event emission in `POST /api/leads/:id/contato`
- Create `GamificationEvent` model in Prisma schema
- Calculate totals from event ledger
