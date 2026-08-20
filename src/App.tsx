import React, { useState, useEffect } from "react";
import { Material, BOM, ProductionOrder, Supplier, InventoryLog, BOMItem } from "./types";
import Dashboard from "./components/Dashboard";
import MaterialsList from "./components/MaterialsList";
import BOMManager from "./components/BOMManager";
import ProductionOrders from "./components/ProductionOrders";
import SupplierManager from "./components/SupplierManager";
import LogsViewer from "./components/LogsViewer";
import { 
  Layers, 
  Package, 
  Settings, 
  Calendar, 
  Users, 
  ClipboardList, 
  Brain, 
  Cpu, 
  AlertTriangle 
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Core States
  const [materials, setMaterials] = useState<Material[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);

  // Auth States
  const [user, setUser] = useState<any>(null);
  const [authInstance, setAuthInstance] = useState<any>(null);
  const [authProvider, setAuthProvider] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Fetch initial data from server on startup
  const fetchAllData = async () => {
    try {
      const [materialsRes, bomsRes, ordersRes, suppliersRes, logsRes] = await Promise.all([
        fetch("/api/materials"),
        fetch("/api/boms"),
        fetch("/api/production-orders"),
        fetch("/api/suppliers"),
        fetch("/api/inventory-logs")
      ]);

      const [materialsData, bomsData, ordersData, suppliersData, logsData] = await Promise.all([
        materialsRes.json(),
        bomsRes.json(),
        ordersRes.json(),
        suppliersRes.json(),
        logsRes.json()
      ]);

      setMaterials(materialsData);
      setBoms(bomsData);
      setProductionOrders(ordersData);
      setSuppliers(suppliersData);
      setInventoryLogs(logsData);
    } catch (e) {
      console.error("Error loading full-stack initial records:", e);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Initialize Client Firebase
    import("./lib/firebase-client").then(({ initFirebaseClient }) => {
      initFirebaseClient().then(({ auth, provider }) => {
        setAuthInstance(auth);
        setAuthProvider(provider);
        auth.onAuthStateChanged((currentUser: any) => {
          setUser(currentUser);
          setAuthLoading(false);
        });
      }).catch(err => {
        console.error("Firebase client initialization failed:", err);
        setAuthLoading(false);
      });
    });
  }, []);

  // Helper to extract JWT Auth Token
  const getAuthHeaders = async () => {
    if (!authInstance || !authInstance.currentUser) {
      return {};
    }
    try {
      const token = await authInstance.currentUser.getIdToken(true);
      return { "Authorization": `Bearer ${token}` };
    } catch (e) {
      console.error("Failed to fetch Google Auth ID Token:", e);
      return {};
    }
  };

  // Google Login / Logout Handlers
  const handleLogin = async () => {
    if (!authInstance || !authProvider) {
      alert("Firebase 尚未載入完成，請稍後重試。");
      return;
    }
    try {
      const { signInWithPopup } = await import("firebase/auth");
      await signInWithPopup(authInstance, authProvider);
    } catch (error: any) {
      console.error("Google Sign-In failed:", error);
      alert("登入失敗（若於內嵌視窗無法彈出，請點選右上角『在新分頁開啟』後再登入）：\n" + (error.message || error));
    }
  };

  const handleLogout = async () => {
    if (!authInstance) return;
    try {
      const { signOut } = await import("firebase/auth");
      await signOut(authInstance);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Material Handlers
  const handleCreateMaterial = async (newMat: Omit<Material, "id">): Promise<Material> => {
    if (!user) {
      throw new Error("唯讀模式：請先登入 Google 帳號！");
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(newMat)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "新增物料失敗");
    }
    const created: Material = await res.json();
    setMaterials(prev => [...prev, created]);
    // Refresh logs in case stock was initialized
    fetch("/api/inventory-logs").then(r => r.json()).then(data => setInventoryLogs(data));
    return created;
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<Material> & { notes?: string }) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/materials/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "修改物料失敗");
      return;
    }
    const updated: Material = await res.json();
    setMaterials(prev => prev.map(m => m.id === id ? updated : m));
    // Refresh inventory logs
    fetch("/api/inventory-logs").then(r => r.json()).then(data => setInventoryLogs(data));
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/materials/${id}`, { 
      method: "DELETE",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "刪除物料失敗");
      return;
    }
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  // BOM Handlers
  const handleSaveBOM = async (productId: string, items: BOMItem[]) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/boms", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify({ productId, items })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "儲存 BOM 失敗");
      return;
    }
    const updatedBom: BOM = await res.json();
    setBoms(prev => {
      const exists = prev.some(b => b.productId === productId);
      if (exists) {
        return prev.map(b => b.productId === productId ? updatedBom : b);
      }
      return [...prev, updatedBom];
    });
  };

  // Production Order Handlers
  const handleCreateOrder = async (order: { productId: string; quantity: number; scheduledDate: string; notes?: string }) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/production-orders", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "建立工單失敗");
      return;
    }
    const created: ProductionOrder = await res.json();
    setProductionOrders(prev => [...prev, created]);
  };

  const handleUpdateOrder = async (id: string, updates: Partial<ProductionOrder>) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/production-orders/${id}`, {
      method: "PUT",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "修改工單失敗");
      return;
    }
    const updated: ProductionOrder = await res.json();
    setProductionOrders(prev => prev.map(o => o.id === id ? updated : o));
  };

  const handleDeleteOrder = async (id: string) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/production-orders/${id}`, {
      method: "DELETE",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "刪除工單失敗");
      return;
    }
    setProductionOrders(prev => prev.filter(o => o.id !== id));
  };

  const handleStartOrder = async (id: string) => {
    if (!user) {
      return { error: "唯讀模式：請先登入 Google 帳號後再進行投料生產！" };
    }
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/production-orders/${id}/start`, {
        method: "POST",
        headers: {
          ...authHeaders
        }
      });
      const data = await res.json();
      
      // Update our materials, orders, and logs with latest state from server
      fetchAllData();
      return data;
    } catch (e) {
      return { error: "投料啟動失敗，請稍後重試。" };
    }
  };

  const handleCompleteOrder = async (id: string) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/production-orders/${id}/complete`, {
      method: "POST",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "完成工單失敗");
      return;
    }
    const completedOrder: ProductionOrder = await res.json();
    setProductionOrders(prev => prev.map(o => o.id === id ? completedOrder : o));
    // Refresh materials and logs since finished product was added
    fetch("/api/materials").then(r => r.json()).then(data => setMaterials(data));
    fetch("/api/inventory-logs").then(r => r.json()).then(data => setInventoryLogs(data));
  };

  // Supplier Handlers
  const handleCreateSupplier = async (newSup: Omit<Supplier, "id">) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...authHeaders
      },
      body: JSON.stringify(newSup)
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "新增供應商失敗");
      return;
    }
    const created: Supplier = await res.json();
    setSuppliers(prev => [...prev, created]);
  };

  // Inventory Log Handlers
  const handleDeleteLog = async (id: string) => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/inventory-logs/${id}`, {
      method: "DELETE",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "刪除異動日誌失敗");
    }
    setInventoryLogs(prev => prev.filter(log => log.id !== id));
  };

  const handleCleanupLogs = async () => {
    if (!user) {
      alert("唯讀模式：請先登入 Google 帳號！");
      return;
    }
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`/api/inventory-logs/cleanup`, {
      method: "POST",
      headers: {
        ...authHeaders
      }
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "清理失效日誌失敗");
    }
    const data = await res.json();
    setInventoryLogs(data.inventoryLogs || []);
    return data;
  };

  // Count total materials below safety stock to show globally in a badge
  const warningCount = materials.filter(m => m.stock < m.safetyStock).length;

  return (
    <div id="app" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Main Navigation Header */}
      <header className="bg-slate-900 text-slate-100 shadow-lg border-b border-slate-800 z-10 sticky top-0">
        <div className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Logo / Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1 md:flex-initial">
              <div className="h-10 w-10 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Cpu className="h-5 w-5 text-slate-950" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-extrabold tracking-tight text-white flex items-center gap-1 truncate">
                  生產與材料管理系統
                  <span className="text-xxs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 rounded">ERP-Lite</span>
                </h1>
                <p className="text-xxs text-slate-400 font-medium truncate">智慧物料配料 BOM 與 MRP 生產排程系統</p>
              </div>
            </div>

            {/* Auth Controls & Tab Helper */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Open in New Tab Button (for IFrame workarounds) */}
              <a
                href={window.location.href}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 text-xxs bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all cursor-pointer"
                title="Google 登入若於預覽視窗被攔截，請在新分頁開啟"
              >
                <span>在新分頁開啟系統 ↗</span>
              </a>

              {authLoading ? (
                <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                  <span>驗證中...</span>
                </div>
              ) : user ? (
                <div className="flex items-center gap-3 bg-slate-800 border border-slate-700/50 py-1 pl-2.5 pr-1 rounded-xl">
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-100">{user.displayName || "Google 用戶"}</span>
                    <span className="text-xxs text-slate-400 font-mono scale-90 origin-right">{user.email}</span>
                  </div>
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || "User"}
                      className="h-8 w-8 rounded-lg border border-slate-600 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                      {user.displayName ? user.displayName[0] : "U"}
                    </div>
                  )}
                  <button
                    onClick={handleLogout}
                    className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg text-xxs font-semibold transition-all cursor-pointer border border-red-500/20 hover:border-transparent"
                  >
                    登出
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLogin}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>登入 Google 帳號</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Read-Only mode warning Banner */}
      {!authLoading && !user && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-800 text-xs py-2 px-4 shadow-inner no-print">
          <div className="max-w-[95%] xl:max-w-[1550px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 text-xxs font-bold">ℹ</span>
              <p className="font-medium text-amber-900">
                目前為 <span className="font-extrabold text-amber-700">【唯讀模式 (任何人皆可查看)】</span>。系統儲存權限已受保護，如需新增/修改物料、BOM、工單、或進行投料生產等儲存操作，請點選右上方登入 Google 帳號。
              </p>
            </div>
            <button
              onClick={handleLogin}
              className="text-xxs font-bold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-md transition-all cursor-pointer flex-shrink-0 animate-pulse"
            >
              登入 Google 帳號授權
            </button>
          </div>
        </div>
      )}

      {/* Main Sub Tab Nav rail */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-xs no-print">
        <div className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 py-2 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "dashboard"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>決策儀表板</span>
            </button>

            <button
              onClick={() => setActiveTab("materials")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "materials"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>材料庫存管理</span>
              {warningCount > 0 && (
                <span className="bg-red-500 text-white font-mono text-xxs font-bold px-1.5 py-0.5 rounded-full">
                  {warningCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("bom")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "bom"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Brain className="h-4 w-4" />
              <span>物料清單 BOM</span>
            </button>

            <button
              onClick={() => setActiveTab("production")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "production"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>生產工單排程</span>
            </button>

            <button
              onClick={() => setActiveTab("suppliers")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "suppliers"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>供應商管理</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === "logs"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span>材料異動日誌</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[95%] xl:max-w-[1550px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "dashboard" && (
          <Dashboard
            materials={materials}
            orders={productionOrders}
            suppliers={suppliers}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === "materials" && (
          <MaterialsList
            materials={materials}
            suppliers={suppliers}
            onCreateMaterial={handleCreateMaterial}
            onUpdateMaterial={handleUpdateMaterial}
            onDeleteMaterial={handleDeleteMaterial}
          />
        )}

        {activeTab === "bom" && (
          <BOMManager
            materials={materials}
            boms={boms}
            onSaveBOM={handleSaveBOM}
            onCreateMaterial={handleCreateMaterial}
            user={user}
          />
        )}

        {activeTab === "production" && (
          <ProductionOrders
            materials={materials}
            orders={productionOrders}
            onCreateOrder={handleCreateOrder}
            onUpdateOrder={handleUpdateOrder}
            onStartOrder={handleStartOrder}
            onCompleteOrder={handleCompleteOrder}
            onDeleteOrder={handleDeleteOrder}
          />
        )}

        {activeTab === "suppliers" && (
          <SupplierManager
            suppliers={suppliers}
            materials={materials}
            onCreateSupplier={handleCreateSupplier}
          />
        )}

        {activeTab === "logs" && (
          <LogsViewer 
            logs={inventoryLogs} 
            materials={materials}
            onDeleteLog={handleDeleteLog}
            onCleanupLogs={handleCleanupLogs}
            user={user}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto text-center text-xs text-slate-400">
        <div className="max-w-[95%] xl:max-w-[1550px] mx-auto px-4">
          <p>© 2026 生產與材料管理系統 (ERP-Lite with Gemini AI). All Rights Reserved. 智慧雲端物料分析版</p>
        </div>
      </footer>
    </div>
  );
}
