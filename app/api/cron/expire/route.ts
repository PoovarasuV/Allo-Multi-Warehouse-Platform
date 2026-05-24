import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Force dynamic execution so Next.js doesn't try to pre-render this
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    // 1. Fetch expired reservations
    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    });

    // If nothing to release, exit early
    if (expired.length === 0) {
      return NextResponse.json({ expiredCount: 0 });
    }

    // 2. Perform the atomic transaction
    await prisma.$transaction(async (tx) => {
      for (const r of expired) {
        await tx.stock.updateMany({
          where: {
            productId: r.productId,
            warehouseId: r.warehouseId,
          },
          data: {
            reservedQty: { decrement: r.quantity },
          },
        });

        await tx.reservation.update({
          where: { id: r.id },
          data: { status: "RELEASED" },
        });
      }
    });

    return NextResponse.json({ expiredCount: expired.length });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json(
      { error: "Cron execution failed" },
      { status: 500 }
    );
  }
}