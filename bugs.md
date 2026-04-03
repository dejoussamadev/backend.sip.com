SIP Backend - Audit & Optimization Plan

Context

Full codebase audit of the NestJS backend to identify bad practices, bugs, security issues, and
optimization opportunities. Findings are ordered from critical to low severity.

 ---
CRITICAL

1. [ ] Exposed Secrets in .env (committed to git)

- File: .env
- JWT_SECRET, PEXELS_API_KEY, POSTGRES_PASSWORD are all committed to the repository in plaintext
- .env and .env.exemple contain identical real credentials
- Fix: Rotate all secrets immediately, remove .env from git history (git filter-branch or BFG), add
  .env to .gitignore, use .env.local for real values

2. [x] Hardcoded JWT Secret Fallback

- Files: src/auth/auth.module.ts:22, src/auth/strategies/jwt.strategy.ts:12
- Both files fall back to 'votre-secret-super-securise-ici' if JWT_SECRET env var is missing
- Fix: Throw an error if JWT_SECRET is not set instead of using a fallback

3. [x] Upload Endpoints Have NO Authentication

- File: src/upload/upload.controller.ts
- POST /upload/image, POST /upload/images, POST /upload/fields - zero guards
- Anyone (unauthenticated) can upload files to the server
- Fix: Add @UseGuards(JwtAuthGuard, RolesGuard) and @Roles(Role.ADMIN, Role.AGENT) at controller
  level

4. [ ] Missing @Roles() Decorators on Protected Routes

- File: src/properties/properties.controller.ts
- GET /properties, GET /properties/:id, POST /properties/filter have JwtAuthGuard + RolesGuard but no
  @Roles() decorator
- RolesGuard returns true when no roles are set (if (!requiredRoles || requiredRoles.length === 0)
  return true), meaning these endpoints are open to any authenticated user by accident rather than by
  design
- Fix: Add explicit @Roles() to every route or document the intent

 ---
HIGH

5. [ ] No Rate Limiting on Login

- File: src/auth/auth.controller.ts
- POST /auth/login has no throttling - vulnerable to brute force
- Fix: Add @nestjs/throttler with strict limits on auth endpoints

6. [ ] Missing Environment Variable Validation

- process.env.* is used without validation across auth, email, and main.ts
- Fix: Use @nestjs/config with Joi schema validation to fail fast on missing vars

7. [x] Logic Bug in furnishings.service.ts

- File: src/furnishings/furnishings.service.ts - findFurnishingByCategories()
- Queries where: { categoryId: id } but should be where: { furnishingId: id } based on method
  name/intent
- Fix: Correct the query field

8. [ ] bedrooms Filter Accepted but Silently Ignored

- File: src/properties/properties.service.ts:259
- Comment says "The current Property model has no bedrooms column yet" but the parameter is still
  accepted in the DTO and filter endpoint
- Fix: Either add the column to the model or remove the parameter from the DTO/filters

9. [x] No Max Limit on Pagination

- Files: src/properties/properties.service.ts:218,526 and 12+ other services
- User-provided limit/take is used directly with no cap - a client can request limit=999999
- Fix: Enforce Math.min(limit, 100) in all paginated queries

 ---
MEDIUM

10. [ ] Duplicate Filter Endpoints (Properties)

- GET /properties and POST /properties/filter do overlapping work with inconsistent interfaces:
    - GET uses page/limit, minPrice/maxPrice, category/type names
    - POST uses skip/take, minAmount/maxAmount, category/type IDs, plus keyword search
- Fix: Unify into a single GET /properties endpoint with comprehensive query params, or keep POST but
  deprecate GET's filter params and redirect

11. [ ] Missing Relation Includes in Queries

- findAll() and advancedSearch() don't include furnishing, facilities, utilities relations
- Filtering by facility works, but the response doesn't include the matched facility data
- Fix: Add missing includes or use select for performance

12. [ ] CORS Hardcoded for localhost

- File: src/main.ts:22-26
- origin: ['http://localhost:4200'] - will break in production
- Fix: Use process.env.CORS_ORIGIN

13. [ ] Missing Database Indexes

- File: prisma/schema/property.prisma - missing indexes on furnishingId, landlordId, composite
  (status, expirationDate)
- File: prisma/schema/user.prisma - no index on email, agentCode
- File: prisma/schema/landlord.prisma - no index on email
- Fix: Add @@index directives

14. [ ] Missing CASCADE DELETE Strategy on Property Relations

- Property FK to User, Landlord, Category, Type, Layout, Location, Furnishing have NO onDelete
  defined
- Deleting a User/Landlord leaves orphaned properties
- Join tables (CategoryFurnishing, CategoryType, TypeLayout) also lack cascade
- Fix: Define onDelete: Cascade, SetNull, or Restrict per relation

15. [ ] Float Used for Financial Fields

- File: prisma/schema/property.prisma - range and commission use Float
- Floating point causes precision errors for money
- Fix: Use Decimal @db.Decimal(15, 2)

16. [ ] Default expiryDate Set to new Date()

- File: src/properties/properties.service.ts:169
- When no expiry date is provided, it defaults to the current moment (already expired)
- Fix: Default to null or a sensible future date

17. [ ] console.log in Production Code

- File: src/landlords/landlords.controller.ts:287-299
- Three console.log() calls in catch blocks instead of using NestJS Logger
- Errors are silently swallowed
- Fix: Replace with this.logger.error() and re-throw if appropriate

18. [ ] Massive Code Duplication - Pagination Logic

- 12+ services repeat identical pagination boilerplate (skip/take/count/meta)
- Fix: Extract to a shared PaginationService or utility function

19. [ ] Missing @IsNotEmpty() on Master Data DTOs

- Create DTOs for categories, types, layouts, locations, facilities, utilities only have @IsString()
  on name
- Empty string "" passes validation
- Fix: Add @IsNotEmpty() and @MinLength() constraints

 ---
LOW

20. [ ] Unused DTOs

- src/agents/dto/change-password.dto.ts, create-admin.dto.ts, update-profile.dto.ts - defined but
  never used in any controller
- Fix: Remove or implement the endpoints

21. [ ] Inconsistent Pagination Parameter Names

- Some services use Number(limit), others use parseInt(limit, 10)
- GET uses page/limit, POST uses skip/take
- Fix: Standardize across all services

22. [ ] Boolean String Conversion Done Manually

- File: src/properties/properties.service.ts:490
- filters.maidRoom === true || filters.maidRoom === 'true' || filters.maidRoom === '1'
- Fix: Use @Transform() decorator or a custom pipe

23. [ ] No Soft Delete / Audit Trail

- No deletedAt timestamps, no createdById/updatedById tracking
- Property has TRASH/ARCHIVED status as manual soft delete but no standard implementation
- Fix: Design decision - consider adding audit columns

24. [ ] Seed Data Uses as any Type Assertions

- File: prisma/seed.ts:269
- Bypasses TypeScript checks, hides potential schema mismatches
- Fix: Fix the types properly

25. [ ] Missing getLandlords() / getAgents() Controller Endpoints

- Methods exist in properties.service.ts but are never exposed via controller routes
- Fix: Either expose them or remove the dead code

 ---
Verification

After fixes are applied:
1. npm run lint - ensure no lint errors
2. npm run build - ensure compilation succeeds
3. npx prisma generate - verify schema changes
4. npx prisma migrate dev - apply any new indexes/cascades
5. npm test - run existing tests
6. Manual test: try uploading without auth token (should now fail)
7. Manual test: try login brute force (should be rate limited)
8. Manual test: verify properties filter endpoint works with unified params
