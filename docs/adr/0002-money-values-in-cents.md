# ADR 0002 - Money Values in Cents

**Status:** Proposed
**Date:** 2024-01-01

## Context

We need to add financial volume tracking per lead to enable:

- Estimated deal value
- Actual deal value (when converted)
- Pipeline value reports
- Revenue forecasting

Storing money as floating-point numbers (e.g., `Float` or `Decimal`) causes rounding errors in calculations and aggregations.

## Decision

Store all monetary values as **integers representing cents** (or the smallest currency unit):

```prisma
// In Lead model:
valorEstimadoCents    Int?    // Estimated value in cents
valorInformadoCents   Int?    // Actual value in cents
moeda                 String  @default("BRL")
```

Examples:
- R$ 1.500,00 stored as `150000`
- R$ 99,99 stored as `9999`
- R$ 0,50 stored as `50`

## Consequences

**Positive:**
- No floating-point rounding errors
- Safe arithmetic operations (sum, average)
- Accurate financial reports
- Standard practice in financial systems

**Negative:**
- UI must convert cents to display format
- API consumers must understand the cents convention
- Need documentation for frontend integration

**Implementation Notes:**
- Frontend converts: `(cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`
- Backend validates: cents must be non-negative integer
- Reports aggregate cents, convert only for display
