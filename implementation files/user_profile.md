# Implement User Authentication & Profile Management in SentinelMesh AI

Implement a complete, production-conscious user authentication and profile management system for the existing SentinelMesh AI application.

## Existing Technology Stack
- Frontend: React
- Backend: FastAPI
- Database: Existing MongoDB connection
- Existing application: SentinelMesh AI

## 1. User Registration
Create a registration page with:
- Full name
- Email address
- Password
- Confirm password

Requirements:
- Validate all fields.
- Enforce unique email addresses.
- Hash passwords securely using bcrypt or Argon2.
- Store user records in the existing MongoDB database, in a dedicated `users` collection.
- Never store plaintext passwords.
- Return appropriate validation and duplicate-account errors.

## 2. User Login
Create a login page with:
- Email
- Password
- Login button
- Link to registration

Requirements:
- Verify credentials securely.
- Issue signed JWT access tokens.
- Configure token expiration.
- Use secure authentication handling.
- Return appropriate errors for invalid credentials.

## 3. User Profile
Create a profile page displaying:
- Full name
- Email address
- Profile picture or default avatar
- Account creation date

Allow users to:
- Edit their name.
- Update their profile picture if supported.
- View their account information.
- Log out.

Only authenticated users can access their own profile.

## 4. Frontend Navigation
Integrate a profile icon into the existing SentinelMesh navigation.

Behavior:
- If the user is not authenticated, clicking Profile redirects to `/login`.
- If the user is authenticated, clicking Profile opens `/profile`.
- Login page must provide a Create Account option.
- Registration page must provide an Existing User? Login option.
- After successful login or registration, redirect to the dashboard.
- Show the authenticated user's name or avatar in the navigation.
- Add a logout option.

## 5. Backend API Endpoints

Implement:
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`
- PUT `/api/auth/me`
- POST `/api/auth/logout` if needed by the chosen session architecture.

Use proper Pydantic schemas, validation, error handling and authentication dependencies.

## 6. MongoDB Integration
- Reuse the existing MongoDB connection manager.
- Create a dedicated user repository.
- Create a unique index on normalized email addresses.
- Ensure user records persist after backend restarts.
- Never expose password hashes through API responses.
- Do not create a separate MongoDB connection if the existing connection can be reused.

## 7. Security Requirements
- Secure password hashing.
- JWT signature verification and expiration.
- Protect profile endpoints.
- Validate user identity from the authenticated token, never trust a user ID supplied by the frontend.
- Avoid exposing sensitive information in logs or error responses.
- Configure authentication secrets through environment variables.
- Do not commit secrets or `.env` files.

## 8. Integration Requirements
- Inspect the existing React navigation and FastAPI routing before modifying anything.
- Preserve the current dashboard, incident lifecycle, agent architecture, MongoDB integration and existing functionality.
- Follow existing coding conventions.
- Do not replace existing services or introduce unnecessary architectural changes.
- Ensure authentication works with the deployed frontend/backend configuration.

## 9. Testing
Add tests covering:
- Successful registration.
- Duplicate email registration.
- Invalid email and password validation.
- Successful login.
- Incorrect password.
- Expired or invalid JWT.
- Unauthenticated profile access.
- Authenticated profile retrieval.
- Profile update.
- User data persistence.
- Password hashes never returned in API responses.

Run the complete existing backend test suite and relevant frontend checks.

Do not weaken or delete existing tests to make the new tests pass.

## 10. Final Report
Provide:
- Files created and modified.
- API endpoint documentation.
- MongoDB user document structure.
- Authentication flow explanation.
- Test results.
- Any environment variables required.
- Any deployment configuration changes.

Implement the feature fully rather than providing mock authentication or frontend-only login screens.