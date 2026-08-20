import React, { useState } from "react";
import { Material, Supplier } from "../types";
import { Search, Plus, Filter, Edit, Trash2, Sliders, AlertCircle, X, MapPin } from "lucide-react";

interface MaterialsListProps {
  materials: Material[];
  suppliers: Supplier[];
  onCreateMaterial: (material: Omit<Material, "id">) => Promise<any> | void;
  onUpdateMaterial: (id: string, material: Partial<Material> & { notes?: string }) => Promise<any> | void;
  onDeleteMaterial: (id: string) => Promise<any> | void;
}

export default function MaterialsList({
  materials,
  suppliers,
  onCreateMaterial,
  onUpdateMaterial,
  onDeleteMaterial
}: MaterialsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  // Quick inventory adjustment state
  const [adjustingMaterial, setAdjustingMaterial] = useState<Material | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustNotes, setAdjustNotes] = useState("");

  // Create form states
  const [newMat, setNewMat] = useState({
    sku: "",
    name: "",
    category: "raw_material" as Material["category"],
    stock: 0,
    unit: "個",
    safetyStock: 10,
    unitCost: 100,
    location: "W1-A1",
    supplierId: suppliers[0]?.id || ""
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMat.sku || !newMat.name) {
      alert("請填寫物料編號(SKU)與名稱！");
      return;
    }
    try {
      await onCreateMaterial(newMat);
      setIsCreateOpen(false);
      setNewMat({
        sku: "",
        name: "",
        category: "raw_material",
        stock: 0,
        unit: "個",
        safetyStock: 10,
        unitCost: 100,
        location: "W1-A1",
        supplierId: suppliers[0]?.id || ""
      });
    } catch (error: any) {
      alert(error.message || "建檔新物料失敗，請稍後再試！");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;
    try {
      await onUpdateMaterial(editingMaterial.id, editingMaterial);
      setEditingMaterial(null);
    } catch (error: any) {
      alert(error.message || "修改物料失敗，請稍後再試！");
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;
    try {
      await onUpdateMaterial(adjustingMaterial.id, {
        stock: adjustQty,
        notes: adjustNotes || "庫存手動調整"
      });
      setAdjustingMaterial(null);
      setAdjustQty(0);
      setAdjustNotes("");
    } catch (error: any) {
      alert(error.message || "調整庫存失敗，請稍後再試！");
    }
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || m.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categoryLabels: Record<string, string> = {
    raw_material: "原材料",
    component: "零組件",
    packaging: "包材",
    finished_product: "產成品"
  };

  const categoryBadgeColors: Record<string, string> = {
    raw_material: "bg-amber-50 text-amber-700 border-amber-100",
    component: "bg-blue-50 text-blue-700 border-blue-100",
    packaging: "bg-indigo-50 text-indigo-700 border-indigo-100",
    finished_product: "bg-emerald-50 text-emerald-700 border-emerald-100"
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋物料名稱、SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <div className="relative flex items-center">
            <Filter className="absolute left-3 h-4 w-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
            >
              <option value="all">所有類別 (All)</option>
              <option value="raw_material">原材料 (Raw Material)</option>
              <option value="component">零組件 (Component)</option>
              <option value="packaging">包材 (Packaging)</option>
              <option value="finished_product">產成品 (Finished Product)</option>
            </select>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>建檔新物料</span>
        </button>
      </div>

      {/* Materials Table Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">物料編號 (SKU)</th>
                <th className="py-3 px-4">類別</th>
                <th className="py-3 px-4">物料名稱</th>
                <th className="py-3 px-4 text-right">當前庫存 / 單位</th>
                <th className="py-3 px-4 text-right">安全庫存</th>
                <th className="py-3 px-4 text-right">進價成本 / 估值</th>
                <th className="py-3 px-4">倉庫儲位</th>
                <th className="py-3 px-4">主要供應商</th>
                <th className="py-3 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((m) => {
                  const supplier = suppliers.find((s) => s.id === m.supplierId);
                  const isLow = m.stock < m.safetyStock;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 text-xs">
                        {m.sku}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${categoryBadgeColors[m.category]}`}>
                          {categoryLabels[m.category]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-800">{m.name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLow && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                          )}
                          <span className={`font-semibold ${isLow ? "text-red-600" : "text-slate-800"}`}>
                            {m.stock}
                          </span>
                          <span className="text-slate-400 text-xs">{m.unit}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                        {m.safetyStock} {m.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="text-slate-800 font-medium">NT$ {m.unitCost.toLocaleString()}</div>
                        <div className="text-slate-400 text-xxs font-mono">
                          值 NT$ {(m.stock * m.unitCost).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium text-xs">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {m.location || "N/A"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 text-xs">
                        {supplier ? supplier.name : "無指定"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setAdjustingMaterial(m);
                              setAdjustQty(m.stock);
                              setAdjustNotes("");
                            }}
                            className="p-1 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-md transition-colors border border-slate-100"
                            title="快速庫存調整"
                          >
                            <Sliders className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingMaterial(m)}
                            className="p-1 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-md transition-colors border border-slate-100"
                            title="編輯物料"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`確認要刪除物料 ${m.name} 嗎？`)) {
                                try {
                                  await onDeleteMaterial(m.id);
                                } catch (error: any) {
                                  alert(error.message || "刪除物料失敗，請稍後再試！");
                                }
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-md transition-colors border border-slate-100"
                            title="刪除物料"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    未找到符合條件的物料品項。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create New Material */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800">新增物料與產品建檔</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    物料編號 (SKU) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如: RAW-ALUM-FRM"
                    value={newMat.sku}
                    onChange={(e) => setNewMat({ ...newMat, sku: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    物料類別
                  </label>
                  <select
                    value={newMat.category}
                    onChange={(e) => setNewMat({ ...newMat, category: e.target.value as Material["category"] })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="raw_material">原材料 (Raw Material)</option>
                    <option value="component">零組件 (Component)</option>
                    <option value="packaging">包材 (Packaging)</option>
                    <option value="finished_product">產成品 (Finished Product)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  物料/產品名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 智慧車架鋰電池連接座"
                  value={newMat.name}
                  onChange={(e) => setNewMat({ ...newMat, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    初始庫存量
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMat.stock}
                    onChange={(e) => setNewMat({ ...newMat, stock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    單位 (Unit)
                  </label>
                  <input
                    type="text"
                    placeholder="例如: 個/台/組"
                    value={newMat.unit}
                    onChange={(e) => setNewMat({ ...newMat, unit: e.target.value || "個" })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    安全庫存量
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMat.safetyStock}
                    onChange={(e) => setNewMat({ ...newMat, safetyStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    進貨單價成本 (NT$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMat.unitCost}
                    onChange={(e) => setNewMat({ ...newMat, unitCost: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    倉庫儲位 (Location)
                  </label>
                  <input
                    type="text"
                    placeholder="例如: W1-A1"
                    value={newMat.location}
                    onChange={(e) => setNewMat({ ...newMat, location: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  主要供應商
                </label>
                <select
                  value={newMat.supplierId}
                  onChange={(e) => setNewMat({ ...newMat, supplierId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">未指定</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} (前置 {s.leadTime} 天)</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm shadow-xs cursor-pointer"
                >
                  確認建立
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Material */}
      {editingMaterial && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800">編輯物料檔案</h3>
              <button onClick={() => setEditingMaterial(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    物料編號 (SKU)
                  </label>
                  <input
                    type="text"
                    required
                    value={editingMaterial.sku}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, sku: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    物料類別
                  </label>
                  <select
                    value={editingMaterial.category}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, category: e.target.value as Material["category"] })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="raw_material">原材料 (Raw Material)</option>
                    <option value="component">零組件 (Component)</option>
                    <option value="packaging">包材 (Packaging)</option>
                    <option value="finished_product">產成品 (Finished Product)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  物料名稱
                </label>
                <input
                  type="text"
                  required
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    安全庫存量
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingMaterial.safetyStock}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, safetyStock: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    單位 (Unit)
                  </label>
                  <input
                    type="text"
                    value={editingMaterial.unit}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, unit: e.target.value || "個" })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    進貨單價成本 (NT$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingMaterial.unitCost}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, unitCost: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    倉庫儲位
                  </label>
                  <input
                    type="text"
                    value={editingMaterial.location}
                    onChange={(e) => setEditingMaterial({ ...editingMaterial, location: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  主要供應商
                </label>
                <select
                  value={editingMaterial.supplierId}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, supplierId: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">未指定</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMaterial(null)}
                  className="px-4 py-2 text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm shadow-xs cursor-pointer"
                >
                  儲存變更
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Quick Inventory Adjustment */}
      {adjustingMaterial && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800">快速調整庫存盤點</h3>
              <button onClick={() => setAdjustingMaterial(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">正在調整: {adjustingMaterial.name}</p>
                  <p className="mt-1">此操作將會在「異動日誌」自動生成一筆庫存盤盤進/盤出記錄，並修改系統庫存餘額。</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  目前系統量: <strong className="text-slate-700">{adjustingMaterial.stock} {adjustingMaterial.unit}</strong>
                </label>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-medium text-slate-500">修正後庫存：</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 border border-slate-200 rounded-lg p-2 text-sm text-center focus:outline-none focus:border-emerald-500 font-bold"
                  />
                  <span className="text-sm text-slate-500">{adjustingMaterial.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  調整原因/備註說明
                </label>
                <input
                  type="text"
                  placeholder="例如: 年度例行盤點、損耗報廢、採購入庫等..."
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingMaterial(null)}
                  className="px-4 py-2 text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm shadow-xs cursor-pointer"
                >
                  確認盤點
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
