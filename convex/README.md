# Convex setup

Run `npx convex dev`, then seed product documents with the listed SKU data. Configure Clerk JWT authentication in the Convex dashboard before allowing admin reads/writes. Razorpay order creation and webhook signature verification must execute in a server-side HTTP action (or Vercel serverless function), with raw request body validation and an event-id check in `webhookEvents` before calling `markPaid`.
