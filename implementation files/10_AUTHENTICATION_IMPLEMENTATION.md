SentinelMesh AI — Login & Authentication Implementation Guide
Module: Authentication and Authorization
Stack: FastAPI, Pydantic, MongoDB, React + TypeScript
Status: Optional module. Implement after the core incident-recovery workflow is working.
1. Goal and scope
Add account registration and login so team members can securely access the SentinelMesh AI dashboard.

This guide covers:
- Email/password registration and login.
- Secure password hashing.
- JWT access-token authentication.
- Protected backend routes.
- Basic role-based permissions.
- Frontend login, registration, and logout.
- Tests and integration.
For the first version, do not add Google OAuth, email OTP, password-reset email delivery, or organization management. Those add complexity and are not required for a hackathon MVP.

Priority note: Authentication is optional and lower priority than completing the core flow: detect incident → investigate → propose patch → human approval → sandbox application → independent verification.
2. Roles
Role	Permissions
admin	View incidents, manage users, approve/reject patches, view audit logs
member	View and submit incidents, run analysis, view verification reports


Public registration must always create a member. Never accept an admin role from a registration request. Only an authorized admin may change roles.

Agree on the exact permissions with the team before protecting existing routes.
3. Architecture
React frontend
  |
  | Register / Login
  | Authorization: Bearer <access_token>
  v
FastAPI auth router
  |
  +-- Validate input
  +-- Verify password hash
  +-- Create / validate JWT
  +-- Resolve current user and role
  |
  v
MongoDB users collection
  |
  v
Protected incident and admin APIs
Reuse the existing FastAPI app, settings, MongoDB connection, API client, and UI design. Do not create a second backend or database connection.
4. Dependencies
Check the current requirements first and add only missing packages:
python-jose[cryptography]
pwdlib[argon2]
pydantic[email]
Use Argon2 password hashing through pwdlib. Never store plain-text passwords or reversible encrypted passwords.
5. Environment variables
Add to the backend .env:
JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
Add placeholders—not real secrets—to .env.example.

Generate a strong secret locally:
python -c "import secrets; print(secrets.token_urlsafe(48))"
Keep .env out of Git. Never commit JWT secrets, passwords, database credentials, or API keys.
6. Suggested file structure
Adapt to the existing repository; do not duplicate equivalent modules.
backend/app/
  core/
    config.py
    security.py
  models/
    user.py
  schemas/
    auth.py
  repositories/
    user_repository.py
  services/
    auth_service.py
  api/
    dependencies/
      auth.py
    routes/
      auth.py
7. MongoDB user document
Create a users collection. Example:
{
  "_id": "MongoDB ObjectId",
  "name": "Demo Member",
  "email": "member@example.com",
  "password_hash": "Argon2 hash",
  "role": "member",
  "is_active": true,
  "created_at": "UTC datetime",
  "updated_at": "UTC datetime"
}
Requirements:
- Trim and lowercase email addresses before storing or searching.
- Create a unique index on email.
- Store only a password hash; never store the original password.
- Never return password_hash in an API response.
- Use UTC timestamps.
- Return 409 Conflict for duplicate email.
- Public registration always assigns member.
8. API contract
Use the existing /api prefix if that is already the backend convention.
8.1 Register
POST /api/auth/register

Request:
{
  "name": "Demo Member",
  "email": "member@example.com",
  "password": "a-strong-password"
}
Success: 201 Created
{
  "id": "user_id",
  "name": "Demo Member",
  "email": "member@example.com",
  "role": "member"
}
Validate non-empty name, valid email, and a sensible minimum password length (for example, 12 characters). Reject duplicate email. Do not accept a role field from the public request.
8.2 Login
POST /api/auth/login

Request:
{
  "email": "member@example.com",
  "password": "a-strong-password"
}
Success: 200 OK
{
  "access_token": "signed-jwt",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": {
    "id": "user_id",
    "name": "Demo Member",
    "email": "member@example.com",
    "role": "member"
  }
}
Use the same generic 401 Unauthorized message for an unknown email and an incorrect password, such as Invalid email or password.
8.3 Current user
GET /api/auth/me

Header:
Authorization: Bearer <access_token>
Return the safe user profile (id, name, email, role). Return 401 if the token is missing, invalid, expired, or belongs to an inactive/nonexistent user.
8.4 Logout
POST /api/auth/logout

For a simple stateless access-token MVP, logout clears the token on the frontend. The API can return:
{
  "message": "Logged out"
}
Be accurate: clearing a stateless JWT in the browser does not revoke a token that has already been copied. If immediate server-side revocation is required, implement a token denylist or refresh-token session store and test it. Do not claim revocation unless it exists.
8.5 Optional admin endpoints
Only add these if the project needs user management:
- GET /api/admin/users
- PATCH /api/admin/users/{user_id}/role
- PATCH /api/admin/users/{user_id}/status
All must require an authenticated admin. Prevent accidental removal/deactivation of the last active admin.
9. Backend implementation
Password and token helpers
Implement reusable functions to:
- Hash passwords with Argon2.
- Verify a submitted password against its stored hash.
- Create a signed JWT containing a user ID in sub and an expiry in exp.
- Decode and validate the JWT signature and expiry.
Keep token claims minimal. Use the immutable user ID as sub. Do not trust a role supplied by the browser. Resolve the current role from MongoDB for authorization so role changes take effect without waiting for an old token to expire.
Authentication dependency
Create a FastAPI dependency such as get_current_user that:
1. Reads the bearer token.
2. Validates its signature and expiry.
3. Extracts the user ID from sub.
4. Loads the user from MongoDB.
5. Rejects missing or inactive users.
6. Returns a safe user object without the password hash.
Create require_admin for admin-only endpoints.
Protect existing routes
Suggested starting policy:
Route	Access
GET /health	Public
POST /api/auth/register	Public
POST /api/auth/login	Public
GET /api/auth/me	Authenticated
Incident list/detail	Authenticated
Create incident	Authenticated
Run agent analysis	Authenticated
Approve/reject patch	Authenticated; consider admin-only for the demo
View audit logs	Admin
User management	Admin


Confirm this policy with the team. Do not leave sensitive endpoints public by accident.
Audit events
If the existing audit-log module is available, record successful/failed login, registration, logout request, role change, and account deactivation. Never log passwords, JWT secrets, or full bearer tokens.
10. Frontend implementation
Preserve the existing Stitch-based visual design. Add login and registration pages using the same colors, typography, spacing, and responsive behavior.

Suggested routes:
- /login
- /register
Suggested modules (adapt to existing structure):
frontend/src/
  pages/
    LoginPage.tsx
    RegisterPage.tsx
  components/
    ProtectedRoute.tsx
  context/
    AuthContext.tsx
  services/
    authService.ts
  types/
    auth.ts
Login page
Include email, password, show/hide password, login button, loading state, validation, readable errors, and a link to registration. Do not add fake social-login buttons.
Registration page
Include name, email, password, confirm password, registration button, loading state, validation, and a link to login. Confirm-password validation can happen on the frontend; the backend must validate the actual password.
Shared auth state
Use the existing state-management approach if one already exists. Otherwise create an auth context exposing:
- user
- isAuthenticated
- isLoading
- login()
- register()
- logout()
On app startup, validate an available session through /api/auth/me. If rejected, clear the session and show login.
Token storage decision
For a production-oriented browser app, prefer a short-lived access token held in memory and a refresh token stored in a Secure, HttpOnly, appropriately SameSite cookie, with CSRF protection where needed.

For a quick hackathon prototype, the team may choose a simpler short-lived access-token approach, but document its limitations. localStorage is readable by JavaScript and can expose tokens if an XSS vulnerability exists; do not describe long-lived tokens in localStorage as production-secure.
Protected routes
- Redirect unauthenticated users to /login.
- After successful login, navigate to the dashboard.
- Redirect authenticated users away from /login to the dashboard.
- Show a loading state while checking the session; do not briefly reveal protected pages.
- Hide admin-only UI from members, but always enforce permissions on the backend too.
Use the existing Axios instance if available. Attach the bearer token through the existing API client. Handle 401 consistently without creating redirect loops on login/register endpoints.
11. Security checklist
- [ ] Argon2 password hashing; no plain-text passwords.
- [ ] Unique MongoDB email index.
- [ ] Strong JWT secret kept outside source control.
- [ ] Short token expiry.
- [ ] JWT signature, expiry, and subject validation.
- [ ] Active-user check on protected requests.
- [ ] Backend role enforcement; never trust frontend role state.
- [ ] Public registration cannot create admins.
- [ ] No passwords or tokens in logs.
- [ ] CORS restricted to the intended frontend origin in deployment.
- [ ] HTTPS outside local development.
- [ ] Generic login failure message.
- [ ] Rate limiting on login before public deployment.
- [ ] CSRF protections for cookie-based refresh flows.
12. Testing requirements
Use pytest and the project's existing test setup. Use an isolated test database/collection.

Backend tests:
1. Valid registration succeeds.
2. Invalid email is rejected.
3. Too-short password is rejected.
4. Duplicate email is rejected.
5. Stored password is a hash, not the original.
6. Public registration creates member, even if a role is submitted.
7. Correct login succeeds.
8. Incorrect password fails.
9. Unknown email returns the same generic login error.
10. /api/auth/me works with a valid token.
11. Missing, invalid, and expired tokens are rejected.
12. Inactive users cannot access protected APIs.
13. Members cannot access admin endpoints.
14. Admins can access admin endpoints.
Frontend checks:
- Login and registration validation works.
- Loading and error states display correctly.
- Logged-out users cannot view protected pages.
- Session expiry is handled correctly.
- Logout clears the client session.
- Admin controls are hidden from members.
13. Implementation order
1. Inspect the repository and read the master, backend, database, and frontend guides.
2. Confirm existing API prefix, settings module, MongoDB connection, and error format.
3. Add auth settings and password/JWT helpers.
4. Add user schema, repository, and unique email index.
5. Implement register, login, /me, and logout.
6. Add current-user and admin dependencies.
7. Protect the agreed existing backend routes.
8. Add and run backend tests.
9. Add login and registration pages while preserving the existing design.
10. Add shared auth state and protected routing.
11. Test the complete browser-to-API flow.
12. Document local setup and any demo account safely.
Do not put real credentials in documentation or Git.
14. Definition of done
Authentication is complete only when:
- Users can register and log in.
- Passwords are securely hashed.
- Protected APIs reject missing/invalid/expired tokens.
- Backend permissions are enforced.
- Frontend login, logout, loading, and expired-session behavior work.
- Automated tests cover success and rejection cases.
- The existing incident workflow still works for authenticated users.
- No secrets or passwords are committed or logged.
15. Antigravity implementation prompt
Read AUTHENTICATION_IMPLEMENTATION.md completely. Inspect the existing SentinelMesh AI repository and the current backend, database, and frontend guides before changing code. Implement only the authentication module described here. Reuse the existing FastAPI app, MongoDB connection, settings, API client, UI design, and shared types. Do not recreate the frontend or rewrite working modules. Do not add Google OAuth or other out-of-scope features. Never store plain-text passwords or commit secrets. Public registration must not create admin accounts. Enforce authorization on the backend, not only by hiding frontend controls. Add and run tests. At the end, report files created/modified, endpoints implemented, tests and results, security decisions, and incomplete work. Do not claim a feature is complete unless it is implemented and tested.

Integration note: This is an additional guide. It does not replace 02_BACKEND_IMPLEMENTATION.md, 03_DATABASE_IMPLEMENTATION.md, or 07_FRONTEND_IMPLEMENTATION.md. Coordinate the user model and API contract with those teammates before implementation.