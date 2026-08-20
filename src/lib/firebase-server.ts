import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import fs from "fs";
import path from "path";
import { Material, BOM, ProductionOrder, Supplier, InventoryLog } from "../types";

// Load configuration safely from the root file
let db: any;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  const configRaw = fs.readFileSync(configPath, "utf8");
  const config = JSON.parse(configRaw);

  const firebaseConfig = {
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId
  };

  const app = initializeApp(firebaseConfig);
  // Using the custom databaseId provided by the system
  db = getFirestore(app, config.firestoreDatabaseId || "(default)");
  console.log("Firebase initialized successfully with DB:", config.firestoreDatabaseId || "(default)");
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

// 1. Materials
export async function getMaterials(): Promise<Material[]> {
  try {
    const colRef = collection(db, "materials");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => d.data() as Material);
  } catch (error) {
    console.error("Error fetching materials from Firestore:", error);
    return [];
  }
}

export async function saveMaterial(mat: Material): Promise<void> {
  try {
    const docRef = doc(db, "materials", mat.id);
    await setDoc(docRef, mat);
  } catch (error) {
    console.error(`Error saving material ${mat.id} to Firestore:`, error);
  }
}

export async function deleteMaterialFromDb(id: string): Promise<void> {
  try {
    const docRef = doc(db, "materials", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting material ${id} from Firestore:`, error);
  }
}

// 2. BOMs
export async function getBOMs(): Promise<BOM[]> {
  try {
    const colRef = collection(db, "boms");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => d.data() as BOM);
  } catch (error) {
    console.error("Error fetching BOMs from Firestore:", error);
    return [];
  }
}

export async function saveBOM(bom: BOM): Promise<void> {
  try {
    const docRef = doc(db, "boms", bom.productId);
    await setDoc(docRef, bom);
  } catch (error) {
    console.error(`Error saving BOM for product ${bom.productId} to Firestore:`, error);
  }
}

// 3. Production Orders
export async function getProductionOrders(): Promise<ProductionOrder[]> {
  try {
    const colRef = collection(db, "productionOrders");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => d.data() as ProductionOrder);
  } catch (error) {
    console.error("Error fetching production orders from Firestore:", error);
    return [];
  }
}

export async function saveProductionOrder(order: ProductionOrder): Promise<void> {
  try {
    const docRef = doc(db, "productionOrders", order.id);
    await setDoc(docRef, order);
  } catch (error) {
    console.error(`Error saving production order ${order.id} to Firestore:`, error);
  }
}

export async function deleteProductionOrderFromDb(id: string): Promise<void> {
  try {
    const docRef = doc(db, "productionOrders", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting production order ${id} from Firestore:`, error);
  }
}

// 4. Suppliers
export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const colRef = collection(db, "suppliers");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => d.data() as Supplier);
  } catch (error) {
    console.error("Error fetching suppliers from Firestore:", error);
    return [];
  }
}

export async function saveSupplier(supplier: Supplier): Promise<void> {
  try {
    const docRef = doc(db, "suppliers", supplier.id);
    await setDoc(docRef, supplier);
  } catch (error) {
    console.error(`Error saving supplier ${supplier.id} to Firestore:`, error);
  }
}

// 5. Inventory Logs
export async function getInventoryLogs(): Promise<InventoryLog[]> {
  try {
    const colRef = collection(db, "inventoryLogs");
    const snapshot = await getDocs(colRef);
    return snapshot.docs.map(d => d.data() as InventoryLog);
  } catch (error) {
    console.error("Error fetching inventory logs from Firestore:", error);
    return [];
  }
}

export async function saveInventoryLog(log: InventoryLog): Promise<void> {
  try {
    const docRef = doc(db, "inventoryLogs", log.id);
    await setDoc(docRef, log);
  } catch (error) {
    console.error(`Error saving inventory log ${log.id} to Firestore:`, error);
  }
}

export async function deleteInventoryLogFromDb(id: string): Promise<void> {
  try {
    const docRef = doc(db, "inventoryLogs", id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Error deleting inventory log ${id} from Firestore:`, error);
  }
}
