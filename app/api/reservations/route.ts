import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { productId, warehouseId, quantity } = await req.json();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock stock row
      const stock = await tx.stock.findUnique({
        where: {
          productId_warehouseId: {
            productId,
            warehouseId,
          },
        },
      });

      if (!stock) {
        throw new Error("Stock not found");
      }

      const available = stock.totalQty - stock.reservedQty;

      if (available < quantity) {
        return null;
      }

      // 2. Update reserved stock
      await tx.stock.update({
        where: {
          id: stock.id,
        },
        data: {
          reservedQty: {
            increment: quantity,
          },
        },
      });

      // 3. Create reservation
      const reservation = await tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });

      return reservation;
    });

    if (!result) {
      return NextResponse.json(
        { error: "Not enough stock" },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}