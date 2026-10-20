# Flovexa setup and login guide

This guide covers the exact setup required to make the customer signup, seller access, admin access, and phone OTP flow work in a real environment.

## 1. Supabase project setup

1. Create a new Supabase project.
2. Open the project dashboard.
3. Go to Authentication → Providers.
4. Enable Email and Phone auth.
5. Make sure the project URL and anon key are copied.
6. Copy the service role key from the project settings.

Important:
- `NEXT_PUBLIC_SUPABASE_URL` is public.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is public.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.

## 2. Turn on phone OTP

Follow these steps in Supabase:

1. Open Authentication → Providers → Phone.
2. Enable Phone auth.
3. Choose the SMS provider.
4. Use Twilio if you want a production-grade SMS flow.
5. Add the provider credentials:
   - Account SID
   - Auth Token
   - Messaging Service SID

If Phone auth is not configured, the signup form will show the runtime error:

- Unsupported phone provider

## 3. Add environment variables

Create a local `.env.local` file based on `.env.example`.

Required values:

- `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- `NEXT_PUBLIC_SUPABASE_URL=<your-project-url>`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`

Optional values for other parts of the app:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `ORDER_FROM_EMAIL`
- `ORDER_LOOKUP_PEPPER`
- `CRON_SECRET`

## 4. Apply Supabase database migrations

Run all SQL files in `supabase/migrations` in filename order.

This is required for:

- customer profiles
- orders
- products
- seller profiles
- admin storefront settings
- return requests
- coupons

## 5. Customer signup and OTP flow

Customer flow should work in this order:

1. User enters full name, mobile number, gender, email, password.
2. User clicks Send OTP.
3. Supabase sends SMS if provider is configured.
4. User enters OTP.
5. OTP is verified.
6. Customer account is created.
7. User is redirected to `/account`.

This is already implemented in:

- [components/signup-form.tsx](components/signup-form.tsx)
- [app/api/account/route.ts](app/api/account/route.ts)

## 6. Create an admin account

Admin access must be assigned on the server side. Do not do this from browser code.

In Supabase Auth user metadata, set:

- `app_metadata.role = "admin"`

You can also use `owner` for the same admin route.

Allowed role values:

- `customer`
- `seller`
- `admin`
- `owner`

The route logic is:

- `admin` or `owner` → `/admin`
- `seller` → `/seller`
- Everyone else → `/account`

## 7. Seller onboarding flow

A seller is not created by public signup. The owner/admin assigns them.

1. Log in to `/admin/login`.
2. Open the Sellers panel.
3. Choose an existing customer account.
4. Assign the seller role.
5. Set the store name.
6. The seller profile is created.

The seller then signs in at `/login` and is redirected to `/seller`.

## 8. Test the real flows

After the phone provider is configured, test these in order:

1. Customer sign up with phone OTP
2. Email confirmation if required
3. Customer login
4. Customer dashboard loads
5. Admin login works
6. Seller onboarding works
7. Seller adds product
8. Customer buys product
9. Admin sees order and customer records

## 9. Production deployment

Before live deployment:

- set all env variables in hosting platform
- configure production domain
- set live Razorpay keys
- configure webhook secrets
- enable HTTPS
- check auth redirect URLs
- confirm all DB migrations are applied

## 10. Final production readiness note

The core app code is already in place and builds successfully.
The real live blocker is the backend provider setup for phone auth. Once Supabase Phone Auth is enabled, the rest of the app can be validated properly and deployed in order.
