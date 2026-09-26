# commerce-service-fixture

A small, self-contained commerce backend written in TypeScript. All state lives in memory, so the service has no database, no external services, and no network dependencies.

## Features

- User accounts with salted password hashes and unique emails
- Expiring session tokens
- Password reset flows with expiring one-time tokens
- Carts with line items and exact totals
- Orders built from carts, with payment capture and refunds
- Notifications for order, payment, and security events
- Deterministic, resettable in-memory state

## Quick start

```bash
pnpm install
pnpm test
pnpm typecheck
```

## Scripts

- `pnpm test` — run the test suite with Vitest
- `pnpm typecheck` — type-check the project with `tsc --noEmit`

## Structure

```
src/
  index.ts         entry point; re-exports the public API and resetState()
  users.ts         user accounts, authentication, password resets
  sessions.ts      expiring session tokens
  cart.ts          line items and cart totals
  payments.ts      payments and refunds
  orders.ts        checkout, shipping, cancellation, refunds
  notifications.ts user-facing notifications
  fixtures.ts      product catalog and deterministic seed state
tests/
  users.test.ts
  sessions.test.ts
  cart.test.ts
  payments.test.ts
  orders.test.ts
```

## Module relationships

- `users` is the identity root. `sessions` and `payments` validate users, and `orders` places them on orders.
- `cart` snapshots the product name and unit price from the `fixtures` catalog when a line item is added.
- `orders` orchestrates checkout: it reads the cart, captures a payment, clears the cart, and emits order and payment notifications.
- `payments` supports refunds, which `orders` triggers on cancellation.
- `users` emits a security notification when a password is reset.
- `fixtures` provides the product catalog and a seeded demo user. `resetState()` restores every module to a known state.

## State and reset

All state is held in module-level in-memory stores. Call `resetState()` (imported from `src/index`) between scenarios to restore a clean, deterministic state. The reset also reseeds the demo user `alice@example.com`.

## Conventions

- Prices are integer minor units (e.g. cents), so totals are always exact.
- Identifiers are generated per entity; tests never assume them and assert against returned values instead.
- The clocks used for token and session expiry can be controlled explicitly in tests via `setUsersNow` and `setSessionsNow`, keeping expiry tests deterministic.