# AfDB Beta Backend — Authentication Gateway

> Authentication gateway for the African Development Bank secure access portal. Handles email OTP verification, MFA (TOTP), JWT token issuance/refresh, SSO-IDP federation, professional email delivery, and fetches authorized user data from the Core platform via secure internal APIs.

## Technology Stack
- **Runtime:** Node.js 20 LTS
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** MongoDB (user records) + Redis (OTP storage, sessions/cache)
- **Auth:** JWT (access + refresh tokens), MFA (TOTP), Email OTP (6-digit codes), SSO-IDP shared-secret validation
- **Email:** Nodemailer with professional HTML templates (CID logo embedding)
- **Queue:** BullMQ (async jobs)
- **Docs:** Swagger/OpenAPI (Scalar)

## Getting Started

```bash
npm install
npm run dev
```

API runs on [http://localhost:4000/api/v1](http://localhost:4000/api/v1)

### Prerequisites
- MongoDB running on port 27017 (or 27018)
- Redis running on port 6379
- SMTP credentials configured in `.env`

### Environment Variables (SMTP)

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=no-reply@atradezone.ca
SMTP_PASSWORD=<your-smtp-password>
SMTP_FROM=no-reply@atradezone.ca
```

## Repository Purpose
This is the **Beta tier backend** — the authentication layer sitting in front of the Core platform:
- **Email OTP Verification** — 6-digit codes for login, registration, and password reset (stored in Redis with 10-min TTL)
- **MFA (TOTP)** — Authenticator app-based 2FA with 10 backup codes
- **JWT Lifecycle** — Access token (30min) + refresh token (30 days)
- **SSO-IDP Federation** — OAuth2/OIDC with Google Workspace and Microsoft Azure AD
- **Professional Email Templates** — Branded HTML emails with embedded AfDB logo
- **Role & Permission Propagation** — MongoDB → Redis
- **Secure Internal API Calls** — To `afdb_core_backend`

## Email OTP Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/send-login-otp` | No | Send login OTP (requires `userId`) |
| POST | `/api/v1/auth/verify-login-otp` | No | Verify login OTP → JWT tokens |
| POST | `/api/v1/auth/send-register-otp` | No | Send registration OTP (requires `email`) |
| POST | `/api/v1/auth/verify-register-otp` | No | Verify registration OTP → create account |
| POST | `/api/v1/auth/send-reset-otp` | No | Send password reset OTP (requires `email`) |
| POST | `/api/v1/auth/verify-reset-otp` | No | Verify reset OTP → update password |
| POST | `/api/v1/auth/send-otp` | Yes | Send OTP for 2FA setup (authenticated) |
| POST | `/api/v1/auth/verify-otp` | Yes | Verify 2FA setup OTP |

### OTP Architecture
- **Code Format:** 6-digit numeric (100000–999999)
- **Storage:** Redis with TTL-based auto-expiry
- **Expiry:** 600 seconds (10 minutes)
- **Key Pattern:** `{purpose}_otp:{identifier}` (e.g., `login_otp:userId`, `register_otp:email`)
- **Security:** Single-use (deleted after verification), rate-limited endpoints
- **Email Delivery:** SMTP via Nodemailer with embedded CID logo

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `afdbadmin@yopmail.com` | `Admin@123` |
| **Viewer** | `afdbaviewer@yopmail.com` | `Viewer@123` |
| **Manager** | `afdbmanager@yopmail.com` | `Manager@123` |

> **Getting the OTP:** After login, visit [yopmail.com](https://yopmail.com) and enter the username (e.g., `afdbadmin`) to check the inbox for the 6-digit OTP code.

## License
Private — African Development Bank Consultancy Project
