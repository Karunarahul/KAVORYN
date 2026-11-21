# KAVORYN — Make Your Walls Speak.

Responsive React + TypeScript storefront for a contemporary Indian poster-printing brand. It includes a catalog, collection filters, configurable variants, persistent browser cart, address capture, route-complete pages, Convex data model, and a deliberate payment-verification boundary.

## Start locally

1. Install Node 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill only the values you have.
3. Run `npx convex dev` in one terminal to provision/update Convex, then `npm run dev` in another.
4. Run `npm run lint` and `npm run build` before deployment.

## Environment variables

| Variable | Usage |
| --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Browser-safe Clerk key |
| `VITE_CONVEX_URL` | Browser-safe Convex deployment URL |
| `VITE_RAZORPAY_KEY_ID` | Browser-safe Razorpay key id |
| `RAZORPAY_KEY_ID` | Server-only Razorpay API key |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only webhook verification secret |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex Clerk JWT configuration |

Never prefix secrets with `VITE_`; Vite exposes those variables to the browser.

## Payment and order safety

The UI does **not** claim a payment is live. Before enabling checkout, add a server HTTP endpoint that: validates all request input; retrieves prices from Convex using product IDs and size; creates the Razorpay order server-side; validates `razorpay_signature` with HMAC SHA-256; and handles the Razorpay webhook from its raw body. Store the provider event ID in `webhookEvents` first; if it is already present, return success without reprocessing. Only the verified webhook may call `markPaid`.

## Admin

Protect `/admin` with Clerk and enforce an admin claim/role in every Convex mutation/query—not merely in the React route. `adminList` demonstrates authenticated access but should be tightened to a role check based on your chosen Clerk organization/metadata model.

## Deployment

1. Push this repository to GitHub and import it into Vercel.
2. Set the browser-safe `VITE_*` variables in Vercel and server secrets only in server/Convex configuration.
3. Add the Vercel URL to Clerk’s allowed origins and configure the Clerk JWT issuer in Convex.
4. Create a Razorpay webhook pointed to the verified server endpoint, subscribe to payment events, and test with Razorpay test mode.
5. Run a test order end-to-end; confirm a redirect alone does not change the order from `pending` to `paid`.

## Artwork placeholders

The collection cards intentionally use clearly graphic, programmatic placeholders instead of pretending to be final artwork. Replace them with original, licensed assets before launch.
