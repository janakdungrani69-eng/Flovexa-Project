# Flovexa login and signup guide

This project does not ship with a hard-coded demo user. Real login accounts are created in Supabase using the configured environment variables and user metadata.

## Routes

- Customer sign up: `/signup`
- Customer and seller sign in: `/login`
- Admin sign in: `/admin/login`
- Customer dashboard: `/account`
- Seller dashboard: `/seller`
- Admin dashboard: `/admin`

## Customer signup

The public signup page collects:

- Full name
- Email
- Password

The form calls `supabase.auth.signUp()` with a redirect to `/auth/callback`.

After signup:

1. User receives a confirmation email.
2. User confirms email.
3. User signs in at `/login`.
4. User is redirected to `/account`.

## Seller onboarding

Seller accounts are created and assigned by the owner/admin:

1. Log in to `/admin/login`.
2. Open the Sellers tab in the admin dashboard.
3. Choose an existing customer account.
4. Set the store name and activate the seller profile.
5. The system assigns the trusted `seller` role.

The seller signs in with the same email and password used for the customer account. Once auth succeeds, the route logic sends them to `/seller`.

## Admin role assignment

The admin or owner role must be set in Supabase `app_metadata.role` on the user record. It is a trusted server-side value and must not be set from browser code.

Allowed values:

- `customer`
- `seller`
- `admin`
- `owner`

The app maps roles as follows:

- `admin` or `owner` => `/admin`
- `seller` => `/seller`
- everything else => `/account`

## Required environment values

Before login works, add these to `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these values the app will show a configuration error and login cannot proceed.

## Important note

Use real credentials in Supabase. Do not use hard-coded passwords in the codebase. The project is designed to create and manage actual users through Supabase Auth, not through fixed demo accounts.
