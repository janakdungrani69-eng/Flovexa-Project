# Flovexa Perfumes

Flovexa is a Next.js storefront with a Supabase-backed catalogue and order store, Razorpay checkout, order lookup, email notifications, and a protected operations dashboard. The original supplied HTML reference is kept at `legacy/static-storefront.html`.

## Run locally

1. Install Node.js 20.9 or newer and pnpm.
2. Run `pnpm install` and copy `.env.example` to `.env.local`.
3. Create a Supabase project and run every file in `supabase/migrations` in filename order in its SQL editor. The migrations create the catalogue/orders, product-photo bucket, and customer account tables.
4. Fill in the Supabase URL, publishable key, and server-only service role key in `.env.local`. Never expose the service role key with a `NEXT_PUBLIC_` prefix or commit `.env.local`.
5. Add real products, accurate prices, photos, and stock to the `products` table. Leave `active` false until each listing is ready.
6. Configure a Razorpay test account and webhook URL at `https://YOUR_DOMAIN/api/payments/webhook`. Subscribe to `payment.captured`, `order.paid`, and `payment.failed`; use the same webhook secret in the server environment.
7. Set shipping and tax values only after the business confirms its delivery rates and tax treatment. Amounts ending in `_PAISE` are integer paise (for example, ₹100 is `10000`); `GST_RATE_BPS=1800` means 18%. `TAX_MODE` accepts `none`, `inclusive`, or `exclusive`.
8. Configure Resend with a verified sending domain and set `RESEND_API_KEY` and `ORDER_FROM_EMAIL`. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS URL and create a long random `ORDER_LOOKUP_PEPPER`.
9. Create the store owner's Supabase Auth user, then set `app_metadata.role` to `admin` using a trusted server-side admin process or Supabase dashboard. The role must not be set from browser code.
10. Start with `pnpm dev`. Before launch run `pnpm typecheck`, `pnpm lint`, and `pnpm build`.

## Add a perfume as a seller

Sign in at `/admin/login` with the authorized store account, then open **Products → Add a perfume**. Enter its name, collection, selling price, optional regular price, size, concentration, stock, scent notes, and description. The product link is generated from the name and can be edited. Upload a JPG, PNG, or WebP photo (up to 5 MB) for an instant preview, or paste an image link. Save it as a draft or mark it visible to publish it in the storefront. The photo upload uses the `product-images` bucket created by the second migration.

## Production launch

- Deploy the project to Vercel (or another Next.js host) and set every required variable from `.env.example` in the hosting environment.
- Configure Razorpay **live** keys and a live webhook only after the business account is approved and the public product, support, shipping, return, privacy, and terms information has been reviewed. Production checkout rejects test keys and stays disabled without a real database catalogue and complete server configuration.
- Confirm the applicable GST setup, invoice requirements, shipping areas/rates, cancellation and return/refund conditions, customer support contact, and legal business identity with the business owner and qualified advisers. The policy pages intentionally say they are being prepared until the owner supplies approved terms.
- Place test orders in Razorpay test mode and verify success, failure, dismissal, webhook retries, stock restoration, email delivery, order lookup, and admin fulfilment before switching to live keys.
- Back up the database and monitor failed webhooks, `payment_review` orders, and email delivery. A captured payment on an expired reservation is marked for manual review rather than silently treated as a normal paid order.

## Payment and inventory behavior

Flovexa accepts prepaid orders through Razorpay; cash on delivery (COD) is intentionally not offered. Fulfilment requires a captured online payment. The browser submits product IDs and quantities only. A transactional Supabase function reserves stock and calculates the price from the catalogue before the server creates a Razorpay order. The server validates Razorpay's signature and fetches the payment before marking an order captured. Webhooks are signature-checked and de-duplicated. Keep database migrations and all credentials under the store owner's control.

## Account roles and routes

- `/login` is the shared sign-in page. After authentication, a trusted Supabase `app_metadata.role` routes `admin`/`owner` to `/admin`, `seller` to `/seller`, and all ordinary customer accounts to `/account`.
- `/signup` creates customer accounts only. Customer-supplied user metadata cannot grant admin or seller access.
- Admin pages and product/order admin APIs check the trusted app-metadata role server-side. Typing `/admin` directly does not grant access.
- Seller role routing is established, but Flovexa is currently a single-owner shop: seller-specific product ownership, order assignment, and payout settlements are not active. Do not grant seller access for marketplace operations until those workflows are built and verified.
- Customer order history is matched to the email on the signed-in account. Supabase email confirmation should be enabled before launch.
- `/account` includes order tracking, saved perfumes, profile and saved delivery addresses. A signed-in customer’s default address is prefilled at checkout. Return requests are reviewed by an administrator in the **Returns** tab; approving a request does not automatically issue a Razorpay refund.

Orders hold inventory for 20 minutes. A cancelled/expired reservation is restored when a later checkout asks the database to release expired reservations. For busy production stores, add a secured scheduled job for timely cleanup and alerting; ensure the hosting plan supports the chosen schedule frequency.
