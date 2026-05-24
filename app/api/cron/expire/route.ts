import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();

    const expired = await prisma.reservation.findMany({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const r of expired) {
        await tx.stock.updateMany({
          where: {
            productId: r.productId,
            warehouseId: r.warehouseId,
          },
          data: {
            reservedQty: {
              decrement: r.quantity,
            },
          },
        });

        await tx.reservation.update({
          where: { id: r.id },
          data: { status: "RELEASED" },
        });
      }
    });

    return NextResponse.json({
      expiredCount: expired.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Cron failed" },
      { status: 500 }
    );
  }
}