# 1. Standardizing API Contracts with DTOs

Date: 2026-08-04

## Status

Accepted

## Context

The Catalog layer (`apps/api/src/controllers/product.controller.ts`, `category.controller.ts`) historically returned database entities directly to the client (via Prisma models). Additionally, the shared API Client SDK (`packages/api-client`) stripped away the backend response envelope, including pagination metadata (`meta: { page, limit, total, totalPages }`), implicitly casting backend responses to raw arrays like `Product[]`.

This design presented several problems:
1. **Leaked Internal State**: Database relations, schema details, and internal flags were directly exposed over the API boundary.
2. **Loss of Metadata**: Frontends were unable to utilize the `meta` information for correct pagination, severely limiting the Storefront capabilities.
3. **Tight Coupling**: Any change to the database schema would automatically ripple as a breaking change across all consumers.
4. **No Type Explicitness**: DTOs and models were conflated under identical names (e.g. `Product`), causing ambiguity over what the API actually returned.

## Decision

We have established explicit **Data Transfer Objects (DTOs)** as the boundary layer between the database and API responses. 
1. **Explicit API Contracts**: All types exported by `packages/api-client/src/types.ts` are explicitly named DTOs (e.g., `ProductDto`, `CategoryDto`, `ProductWithOptionsDto`).
2. **Metadata Preservation**: The API SDK now faithfully mirrors the backend using standard `ApiResponse<T>` and `PaginatedApiResponse<T>` envelopes. Clients must manually unwrap `.data` and `.meta`.
3. **Backend Mappers**: Dedicated mapper functions in `apps/api/src/mappers/` map Prisma database results strictly to the outgoing DTOs. Controllers no longer emit raw Prisma models.
4. **In-Memory Category Tree**: The `GET /categories/tree` endpoint fetches all categories in a flat structure and efficiently builds the hierarchy via O(N) hash-map logic to avoid recursive DB queries (N+1).

## Alternatives Considered

- **Continuing with implicit Prisma serialization**: This requires less boilerplate but leaks sensitive/internal properties and makes the API contract unstable across migrations.
- **Using GraphQL**: A robust solution for precise payload delivery, but constitutes a major rewrite of both backend and frontend layers that is out of scope for Phase 6A stabilization.

## Consequences

- **Positive**: Frontends now have explicit types and functional pagination metadata. The backend can refactor database schemas without instantly breaking the Storefront.
- **Negative**: Adds developer boilerplate. Developers must manually write mappers for all future APIs. 
- **Future Implications**: The codebase must continue this practice. Future endpoints (e.g., Auth, Orders, Pricing) must adopt DTO mappers instead of emitting Prisma models. A project-wide consistency audit will log any lingering controllers that still leak models.
