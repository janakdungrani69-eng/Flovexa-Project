# Flovexa Parfums

Flovexa is a Next.js storefront with a Supabase-backed catalogue and order store, Razorpay checkout, order lookup, email notifications, and a protected operations dashboard. The original supplied HTML reference is kept at `legacy/static-storefront.html`.

## Run locally

1. Install Node.js 20.9 or newer and pnpm.
2. Run `pnpm install` and copy `.env.example` to `.env.local`.
3. Create a Supabase project and run `supabase/migrations/202609260001_initial_store.sql` in its SQL editor.
4. Fill in the Supabase URL, publishable key, and server-only service role key in `.env.local`. Never expose the service role key with a `NEXT_PUBLIC_` prefix or commit `.env.local`.
5. Add real products, accurate prices, photos, and stock to the `products` table. Leave `active` false until each listing is ready.
6. Configure a Razorpay test account and webhook URL at `https://YOUR_DOMAIN/api/payments/webhook`. Subscribe to `payment.captured`, `order.paid`, and `payment.failed`; use the same webhook secret in the server environment.
7. Set shipping and tax values only after the business confirms its delivery rates and tax treatment. Amounts ending in `_PAISE` are integer paise (for example, ₹100 is `10000`); `GST_RATE_BPS=1800` means 18%. `TAX_MODE` accepts `none`, `inclusive`, or `exclusive`.
8. Configure Resend with a verified sending domain and set `RESEND_API_KEY` and `ORDER_FROM_EMAIL`. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL and create a long random `ORDER_LOOKUP_PEPPER`.
9. Create the store owner's Supabase Auth user, then set `app_metadata.role` to `admin` using a trusted server-side admin process or Supabase dashboard. The role must not be set from browser code.
10. Start with `pnpm dev`. Before launch run `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

## Production launch

- Deploy the project to Vercel (or another Next.js host) and set every required variable from `.env.example` in the hosting environment.
- Configure Razorpay **live** keys and a live webhook only after the business account is approved and the public product, support, shipping, return, privacy, and terms information has been reviewed. Production checkout rejects test keys and stays disabled without a real database catalogue and complete server configuration.
- Confirm the applicable GST setup, invoice requirements, shipping areas/rates, cancellation and return/refund conditions, customer support contact, and legal business identity with the business owner and qualified advisers. The policy pages intentionally say they are being prepared until the owner supplies approved terms.
- Place test orders in Razorpay test mode and verify success, failure, dismissal, webhook retries, stock restoration, email delivery, order lookup, and admin fulfilment before switching to live keys.
- Back up the database and monitor failed webhooks, `payment_review` orders, and email delivery. A captured payment on an expired reservation is marked for manual review rather than silently treated as a normal paid order.

## Payment and inventory behavior

The browser submits product IDs and quantities only. A transactional Supabase function reserves stock and calculates the price from the catalogue before the server creates a Razorpay order. The server validates Razorpay's signature and fetches the payment before marking an order captured. Webhooks are signature-checked and de-duplicated. Keep database migrations and all credentials under the store owner's control.

Orders hold inventory for 20 minutes. A cancelled/expired reservation is restored when a later checkout asks the database to release expired reservations. For busy production stores, add a secured scheduled job for timely cleanup and alerting; ensure the hosting plan supports the chosen schedule frequency.
