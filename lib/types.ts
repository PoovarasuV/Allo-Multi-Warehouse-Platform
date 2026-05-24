// Add this interface to your types file
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
  // Add this property
  warehouses: Warehouse[]; 
}