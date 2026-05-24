// lib/types.ts
export interface Product {
  id: string;
  name: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
}