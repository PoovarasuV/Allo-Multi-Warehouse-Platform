// src/lib/types.ts

export interface Warehouse {
  warehouseId: string;
  warehouseName: string;
  totalQty: number;
  reservedQty: number;
}

export interface Product {
  id: string;
  name: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  warehouses: Warehouse[];
}

// Add this interface definition and export
export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  status: 'PENDING' | 'CONFIRMED' | 'EXPIRED';
  createdAt: string;
}