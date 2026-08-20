import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Material, BOM, ProductionOrder, Supplier, InventoryLog } from "./src/types";
import { 
  getMaterials, saveMaterial, deleteMaterialFromDb,
  getBOMs, saveBOM,
  getProductionOrders, saveProductionOrder, deleteProductionOrderFromDb,
  getSuppliers, saveSupplier,
  getInventoryLogs, saveInventoryLog, deleteInventoryLogFromDb
} from "./src/lib/firebase-server";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory Database Store
let materials: Material[] = [
  // Finished Products
  { id: "M001", sku: "PROD-MOT-M400", name: "高精密交流伺服馬達 (Servo Motor M400)", category: "finished_product", stock: 15, unit: "台", safetyStock: 5, unitCost: 12000, location: "W1-A1", supplierId: "S101" },
  { id: "M002", sku: "PROD-DRV-D200", name: "數位向量伺服驅動器 (Servo Driver D200)", category: "finished_product", stock: 45, unit: "台", safetyStock: 10, unitCost: 8500, location: "W1-B2", supplierId: "S103" },
  { id: "M003", sku: "PROD-CBL-ENC5", name: "抗干擾雙屏蔽編碼線 (Encoder Cable 5M)", category: "finished_product", stock: 80, unit: "條", safetyStock: 20, unitCost: 1200, location: "W1-C1", supplierId: "S104" },
  { id: "M004", sku: "PROD-CBL-PWR5", name: "高柔性複合馬達動力線 (Power Cable 5M)", category: "finished_product", stock: 60, unit: "條", safetyStock: 15, unitCost: 1800, location: "W1-C2", supplierId: "S104" },
  
  // Raw Materials / Components
  { id: "M101", sku: "RAW-COP-WIRE", name: "高純度漆包銅線 (0.8mm 繞組用)", category: "raw_material", stock: 80, unit: "公斤", safetyStock: 50, unitCost: 280, location: "W2-A1", supplierId: "S101" },
  { id: "M102", sku: "COMP-MAG-ROTR", name: "釹鐵硼永磁轉子組件 (M400專用)", category: "component", stock: 8, unit: "組", safetyStock: 12, unitCost: 3200, location: "W2-A2", supplierId: "S101" },
  { id: "M103", sku: "COMP-BRG-PREC", name: "雙面不銹鋼精密高速軸承 (NSK)", category: "component", stock: 55, unit: "個", safetyStock: 30, unitCost: 150, location: "W2-B1", supplierId: "S102" },
  { id: "M104", sku: "RAW-ALU-HSG", name: "馬達高導熱壓鑄外殼 (M400)", category: "raw_material", stock: 18, unit: "個", safetyStock: 8, unitCost: 1200, location: "W2-B2", supplierId: "S102" },
  { id: "M105", sku: "COMP-PCB-DSP", name: "DSP向量控制驅動核心電路板", category: "component", stock: 14, unit: "片", safetyStock: 15, unitCost: 2800, location: "W2-C1", supplierId: "S103" },
  { id: "M106", sku: "COMP-IGBT-MOD", name: "大功率 IGBT 功率逆變模組 (600V/50A)", category: "component", stock: 22, unit: "個", safetyStock: 15, unitCost: 1800, location: "W2-C2", supplierId: "S103" },
  { id: "M107", sku: "RAW-CBL-SHLD", name: "高柔性雙層屏蔽電纜線材 (UL2464)", category: "raw_material", stock: 180, unit: "米", safetyStock: 300, unitCost: 65, location: "W3-A1", supplierId: "S104" },
  { id: "M108", sku: "COMP-CON-6PIN", name: "編碼器軍規 6-Pin 防水金屬接頭", category: "component", stock: 160, unit: "個", safetyStock: 50, unitCost: 180, location: "W3-B1", supplierId: "S104" },
  { id: "M109", sku: "COMP-CON-4PIN", name: "動力專用大電流 4-Pin 重載插頭", category: "component", stock: 110, unit: "個", safetyStock: 40, unitCost: 250, location: "W3-B2", supplierId: "S104" },
  { id: "M110", sku: "PKG-BOX-ESD", name: "防靜電防震工業出貨紙箱", category: "packaging", stock: 35, unit: "個", safetyStock: 15, unitCost: 90, location: "W4-A1", supplierId: "S105" }
];

let boms: BOM[] = [
  {
    productId: "M001",
    items: [
      { materialId: "M101", quantity: 3.5 }, // 3.5 kg of copper wire
      { materialId: "M102", quantity: 1 },   // 1 rotor magnet
      { materialId: "M103", quantity: 2 },   // 2 NSK bearings
      { materialId: "M104", quantity: 1 },   // 1 housing
      { materialId: "M110", quantity: 1 }    // 1 packaging box
    ]
  },
  {
    productId: "M002",
    items: [
      { materialId: "M105", quantity: 1 },   // 1 DSP board
      { materialId: "M106", quantity: 1 },   // 1 IGBT module
      { materialId: "M110", quantity: 1 }    // 1 packaging box
    ]
  },
  {
    productId: "M003",
    items: [
      { materialId: "M107", quantity: 5 },   // 5 meters wire
      { materialId: "M108", quantity: 2 },   // 2 6-pin connector
      { materialId: "M110", quantity: 1 }    // 1 packaging box
    ]
  },
  {
    productId: "M004",
    items: [
      { materialId: "M107", quantity: 5 },   // 5 meters wire
      { materialId: "M109", quantity: 2 },   // 2 4-pin connector
      { materialId: "M110", quantity: 1 }    // 1 packaging box
    ]
  }
];

let productionOrders: ProductionOrder[] = [
  { id: "PO001", productId: "M001", productName: "高精密交流伺服馬達 (Servo Motor M400)", quantity: 8, status: "production", scheduledDate: "2026-07-10", progress: 65, notes: "急單：半導體晶圓廠輸送帶精密定位用馬達" },
  { id: "PO002", productId: "M002", productName: "數位向量伺服驅動器 (Servo Driver D200)", quantity: 15, status: "pending", scheduledDate: "2026-07-15", progress: 0, notes: "例行補貨：南部代理商展示與常備週轉庫存" },
  { id: "PO003", productId: "M001", productName: "高精密交流伺服馬達 (Servo Motor M400)", quantity: 12, status: "material_check", scheduledDate: "2026-07-22", progress: 0, notes: "轉子磁鋼與外殼庫存吃緊，等待進行投料評估與採購補貨" }
];

let suppliers: Supplier[] = [
  { id: "S101", name: "台灣精工電磁與磁體材料廠", contact: "張經理", email: "energy@battery-motor.com", leadTime: 5, rating: 5 },
  { id: "S102", name: "中鋼精工重載外殼加工廠", contact: "王副總", email: "sales@qiangguan-metal.com", leadTime: 7, rating: 4 },
  { id: "S103", name: "巨晶半導體與驅動控制晶片", contact: "李主任", email: "mcu@chaoqun-tech.com", leadTime: 10, rating: 4 },
  { id: "S104", name: "正崴精密高柔性纜線連接器", contact: "陳廠長", email: "service@jiean-parts.com", leadTime: 3, rating: 5 },
  { id: "S105", name: "綠環防靜電工業安全包裝廠", contact: "林小姐", email: "eco@green-pack.com", leadTime: 2, rating: 4 }
];

let inventoryLogs: InventoryLog[] = [
  { id: "L001", materialId: "M101", materialName: "高純度漆包銅線 (0.8mm 繞組用)", type: "inbound", quantity: 80, date: "2026-07-01T10:00:00.000Z", notes: "首批進料檢驗驗收入庫" },
  { id: "L002", materialId: "M105", materialName: "DSP向量控制驅動核心電路板", type: "inbound", quantity: 20, date: "2026-07-02T11:30:00.000Z", notes: "進料檢驗驗收入庫" },
  { id: "L003", materialId: "M102", materialName: "釹鐵硼永磁轉子組件 (M400專用)", type: "outbound", quantity: 8, date: "2026-07-05T14:20:00.000Z", referenceId: "PO001", notes: "工單 PO001 馬達轉子投料領出" }
];

async function initDatabase() {
  try {
    console.log("Synchronizing memory cache with Firestore...");
    const dbMaterials = await getMaterials();
    const dbBoms = await getBOMs();
    const dbOrders = await getProductionOrders();
    const dbSuppliers = await getSuppliers();
    const dbLogs = await getInventoryLogs();

    if (dbMaterials.length > 0) {
      materials = dbMaterials;
      console.log(`Loaded ${dbMaterials.length} materials from Firestore.`);
    } else {
      console.log("Firestore materials is empty, seeding default materials...");
      for (const m of materials) {
        await saveMaterial(m);
      }
    }

    if (dbBoms.length > 0) {
      boms = dbBoms;
      console.log(`Loaded ${dbBoms.length} BOMs from Firestore.`);
    } else {
      console.log("Firestore BOMs is empty, seeding default BOMs...");
      for (const b of boms) {
        await saveBOM(b);
      }
    }

    if (dbOrders.length > 0) {
      productionOrders = dbOrders;
      console.log(`Loaded ${dbOrders.length} production orders from Firestore.`);
    } else {
      console.log("Firestore production orders is empty, seeding default orders...");
      for (const o of productionOrders) {
        await saveProductionOrder(o);
      }
    }

    if (dbSuppliers.length > 0) {
      suppliers = dbSuppliers;
      console.log(`Loaded ${dbSuppliers.length} suppliers from Firestore.`);
    } else {
      console.log("Firestore suppliers is empty, seeding default suppliers...");
      for (const s of suppliers) {
        await saveSupplier(s);
      }
    }

    if (dbLogs.length > 0) {
      inventoryLogs = dbLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      console.log(`Loaded ${dbLogs.length} inventory logs from Firestore.`);
    } else {
      console.log("Firestore inventory logs is empty, seeding default logs...");
      for (const l of inventoryLogs) {
        await saveInventoryLog(l);
      }
    }

    console.log("Database synchronization with Firestore complete!");
  } catch (error) {
    console.error("Error synchronizing database with Firestore:", error);
  }
}

// Lazy initialization of Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// REST API Endpoints

app.get("/api/firebase-config", (req, res) => {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const configRaw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configRaw);
    res.json(config);
  } catch (error) {
    console.error("Error reading firebase config:", error);
    res.status(500).json({ error: "Failed to load Firebase configuration" });
  }
});

// Middleware to verify Firebase Google Auth Token
async function verifyAuthToken(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未提供登入憑證或憑證無效" });
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const configRaw = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configRaw);
    const apiKey = config.apiKey;

    // Call identitytoolkit API to verify token and get user profile
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Firebase ID Token verification failed:", errData);
      return res.status(401).json({ error: "登入身份驗證已過期，請重新登入" });
    }

    const data: any = await response.json();
    if (!data.users || data.users.length === 0) {
      return res.status(401).json({ error: "找不到該 Google 帳號用戶" });
    }

    req.user = data.users[0];
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "伺服器身份驗證程序出錯" });
  }
}

// 1. Materials
app.get("/api/materials", (req, res) => {
  res.json(materials);
});

app.post("/api/materials", verifyAuthToken, async (req, res) => {
  const newMat: Material = {
    id: `M${String(materials.length + 101).padStart(3, "0")}`,
    ...req.body
  };
  materials.push(newMat);
  await saveMaterial(newMat);
  
  // Log the inventory creation if stock is > 0
  if (newMat.stock > 0) {
    const log: InventoryLog = {
      id: `L${String(inventoryLogs.length + 1).padStart(3, "0")}`,
      materialId: newMat.id,
      materialName: newMat.name,
      type: "inbound",
      quantity: newMat.stock,
      date: new Date().toISOString(),
      notes: "初始庫存開帳"
    };
    inventoryLogs.unshift(log);
    await saveInventoryLog(log);
  }
  res.status(201).json(newMat);
});

app.put("/api/materials/:id", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const index = materials.findIndex(m => m.id === id);
  if (index !== -1) {
    const oldStock = materials[index].stock;
    const newStock = req.body.stock ?? oldStock;
    
    // Log adjustment if stock changes
    if (newStock !== oldStock) {
      const log: InventoryLog = {
        id: `L${String(inventoryLogs.length + 1).padStart(3, "0")}`,
        materialId: id,
        materialName: materials[index].name,
        type: newStock > oldStock ? "inbound" : "outbound",
        quantity: Math.abs(newStock - oldStock),
        date: new Date().toISOString(),
        notes: req.body.notes || "手動庫存調整"
      };
      inventoryLogs.unshift(log);
      await saveInventoryLog(log);
    }

    materials[index] = { ...materials[index], ...req.body, id }; // protect ID
    await saveMaterial(materials[index]);
    res.json(materials[index]);
  } else {
    res.status(404).json({ error: "Material not found" });
  }
});

app.delete("/api/materials/:id", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const index = materials.findIndex(m => m.id === id);
  if (index !== -1) {
    materials.splice(index, 1);
    await deleteMaterialFromDb(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Material not found" });
  }
});

// 2. BOMs
app.get("/api/boms", (req, res) => {
  res.json(boms);
});

app.post("/api/boms", verifyAuthToken, async (req, res) => {
  const { productId, items } = req.body;
  const index = boms.findIndex(b => b.productId === productId);
  if (index !== -1) {
    boms[index].items = items;
    await saveBOM(boms[index]);
    res.json(boms[index]);
  } else {
    const newBom = { productId, items };
    boms.push(newBom);
    await saveBOM(newBom);
    res.status(201).json(newBom);
  }
});

// 3. Production Orders
app.get("/api/production-orders", (req, res) => {
  res.json(productionOrders);
});

app.post("/api/production-orders", verifyAuthToken, async (req, res) => {
  const { productId, quantity, scheduledDate, notes } = req.body;
  const product = materials.find(m => m.id === productId);
  if (!product) {
    return res.status(400).json({ error: "Finished product not found" });
  }

  const newOrder: ProductionOrder = {
    id: `PO${String(productionOrders.length + 1).padStart(3, "0")}`,
    productId,
    productName: product.name,
    quantity: Number(quantity),
    status: "pending",
    scheduledDate,
    progress: 0,
    notes
  };

  productionOrders.push(newOrder);
  await saveProductionOrder(newOrder);
  res.status(201).json(newOrder);
});

// Update production order details
app.put("/api/production-orders/:id", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const index = productionOrders.findIndex(p => p.id === id);
  if (index !== -1) {
    productionOrders[index] = { ...productionOrders[index], ...req.body, id };
    await saveProductionOrder(productionOrders[index]);
    res.json(productionOrders[index]);
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// Delete production order
app.delete("/api/production-orders/:id", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const index = productionOrders.findIndex(p => p.id === id);
  if (index !== -1) {
    productionOrders.splice(index, 1);
    await deleteProductionOrderFromDb(id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

// Check material readiness & start production
app.post("/api/production-orders/:id/start", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const orderIndex = productionOrders.findIndex(p => p.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Production order not found" });
  }

  const order = productionOrders[orderIndex];
  const bom = boms.find(b => b.productId === order.productId);
  if (!bom) {
    // If no BOM exists, we can still start production but without material reduction tracking
    productionOrders[orderIndex].status = "production";
    productionOrders[orderIndex].progress = 10;
    await saveProductionOrder(productionOrders[orderIndex]);
    return res.json({ order: productionOrders[orderIndex], warning: "未設定物料清單(BOM)，直接開始生產。" });
  }

  // Material evaluation
  const shortMaterials: { name: string; required: number; current: number; unit: string }[] = [];
  
  bom.items.forEach(item => {
    const mat = materials.find(m => m.id === item.materialId);
    if (mat) {
      const needed = item.quantity * order.quantity;
      if (mat.stock < needed) {
        shortMaterials.push({
          name: mat.name,
          required: needed,
          current: mat.stock,
          unit: mat.unit
        });
      }
    }
  });

  if (shortMaterials.length > 0) {
    productionOrders[orderIndex].status = "material_check";
    await saveProductionOrder(productionOrders[orderIndex]);
    return res.status(400).json({
      error: "材料庫存不足，無法開始生產！",
      shortMaterials,
      order: productionOrders[orderIndex]
    });
  }

  // If plenty materials, we lock materials
  for (const item of bom.items) {
    const matIndex = materials.findIndex(m => m.id === item.materialId);
    if (matIndex !== -1) {
      const originalStock = materials[matIndex].stock;
      const consumed = item.quantity * order.quantity;
      materials[matIndex].stock = originalStock - consumed;
      await saveMaterial(materials[matIndex]);
      
      const log: InventoryLog = {
        id: `L${String(inventoryLogs.length + 1).padStart(3, "0")}`,
        materialId: materials[matIndex].id,
        materialName: materials[matIndex].name,
        type: "outbound",
        quantity: consumed,
        date: new Date().toISOString(),
        referenceId: order.id,
        notes: `工單 ${order.id} 投料生產`
      };
      inventoryLogs.unshift(log);
      await saveInventoryLog(log);
    }
  }

  productionOrders[orderIndex].status = "production";
  productionOrders[orderIndex].progress = 10;
  await saveProductionOrder(productionOrders[orderIndex]);

  res.json({ order: productionOrders[orderIndex], success: true });
});

// Complete order
app.post("/api/production-orders/:id/complete", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const orderIndex = productionOrders.findIndex(p => p.id === id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: "Production order not found" });
  }

  const order = productionOrders[orderIndex];
  if (order.status === "completed") {
    return res.status(400).json({ error: "Order already completed" });
  }

  // Increment finished product inventory
  const prodIndex = materials.findIndex(m => m.id === order.productId);
  if (prodIndex !== -1) {
    materials[prodIndex].stock += order.quantity;
    await saveMaterial(materials[prodIndex]);
    
    const log: InventoryLog = {
      id: `L${String(inventoryLogs.length + 1).padStart(3, "0")}`,
      materialId: order.productId,
      materialName: order.productName,
      type: "inbound",
      quantity: order.quantity,
      date: new Date().toISOString(),
      referenceId: order.id,
      notes: `工單 ${order.id} 完成入庫`
    };
    inventoryLogs.unshift(log);
    await saveInventoryLog(log);
  }

  productionOrders[orderIndex].status = "completed";
  productionOrders[orderIndex].progress = 100;
  productionOrders[orderIndex].completionDate = new Date().toISOString().split("T")[0];
  await saveProductionOrder(productionOrders[orderIndex]);

  res.json(productionOrders[orderIndex]);
});

// 4. Suppliers
app.get("/api/suppliers", (req, res) => {
  res.json(suppliers);
});

app.post("/api/suppliers", verifyAuthToken, async (req, res) => {
  const newSup: Supplier = {
    id: `S${String(suppliers.length + 101).padStart(3, "0")}`,
    ...req.body
  };
  suppliers.push(newSup);
  await saveSupplier(newSup);
  res.status(201).json(newSup);
});

// 5. Inventory logs
app.get("/api/inventory-logs", (req, res) => {
  res.json(inventoryLogs);
});

app.delete("/api/inventory-logs/:id", verifyAuthToken, async (req, res) => {
  const { id } = req.params;
  const index = inventoryLogs.findIndex(l => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "找不到該筆異動日誌" });
  }
  inventoryLogs.splice(index, 1);
  await deleteInventoryLogFromDb(id);
  res.json({ success: true, message: "已成功刪除該筆異動日誌" });
});

app.post("/api/inventory-logs/cleanup", verifyAuthToken, async (req, res) => {
  try {
    const materialIds = new Set(materials.map(m => m.id));
    const logsToDelete = inventoryLogs.filter(log => !materialIds.has(log.materialId));
    
    for (const log of logsToDelete) {
      await deleteInventoryLogFromDb(log.id);
    }
    
    inventoryLogs = inventoryLogs.filter(log => materialIds.has(log.materialId));
    res.json({ message: "清理成功", deletedCount: logsToDelete.length, remainingCount: inventoryLogs.length, inventoryLogs });
  } catch (error) {
    console.error("Cleanup logs error:", error);
    res.status(500).json({ error: "清理異動日誌失敗" });
  }
});

// 6. AI Inventory Health Diagnostics & MRP Optimizer
app.post("/api/gemini/analyze", async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(200).json({
      summary: "【AI 診斷未啟用】目前尚未設定 GEMINI_API_KEY。請先在 Settings > Secrets 面板中設定金鑰，即可享受 AI 智慧診斷功能！",
      details: []
    });
  }

  try {
    // Collect facts for prompt
    const dataContext = {
      materials: materials.map(m => ({
        id: m.id,
        name: m.name,
        sku: m.sku,
        category: m.category,
        stock: m.stock,
        safetyStock: m.safetyStock,
        unit: m.unit,
        unitCost: m.unitCost
      })),
      boms: boms.map(b => {
        const prod = materials.find(m => m.id === b.productId);
        return {
          productName: prod ? prod.name : "Unknown",
          items: b.items.map(bi => {
            const mat = materials.find(m => m.id === bi.materialId);
            return {
              materialName: mat ? mat.name : "Unknown",
              qtyPerUnit: bi.quantity
            };
          })
        };
      }),
      orders: productionOrders.filter(o => o.status !== "completed" && o.status !== "cancelled").map(o => ({
        id: o.id,
        productName: o.productName,
        quantity: o.quantity,
        status: o.status,
        scheduledDate: o.scheduledDate
      }))
    };

    const prompt = `
你是一位資深的生產製造與物料採購(MRP)大師，請根據以下提供的目前工廠數據進行分析，並給予一份專業、結構化、可執行的「生產與材料庫存診斷報告」。

工廠目前數據：
\`\`\`json
${JSON.stringify(dataContext, null, 2)}
\`\`\`

請針對以下三個維度進行全面診斷：
1. **庫存缺料警報(Critical Shortages)**：哪些材料或零組件目前的庫存已經低於「安全庫存量(safetyStock)」？對於即將到來的未完成工單(orders)，哪些會直接發生「生產缺料」？
2. **採購建議與緊急排程(Purchase & Scheduling Action items)**：基於目前的缺料和即將到來的生產計畫，給出具體的「採購數量、建議供應商(S101-S105)以及預估前置時間」與「排程調整優先級」。
3. **庫存佔用與資金優化(Inventory Cost Optimization)**：分析是否有不合理的過度囤料(高於安全庫存過多)，造成資金積壓？

請使用 Markdown 格式回答，回答應繁體中文，保持專業、客觀且具備落地可執行性。
最後可以用 2-3 句給出「AI 大師的總結金句」作為亮點。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error) {
    console.error("Gemini Analyze Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "AI 診斷失敗" });
  }
});

// 7. AI BOM suggested specifications
app.post("/api/gemini/suggest-bom", async (req, res) => {
  const { productName, description } = req.body;
  if (!productName) {
    return res.status(400).json({ error: "Missing product name" });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({
      useMock: true,
      suggestedItems: [
        { name: "高導磁矽鋼定子繞組組件", category: "component", quantity: 1, unit: "組", estCost: 2200, reason: "馬達核心電磁感應產生扭矩的關鍵線圈組" },
        { name: "釹鐵硼高防磁永磁轉子組", category: "component", quantity: 1, unit: "組", estCost: 3500, reason: "提供極佳永久勵磁磁通的高能永磁組件" },
        { name: "陽極氧化高強度鋁合金散熱外殼", category: "raw_material", quantity: 1, unit: "個", estCost: 1500, reason: "馬達結構支撐與驅動器功率元件高散熱用外殼" },
        { name: "防靜電高防震緩衝工業紙箱", category: "packaging", quantity: 1, unit: "個", estCost: 120, reason: "確保重型電機在搬運與出貨時防潮與防震保護" }
      ],
      description: "【AI 建議未啟用】目前尚未設定 GEMINI_API_KEY。此為系統預設配料模板，設定 API Key 後將可根據產品特徵進行高度客製化的材料清單(BOM)生成！"
    });
  }

  try {
    const prompt = `
你是一位製造工程師與物料清單 (BOM) 設計大師。
現在，我們即將開發一款新產品：
產品名稱："${productName}"
產品描述："${description || "一款全新高品質工業科技產品"}"

請根據該產品的特徵，幫我們規劃一份「建議物料清單(Suggested Bill of Materials)」。
你必須建議 3~6 種適合組成此產品的關鍵材料/零組件，包含材料名稱、材料類別、每台成品所需數量、計量單位、預估單價(新台幣元)、以及該物料的重要性說明。

請以 JSON 格式回覆，並且嚴格符合以下 JSON Schema。不要有任何 Markdown 包裹(如 \`\`\`json)，直接輸出純 JSON 格式：
{
  "suggestedItems": [
    {
      "name": "物料名稱 (例如：10000mAh大容量鋰電池)",
      "category": "類別，只能是 'raw_material' (原材料), 'component' (零組件), 'packaging' (包材) 其中之一",
      "quantity": 1.5, // 必須是正數，代表生產單個成品所需數量
      "unit": "單位 (例如：個, 組, 條, 公斤, 米)",
      "estCost": 1200, // 預估單價（新台幣元）
      "reason": "說明此物料在此新產品中的主要功能與推薦原因"
    }
  ],
  "engineerSummary": "工程師對該產品組裝與量產難易度的綜合點評與製程建言，字數 100~150 字。"
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText.trim());
    res.json(data);
  } catch (error) {
    console.error("Gemini Suggest BOM Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "AI BOM 生成失敗" });
  }
});


// Express server boots Vite in development
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
