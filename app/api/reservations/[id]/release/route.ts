import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// CRITICAL: Prevent build-time static analysis
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get the reservation
      const reservation = await tx.reservation.findUnique({ where: { id } });
      if (!reservation) throw new Error("Not found");

      // 2. Release the stock back to the warehouse
      await tx.stock.updateMany({
        where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
        data: { reservedQty: { decrement: reservation.quantity } }
      });

      // 3. Mark the reservation as released
      return await tx.reservation.update({
        where: { id },
        data: { status: "RELEASED" }
      });
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return NextResponse.json({ error: "Release failed" }, { status: 500 });
  }
}