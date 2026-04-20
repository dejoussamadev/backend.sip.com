# NestJS API — Senior Engineering Review

---

## Critical — Security

### 1. JWT fallback secret allows token forgery
`src/auth/auth.module.ts:15`
```ts
secret: process.env.JWT_SECRET || 'votre-secret-super-securise-ici',
```
If `JWT_SECRET` is missing in production (misconfigured env, missing secret mount, etc.), the app starts silently using a publicly known fallback. Any attacker who knows the fallback (it's in your repo) can forge valid tokens for any user and any role.

**Fix:** Remove the fallback entirely. Throw at startup if the variable is missing (handled automatically by `@nestjs/config` with a validation schema — see item #9).

---

### 2. JWT expiry hardcoded — environment variable silently ignored
`src/auth/auth.module.ts:15`
```ts
signOptions: { expiresIn: '7d' },
```
`.env.exemple` declares `JWT_EXPIRATION=1d` but it is never read. Changing the env var does nothing.
A 7-day token window with no revocation mechanism (see item #5) is a long exposure window for a leaked token.

**Fix:** Read the value from config: `expiresIn: configService.get('JWT_EXPIRATION')`.

---

### 3. No rate limiting on the login endpoint
There is no `ThrottlerGuard` or any equivalent on the `/auth/login` route.
The endpoint is wide open to credential stuffing and brute-force attacks.

**Fix:**
```bash
npm install @nestjs/throttler
```
Register `ThrottlerModule` in `AppModule` and apply `@Throttle({ default: { limit: 5, ttl: 60000 } })` on the login handler.

---

### 4. CORS hardcoded to `localhost:4200`
`src/main.ts:23`
```ts
origin: ['http://localhost:4200'],
```
In production, every request from the actual frontend domain will be blocked by CORS.
This is not driven by any environment variable.

**Fix:** Read from config:
```ts
origin: configService.get<string>('CORS_ORIGIN').split(','),
```

---

### 5. Logout is a no-op — tokens cannot be revoked
`src/auth/auth.service.ts:105`
```ts
async logout(userId: number, userEmail: string) {
  this.logger.log(`...`);
  return { message: 'Déconnexion réussie', success: true };
}
```
The JWT token is never invalidated. After "logout", the token remains fully valid for the rest of its 7-day lifetime.
A stolen token cannot be revoked.

**Fix options (pick one):**
- **Short-lived access token + refresh token** — 15 min access token, refresh token stored server-side. Revoke by deleting the refresh token.
- **Token blacklist** — Store invalidated JTI (JWT ID) in Redis with TTL matching token expiry.

---

### 6. No global API prefix
`src/main.ts:30`
```ts
// app.setGlobalPrefix('api');
```
Routes like `/auth/login`, `/properties`, `/agents` are served at the root.
This makes reverse-proxy configuration ambiguous and is non-standard for an API that sits alongside a frontend.

**Fix:** Uncomment the line. Update the frontend base URL interceptor accordingly.

---

## High — Security

### 7. File upload MIME validation is bypassable
`src/upload/interceptors/multer-options.factory.ts:22`
```ts
const mime = file.mimetype;
```
`file.mimetype` is the value provided by the HTTP client in the `Content-Type` part of the multipart body. It is **not** verified against the actual file content.
A client can upload `malware.php` with `Content-Type: image/jpeg` and it will pass the filter.

**Fix:** Use the `file-type` npm package to inspect magic bytes after the file is written, or use a streaming approach before writing:
```bash
npm install file-type
```

---

### 8. Uploaded files stored on ephemeral container disk
Files are written to the local filesystem (`uploads/`). In a containerized environment, that directory is destroyed when the container is recreated. There is no volume mount defined for uploads in the compose file.

**Fix for dev:** Add a named volume for `uploads/` in `docker-compose.dev.yml`.
**Fix for production:** Use object storage (AWS S3, MinIO, Cloudflare R2). The `@aws-sdk/client-s3` + a custom `StorageEngine` for Multer is the standard NestJS pattern.

---

### 9. No refresh token — frontend expects one, backend never returns it
`src/auth/auth.service.ts` returns only `access_token`. The Angular frontend's NgRx store and effects have a `refresh_token` field and try to read it from `localStorage`, but it is always `null`/`undefined`.

This is either dead code on the frontend or an unfinished feature. Either way it needs resolution:
- **Implement refresh tokens** (recommended) — issue a short-lived access token and a long-lived refresh token stored in an `HttpOnly` cookie.
- **Or remove all refresh token references** from the frontend if not planned.

---

## High — Code Quality

### 10. No `ConfigModule` — raw `process.env` everywhere
Environment variables are accessed directly via `process.env.X` across the codebase with no validation.
If a required variable is missing, the application starts successfully and fails at runtime (or silently uses a wrong value).

**Fix:** Install and configure `@nestjs/config`:
```bash
npm install @nestjs/config joi
```
```ts
ConfigModule.forRoot({
  isGlobal: true,
  validationSchema: Joi.object({
    DATABASE_URL: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRATION: Joi.string().default('15m'),
    PORT: Joi.number().default(3000),
    CORS_ORIGIN: Joi.string().required(),
  }),
})
```
The app will now refuse to start with a clear error if any required variable is missing.

---

### 11. `req.user as any` loses all type safety
`src/properties/properties.controller.ts:57,58,118`
```ts
const user = req.user as any;
const agentName = user?.name ?? 'Unknown';
const userRole = user?.role as Role | undefined;
```
Using `as any` means TypeScript will not catch property name changes or typos on the JWT payload.

**Fix:** Define a typed payload interface and augment Express's `Request`:
```ts
// src/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  name: string;
}

// src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
```

---

### 12. DTO mutation in `normalizeRules`
`src/properties/properties.service.ts:47`
```ts
private normalizeRules(dto: CreatePropertyDto | UpdatePropertyDto) {
  if (dto.type === PropertyType.LAND) {
    dto.bathrooms = undefined;  // mutating the incoming DTO
    ...
  }
}
```
Mutating the DTO that was validated by the class-validator pipe is a side effect.
It makes the method hard to test in isolation and can produce unexpected behavior if the object is referenced elsewhere.

**Fix:** Return a new plain data object from `normalizeRules` instead of mutating the parameter.

---

### 13. `data: updateData as any` bypasses Prisma type safety
`src/properties/properties.service.ts:362`
```ts
const updated = await this.prisma.property.update({
  where: { id },
  data: updateData,  // typed as `any`
});
```
If a Prisma schema field is renamed, the TypeScript compiler will not catch the stale field name in `updateData`.
Prisma's generated types exist precisely to prevent this class of bug.

**Fix:** Build `updateData` as `Prisma.PropertyUpdateInput` from the start.

---

### 14. Date parsing logic copy-pasted in three methods
The same `expiryDate` coercion block appears identically in `create`, `update`, and `replace`:
```ts
typeof dto.expiryDate === 'string'
  ? new Date(dto.expiryDate)
  : dto.expiryDate instanceof Date
    ? dto.expiryDate
    : new Date(String(dto.expiryDate))
```

**Fix:** One private utility method:
```ts
private toDate(value: string | Date | unknown): Date {
  if (value instanceof Date) return value;
  return new Date(String(value));
}
```

---

### 15. Multi-document upload silently drops all but the first file
`src/properties/properties.service.ts:176` (create) and similar in replace:
```ts
document: dto.documents?.[0] ?? null,
```
The upload interceptor accepts multiple documents. The service silently discards all but the first one.
The Prisma schema also only has `document String?` — a single nullable string.

**Fix:** Align the schema, the service, and the upload config. Either:
- Change the schema to `documents String[]` (and update the service to store all paths), or
- Change the upload interceptor to `maxCount: 1` so the mismatch is explicit.

---

## Medium

### 16. Notification email sending blocks the HTTP response
`src/properties/properties.service.ts:188-196`
```ts
await this.notificationsService.notifyPropertyCreated(...);
await this.notificationsService.sendPropertyCreatedEmail(...);
```
If the SMTP server is slow or unavailable, property creation hangs or fails.
The user's HTTP response should not depend on email delivery.

**Fix:** Use a job queue (BullMQ + Redis) or at minimum fire-and-forget:
```ts
this.notificationsService.sendPropertyCreatedEmail(...).catch(err =>
  this.logger.error('Email notification failed', err)
);
```

---

### 17. `advancedSearch` accepts raw `Record<string, any>` — no validation
`src/properties/properties.controller.ts:66`
```ts
@Post('filter')
async filterProperties(@Body() filters: Record<string, any>) {
```
Any payload can be sent. Prisma will silently ignore unknown fields, but there is no protection against malformed filter values causing runtime errors.

**Fix:** Create a `PropertyFiltersDto` with `class-validator` decorators.

---

### 18. Query parameters for `findAll` require manual string-to-number conversion
```ts
findAll(
  @Query('page') page?: string,
  @Query('limit') limit?: string,
  ...
)
```
All numeric params come in as strings and are manually converted with `Number()` inside the service.
A non-numeric value (`?page=abc`) causes silent `NaN` propagation.

**Fix:** Use a typed `FindPropertiesQueryDto` with `@Type(() => Number)` and `@IsInt()` decorators.

---

### 19. No Swagger / OpenAPI documentation
No `@nestjs/swagger` is configured. The frontend team has no machine-readable API contract.
Route shapes, required fields, and response formats are only discoverable by reading the source.

**Fix:**
```bash
npm install @nestjs/swagger
```
Add `SwaggerModule.setup` in `main.ts` and decorate DTOs with `@ApiProperty`.

---

### 20. Missing database indexes
`prisma/schema/property.prisma` defines indexes for `categoryId`, `typeId`, `layoutId`, `locationId`, `agentId` but not for `landlordId` or `furnishingId`, both of which are used as filters in `findAll` and `advancedSearch`.

**Fix:**
```prisma
@@index([landlordId])
@@index([furnishingId])
```

---

### 21. All relations always eagerly loaded on list endpoints
`findAll` always `include`s `category`, `type`, `layout`, `location`, `agent`, and `landlord`.
On a list of 50 properties this fetches 300+ related records and joins 6 tables on every request.

**Fix:** Use `select` with only the fields actually rendered in the list UI. Reserve the full `include` for `findOne`.

---

### 22. `bedrooms` field does not exist in the Prisma schema
`findAll` in the controller accepts a `@Query('bedrooms')` parameter and the service comments:
```ts
// The current Property model has no bedrooms column yet, so this filter cannot be applied here.
```
The `Property` model in `property.prisma` confirms there is no `bedrooms` field.
This means query params, DTO fields, and controller params exist for a column that does not exist, creating a silent dead filter.

**Fix:** Either add `bedrooms Int` to the schema with a migration, or remove all references to it from the API surface.
