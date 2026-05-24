import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up existing inventory records...");
  
  // Clear tables in reverse dependency order to protect foreign key constraints
  await prisma.reservation.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.product.deleteMany({});

  console.log("Database cleared. Starting seed sequence...");

  // 1. Create 2 Dedicated Warehouses (w1 and w2)
  const w1 = await prisma.warehouse.create({
    data: {
      id: "w1",
      name: "Chennai DC",
    },
  });

  const w2 = await prisma.warehouse.create({
    data: {
      id: "w2",
      name: "Mumbai Hub",
    },
  });

  // 2. Create 3 Distinct Products (p1, p2, and p3)
  const productsData = [
    { id: "p1", name: "iPhone 15" },
    { id: "p2", name: "iPad Pro M4" },
    { id: "p3", name: "MacBook Air M3" },
  ];

  // 3. Populate Products and Distribute Stock Across Matrix
  for (const prod of productsData) {
    await prisma.product.create({
      data: prod,
    });

    // Distribute stock dynamically for each product across BOTH warehouses
    // Warehouse 1 (w1): 6 Units
    await prisma.stock.create({
      data: {
        productId: prod.id,
        warehouseId: w1.id,
        totalQty: 6,
        reservedQty: 0,
      },
    });

    // Warehouse 2 (w2): 4 Units (making a global base total of 10 units per item)
    await prisma.stock.create({
      data: {
        productId: prod.id,
        warehouseId: w2.id,
        totalQty: 4,
        reservedQty: 0,
      },
    });
  }

  console.log("Seed completed! 3 products and 2 warehouses successfully mapped.");
}

main()
  .catch((e) => {
    console.error("Seed initialization failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });