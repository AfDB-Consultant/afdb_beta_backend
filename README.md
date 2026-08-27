# AfDB Beta Backend — Authentication Gateway

> Authentication gateway for the African Development Bank secure access portal. Handles MFA verification, JWT token issuance/refresh, SSO-IDP federation, and fetches authorized user data from the Core platform via secure internal APIs.

## Technology Stack
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (user records) + Redis (sessions/cache)
- **Auth:** JWT (access + refresh tokens), MFA (TOTP), SSO-IDP shared-secret validation
- **Queue:** BullMQ (async jobs)
- **Docs:** Swagger/OpenAPI

## Getting Started

```bash
npm install
npm run dev
```

API runs on [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

## Repository Purpose
This is the **Beta tier backend** — the authentication layer sitting in front of the Core platform:
- MFA verification (TOTP + SMS fallback)
- JWT access token (30min) + refresh token (30 days) lifecycle
- SSO-IDP federation with shared-secret token validation
- Role & permission propagation from MongoDB → Redis
- Secure internal API calls to `afdb_core_backend`

## License
Private — African Development Bank Consultancy Project
