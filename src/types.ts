export interface Material {
  id: string;
  sku: string;
  name: string;
  category: 'raw_material' | 'component' | 'packaging' | 'finished_product';
  stock: number;
  unit: string;
  safetyStock: number;
  unitCost: number;
  location: string;
  supplierId: string;
}

export interface BOMItem {
  materialId: string;
  quantity: number; // quantity needed per unit of finished product
}

export interface BOM {
  productId: string; // references a Material of category 'finished_product'
  items: BOMItem[];
}

export interface ProductionOrder {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  status: 'pending' | 'material_check' | 'production' | 'completed' | 'cancelled';
  scheduledDate: string;
  completionDate?: string;
  progress: number; // 0 to 100
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  email: string;
  leadTime: number; // days
  rating: number; // 1 to 5
}

export interface InventoryLog {
  id: string;
  materialId: string;
  materialName: string;
  type: 'inbound' | 'outbound' | 'adjustment';
  quantity: number;
  date: string;
  referenceId?: string; // e.g. production order ID
  notes?: string;
}
