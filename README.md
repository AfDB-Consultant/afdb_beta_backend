<div align="center">

# AfDB Beta Backend — Authentication Gateway

### Live Reference Application — Consultancy Proposal Support

<br/>

| | |
|---|---|
| **Prepared By** | [Eng. Depute N.Alphonse, PMP®](https://atradezone.ca/deputenalphonse) |
| **Role** | Senior Web Frontend Developer Consultant (TCIS) |
| **Live API** | [afdb-api.atradezone.ca](https://afdb-api.atradezone.ca) |
| **API Docs** | [afdb-api.atradezone.ca/api-docs](https://afdb-api.atradezone.ca/api-docs) |
| **GitHub Org** | [github.com/AfDB-Consultant](https://github.com/AfDB-Consultant) |

</div>

---

## About This Application

> Words on a page can say a lot. Code says more.

This is a **live reference application** built to demonstrate the exact patterns described in the consultancy proposal for **Senior Web Frontend Developer Consultant (TCIS)** at the African Development Bank.

### What This Repo Does

This is the **Beta Tier Backend** — the authentication gateway sitting in front of the Core platform:

- **Email OTP Verification** — 6-digit codes for login, registration, and password reset (stored in Redis with 10-min TTL)
- **MFA (TOTP)** — Authenticator app-based 2FA with 10 backup codes
- **JWT Lifecycle** — Access token (30min) + refresh token (30 days)
- **SSO-IDP Federation** — OAuth2/OIDC with Google Workspace and Microsoft Azure AD
- **Professional Email Templates** — Branded HTML emails with embedded AfDB logo
- **OWASP Top 10 Compliance** — Input sanitization, rate limiting, security headers
- **Secure Internal API Calls** — To `afdb_core_backend` via authenticated internal APIs

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 20 LTS |
| **Framework** | Express.js |
| **Language** | TypeScript |
| **Database** | MongoDB Atlas (user records) + Redis 7 (OTP storage, sessions/cache) |
| **Auth** | JWT (access + refresh tokens), MFA (TOTP), Email OTP, SSO-IDP |
| **Email** | Nodemailer with professional HTML templates (CID logo embedding) |
| **Queue** | BullMQ (async jobs) |
| **Docs** | Swagger/OpenAPI (Scalar) |
| **CI/CD** | GitHub Actions → Docker Hub → AWS EC2 |

## Live URLs

| Service | URL |
|---------|-----|
| **Auth API** | [https://afdb-api.atradezone.ca](https://afdb-api.atradezone.ca) |
| **API Documentation** | [https://afdb-api.atradezone.ca/api-docs](https://afdb-api.atradezone.ca/api-docs) |
| **Health Check** | [https://afdb-api.atradezone.ca/health](https://afdb-api.atradezone.ca/health) |

## Getting Started

```bash
npm install
npm run dev
```

API runs on [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

### Prerequisites
- MongoDB Atlas or local MongoDB on port 27017
- Redis running on port 6379
- SMTP credentials configured in `.env`

## Email OTP Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/send-login-otp` | No | Send login OTP |
| POST | `/api/v1/auth/verify-login-otp` | No | Verify login OTP → JWT tokens |
| POST | `/api/v1/auth/send-register-otp` | No | Send registration OTP |
| POST | `/api/v1/auth/verify-register-otp` | No | Verify registration OTP → create account |
| POST | `/api/v1/auth/send-reset-otp` | No | Send password reset OTP |
| POST | `/api/v1/auth/verify-reset-otp` | No | Verify reset OTP → update password |

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `afdbadmin@yopmail.com` | `Admin@123` |
| **Viewer** | `afdbaviewer@yopmail.com` | `Viewer@123` |
| **Manager** | `afdbmanager@yopmail.com` | `Manager@123` |

> **Getting the OTP:** After login, visit [yopmail.com](https://yopmail.com) and enter the username (e.g., `afdbadmin`) to check the inbox for the 6-digit OTP code.

## Related Repositories

| Repository | Role | Live URL |
|-----------|------|----------|
| [`afdb_beta_frontend`](https://github.com/AfDB-Consultant/afdb_beta_frontend) | Auth Portal UI | [afdb-beta.atradezone.ca](https://afdb-beta.atradezone.ca) |
| [`afdb_core_frontend`](https://github.com/AfDB-Consultant/afdb_core_frontend) | Enterprise Dashboard UI | [afdb-core.atradezone.ca](https://afdb-core.atradezone.ca) |
| [`afdb_core_backend`](https://github.com/AfDB-Consultant/afdb_core_backend) | Data Engine APIs | [afdb-core-api.atradezone.ca](https://afdb-core-api.atradezone.ca) |

## Contact

**Eng. Depute N.Alphonse, PMP®** — [depute@atradezone.ca](mailto:depute@atradezone.ca) — [Portfolio](https://atradezone.ca/deputenalphonse)

---

<div align="center">*© 2026 Eng. Depute N.Alphonse, PMP®. Open-source reference application.*</div>
