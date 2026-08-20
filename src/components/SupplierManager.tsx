import React, { useState } from "react";
import { Supplier, Material } from "../types";
import { Plus, User, Mail, Clock, Star, Phone, X, ShieldCheck } from "lucide-react";

interface SupplierManagerProps {
  suppliers: Supplier[];
  materials: Material[];
  onCreateSupplier: (supplier: Omit<Supplier, "id">) => void;
}

export default function SupplierManager({ suppliers, materials, onCreateSupplier }: SupplierManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Create form states
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [leadTime, setLeadTime] = useState(5);
  const [rating, setRating] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contact) {
      alert("請輸入供應商名稱及聯絡人！");
      return;
    }
    onCreateSupplier({
      name,
      contact,
      email,
      leadTime,
      rating
    });
    setIsCreateOpen(false);
    setName("");
    setContact("");
    setEmail("");
    setLeadTime(5);
    setRating(5);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">主要物料供應商 (Suppliers Directory)</h2>
          <p className="text-xs text-slate-500 mt-0.5">追蹤供應商評等、交期前置時間(Lead Time)及業務窗口，建立穩定供應鏈體系。</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>建檔新供應商</span>
        </button>
      </div>

      {/* Suppliers Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {suppliers.map((sup) => {
          // Find which materials belong to this supplier
          const supplierMaterials = materials.filter((m) => m.supplierId === sup.id);

          return (
            <div key={sup.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono text-xxs font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                      ID: {sup.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 mt-1.5">{sup.name}</h3>
                  </div>
                  <div className="flex items-center text-amber-500 bg-amber-50/50 border border-amber-100 px-2 py-0.5 rounded text-xs font-semibold gap-0.5">
                    <Star className="h-3 w-3 fill-amber-500" />
                    <span>{sup.rating}.0</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 font-medium pt-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="h-3.5 w-3.5" />
                    <span>窗口: <strong className="text-slate-800">{sup.contact}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    <span>信箱: <span className="font-mono text-slate-800">{sup.email || "無"}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>平均交期: <strong className="text-emerald-600">{sup.leadTime} 天</strong></span>
                  </div>
                </div>
              </div>

              {/* Tagging section showing items */}
              <div className="border-t border-slate-50 pt-3">
                <span className="text-xxs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  供應關鍵材料 ({supplierMaterials.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {supplierMaterials.length > 0 ? (
                    supplierMaterials.map((m) => (
                      <span
                        key={m.id}
                        className="text-xxs font-medium bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-sm"
                        title={m.name}
                      >
                        {m.name.split(" ")[0]}
                      </span>
                    ))
                  ) : (
                    <span className="text-xxs text-slate-400 italic">無綁定材料</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create Supplier */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">新增供應商資料</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  供應商企業名稱 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如: 台灣精工精密齒輪"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    聯絡窗口人員 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如: 李經理"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    交期前置天數 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={leadTime}
                    onChange={(e) => setLeadTime(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  通訊電子信箱 (E-mail)
                </label>
                <input
                  type="email"
                  placeholder="例如: service@precision.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  供應商可靠度星等評分
                </label>
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-emerald-500 font-bold text-amber-600"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5/5 推薦交貨無誤)</option>
                  <option value={4}>⭐⭐⭐⭐ (4/5 品質良好交期穩定)</option>
                  <option value={3}>⭐⭐⭐ (3/5 一般普通)</option>
                  <option value={2}>⭐⭐ (2/5 交期偶有延誤)</option>
                  <option value={1}>⭐ (1/5 異常頻繁不推薦)</option>
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
                  存檔新增
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
