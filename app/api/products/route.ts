\import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Add this line to force runtime execution and bypass build-time static analysis
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dbProducts = await prisma.product.findMany({
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    const formattedProducts = dbProducts.map((prod) => {
      const totalStock = prod.stocks.reduce((sum, s) => sum + s.totalQty, 0);
      const reservedStock = prod.stocks.reduce((sum, s) => sum + s.reservedQty, 0);
      const availableStock = totalStock - reservedStock;

      const warehouses = prod.stocks.map((s) => ({
        warehouseId: s.warehouseId,
        warehouseName: `${s.warehouse.name}`,
        totalStock: s.totalQty,
        reservedStock: s.reservedQty,
        availableStock: s.totalQty - s.reservedQty,
      }));

      return {
        id: prod.id,
        name: prod.name,
        totalStock,
        reservedStock,
        availableStock,
        warehouses,
      };
    });

    return NextResponse.json(formattedProducts, { status: 200 });
  } catch (error: any) {
    console.error("Products Fetch Error:", error);
    return NextResponse.json(
      { error: "Failed to gather multi-warehouse matrix registries." },
      { status: 500 }
    );
  }
}