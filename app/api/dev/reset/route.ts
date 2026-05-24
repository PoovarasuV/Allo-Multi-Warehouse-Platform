import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Add this line to prevent the build-time execution error
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    // 1. Flush all active reservation logs to clear concurrency leases
    await prisma.reservation.deleteMany({});

    // 2. Clear out existing stock counters completely
    await prisma.stock.deleteMany({});

    // 3. Re-establish pristine starting metrics
    const productIds = ["p1", "p2", "p3"];
    
    for (const id of productIds) {
      await prisma.stock.create({
        data: { productId: id, warehouseId: "w1", totalQty: 6, reservedQty: 0 },
      });
      await prisma.stock.create({
        data: { productId: id, warehouseId: "w2", totalQty: 4, reservedQty: 0 },
      });
    }

    return NextResponse.json({ message: "Database matrix metrics restored safely!" }, { status: 200 });
  } catch (error: any) {
    console.error("Reset Suite Error:", error);
    return NextResponse.json(
      { error: "Failed to cleanly flush transaction logs." },
      { status: 500 }
    );
  }
}