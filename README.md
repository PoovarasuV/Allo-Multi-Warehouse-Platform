Allo Multi-Warehouse Platform
A distributed inventory management system built to handle high-concurrency reservation scenarios using atomic database transactions.


#1. Prerequisites
Node.js (v18+)

A Neon Postgres instance (Free Tier)

.env.local file populated with DATABASE_URL

#2. Setup
Bash
Install dependencies
npm install

Run migrations (ensure your schema matches the reservation/inventory tables)
npx prisma db push 

Seed the database for testing
npx ts-node scripts/seed.ts

Start the development server
npm run dev
Concurrency & Expiry Mechanism
Race-Condition-Free Reservations
To ensure correctness under load, we implement atomic row-level fencing. Instead of performing a "read-then-write" in application logic (which is vulnerable to race conditions), we use a single UPDATE query with a WHERE clause:

SQL
UPDATE "WarehouseStock" 
SET "reservedQty" = "reservedQty" + 1 
WHERE "productId" = $1 
AND "warehouseId" = $2 
AND ("totalQty" - "reservedQty") > 0;
If the query returns 0 rows updated, the database effectively tells us the stock was grabbed by another process, allowing us to return a 409 Conflict status immediately.

#3. Expiry Mechanism
In production, reservations are time-bound. We use a "TTL (Time-To-Live) Background Worker" or a Cron Job (e.g., via Vercel Cron or a separate worker) that queries the Reservations table for any entry where createdAt < NOW() - INTERVAL '10 minutes' and status = 'PENDING'. It then decrements the reservedQty and deletes the lock record to restore global availability.

#4. Engineering Trade-offs & Future Improvements
Trade-offs Made
Isolation Level: We utilized READ COMMITTED (default). While SERIALIZABLE provides higher safety, it introduces significant performance overhead and frequent transaction retries, which would complicate the UI feedback loop for this demo.

Client-Side Polling: We currently rely on manual fetch calls to refresh state. For a production-grade app, I would implement WebSockets or Server-Sent Events (SSE) for real-time inventory updates.

#5. Future Improvements
Redis Caching: Use Upstash Redis to cache inventory counts, reducing the direct load on the primary Postgres instance during flash sales.

Distributed Locking: For even higher scale, implement a distributed lock manager (like Redlock) to prevent database hotspots entirely.

#6. Project Structure
/app/api: Handles atomic reservation endpoints.

/lib/types: Shared interfaces for consistent data handling.

/scripts: Database seeding and migration utilities.
