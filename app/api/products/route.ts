import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust this path to match your custom setup folder

export async function GET() {
  try {
    // Pull products along with their multi-warehouse stock allocations
    const dbProducts = await prisma.product.findMany({
      include: {
        stocks: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    // Format data so it satisfies your frontend UI types exactly
    const formattedProducts = dbProducts.map((prod) => {
      // Calculate consolidated global totals across all operational warehouses
      const totalStock = prod.stocks.reduce((sum, s) => sum + s.totalQty, 0);
      const reservedStock = prod.stocks.reduce((sum, s) => sum + s.reservedQty, 0);
      const availableStock = totalStock - reservedStock;

      // Cleanly map the matrix inner table fields
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