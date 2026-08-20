import React, { useState } from "react";
import { Material, ProductionOrder } from "../types";
import { Plus, Check, Play, AlertTriangle, X, Calendar, Edit, MessageSquare, Archive, RefreshCw, Trash2 } from "lucide-react";

interface ProductionOrdersProps {
  materials: Material[];
  orders: ProductionOrder[];
  onCreateOrder: (order: { productId: string; quantity: number; scheduledDate: string; notes?: string }) => void;
  onUpdateOrder: (id: string, updates: Partial<ProductionOrder>) => void;
  onStartOrder: (id: string) => Promise<{ success?: boolean; warning?: string; error?: string; shortMaterials?: any[] }>;
  onCompleteOrder: (id: string) => void;
  onDeleteOrder: (id: string) => void;
}

export default function ProductionOrders({
  materials,
  orders,
  onCreateOrder,
  onUpdateOrder,
  onStartOrder,
  onCompleteOrder,
  onDeleteOrder
}: ProductionOrdersProps) {
  const finishedProducts = materials.filter((m) => m.category === "finished_product");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(finishedProducts[0]?.id || "");
  const [qty, setQty] = useState(10);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
 
  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [editProductId, setEditProductId] = useState("");
  const [editQty, setEditQty] = useState(10);
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const handleStartEdit = (order: ProductionOrder) => {
    setEditingOrder(order);
    setEditProductId(order.productId);
    setEditQty(order.quantity);
    setEditScheduledDate(order.scheduledDate);
    setEditNotes(order.notes || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    if (!editProductId || editQty <= 0) {
      alert("請填寫正確的產品及生產數量！");
      return;
    }
    const product = materials.find((m) => m.id === editProductId);
    if (!product) {
      alert("找不到所選產品！");
      return;
    }
    onUpdateOrder(editingOrder.id, {
      productId: editProductId,
      productName: product.name,
      quantity: Number(editQty),
      scheduledDate: editScheduledDate,
      notes: editNotes
    });
    setEditingOrder(null);
  };

  // Failure Warning Modal State
  const [shortageError, setShortageError] = useState<{
    msg: string;
    items: { name: string; required: number; current: number; unit: string }[];
  } | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || qty <= 0) {
      alert("請填寫正確的產品及生產數量！");
      return;
    }
    onCreateOrder({
      productId: selectedProductId,
      quantity: Number(qty),
      scheduledDate,
      notes
    });
    setIsCreateOpen(false);
    setQty(10);
    setNotes("");
  };

  const handleStartProduction = async (id: string) => {
    setShortageError(null);
    const result = await onStartOrder(id);
    if (result.error) {
      setShortageError({
        msg: result.error,
        items: result.shortMaterials || []
      });
    } else if (result.warning) {
      alert(result.warning);
    }
  };

  const handleProgressChange = (id: string, currentVal: number) => {
    const newVal = Math.min(95, currentVal + 15);
    onUpdateOrder(id, { progress: newVal });
  };

  const statusLabels: Record<string, string> = {
    pending: "備料待核",
    material_check: "缺料警戒",
    production: "投料生產中",
    completed: "完工結案",
    cancelled: "工單撤銷"
  };

  const statusBadgeColors: Record<string, string> = {
    pending: "bg-slate-50 text-slate-700 border-slate-200",
    material_check: "bg-red-50 text-red-700 border-red-200 animate-pulse",
    production: "bg-blue-50 text-blue-700 border-blue-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-slate-100 text-slate-400 border-slate-200"
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">生產工單管理 (Production Orders)</h2>
          <p className="text-xs text-slate-500 mt-0.5">開立新工單、進行材料可用性評估、投料排程並追蹤生產進度。</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>開立生產工單</span>
        </button>
      </div>

      {/* Warning/Shortage Modal Banner */}
      {shortageError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-800 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-sm text-red-700">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>{shortageError.msg}</span>
            </div>
            <button
              onClick={() => setShortageError(null)}
              className="text-red-500 hover:text-red-800 font-bold text-xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-red-600">
            物料清單(BOM)試算發現，以下關鍵原材料/零組件不足以支應本次開立之工單數量。請先辦理採購入庫或盤盈，方可啟動生產：
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-red-100 text-red-700 font-bold uppercase">
                  <th className="py-1 px-2">物料名稱</th>
                  <th className="py-1 px-2 text-center">工單所需總量</th>
                  <th className="py-1 px-2 text-center">當前可用庫存</th>
                  <th className="py-1 px-2 text-center">物料缺額</th>
                </tr>
              </thead>
              <tbody>
                {shortageError.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-red-50 text-red-600 font-medium">
                    <td className="py-1.5 px-2">{it.name}</td>
                    <td className="py-1.5 px-2 text-center">{it.required} {it.unit}</td>
                    <td className="py-1.5 px-2 text-center">{it.current} {it.unit}</td>
                    <td className="py-1.5 px-2 text-center font-bold font-mono text-red-700">
                      -{it.required - it.current} {it.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Orders Kanban / List Grid */}
      <div className="grid grid-cols-1 gap-4">
        {orders.length > 0 ? (
          orders.map((order) => {
            const isCompleted = order.status === "completed";
            const isProduction = order.status === "production";
            const isCancelled = order.status === "cancelled";
            const isShortage = order.status === "material_check";

            return (
              <div
                key={order.id}
                className={`bg-white rounded-xl border p-5 shadow-xs transition-all duration-150 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 ${
                  isProduction ? "border-blue-200 bg-blue-50/5" : "border-slate-100"
                }`}
              >
                {/* Info block */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-slate-400 text-xs">#{order.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border ${statusBadgeColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                    <span className="text-slate-400 text-xs flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3" />
                      預計排程: {order.scheduledDate}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800">{order.productName}</h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                    <span>計劃投料量：<strong className="text-slate-700">{order.quantity} 台/個</strong></span>
                    {order.completionDate && (
                      <span className="text-emerald-600 font-semibold">
                        完工結存日: {order.completionDate}
                      </span>
                    )}
                  </div>

                  {order.notes && (
                    <div className="flex items-start gap-1 text-xs text-slate-400">
                      <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>備註: {order.notes}</span>
                    </div>
                  )}
                </div>

                {/* Progress bar block */}
                <div className="w-full md:w-64 space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold">
                    <span>生產履歷進度</span>
                    <span className="font-mono">{order.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted ? "bg-emerald-500" : isCancelled ? "bg-slate-300" : "bg-blue-500"
                      }`}
                      style={{ width: `${order.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Controls block */}
                <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-50">
                  {/* Action 1: Issue Materials & Start Production */}
                  {(order.status === "pending" || order.status === "material_check") && (
                    <button
                      onClick={() => handleStartProduction(order.id)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>進行投料生產</span>
                    </button>
                  )}

                  {/* Action 2: Incremental progress and complete production */}
                  {order.status === "production" && (
                    <>
                      <button
                        onClick={() => handleProgressChange(order.id, order.progress)}
                        className="flex items-center gap-1 text-blue-700 border border-blue-200 hover:bg-blue-50 font-semibold text-xs px-2.5 py-2 rounded-lg transition-colors cursor-pointer"
                        title="增加生產進度"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>前進 15%</span>
                      </button>

                      <button
                        onClick={() => onCompleteOrder(order.id)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>完工入庫</span>
                      </button>
                    </>
                  )}

                  {/* Edit order button */}
                  {(order.status === "pending" || order.status === "material_check") && (
                    <button
                      onClick={() => handleStartEdit(order)}
                      className="text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-slate-100 hover:border-amber-100 p-2 rounded-lg transition-colors cursor-pointer"
                      title="修改工單內容"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Cancel order button */}
                  {(order.status === "pending" || order.status === "material_check") && (
                    <button
                      onClick={() => {
                        if (confirm("確認要撤銷此生產工單嗎？")) {
                          onUpdateOrder(order.id, { status: "cancelled" });
                        }
                      }}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 hover:border-red-100 p-2 rounded-lg transition-colors cursor-pointer"
                      title="撤銷工單"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Delete order button */}
                  {(order.status === "pending" || order.status === "material_check" || order.status === "cancelled" || order.status === "completed") && (
                    <button
                      onClick={() => {
                        if (confirm(`確定要【永久刪除】此生產工單 (#${order.id}) 嗎？此操作將無法復原！`)) {
                          onDeleteOrder(order.id);
                        }
                      }}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 border border-slate-100 hover:border-red-100 p-2 rounded-lg transition-colors cursor-pointer"
                      title="永久刪除工單"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isCompleted && (
                    <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 font-semibold px-3 py-2 rounded-lg">
                      <Archive className="h-3.5 w-3.5" />
                      <span>產成品已入庫</span>
                    </div>
                  )}

                  {isCancelled && (
                    <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-50 border border-slate-100 font-semibold px-3 py-2 rounded-lg">
                      <span>工單已撤銷</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 p-8 text-center text-slate-400">
            目前無開立任何生產工單。
          </div>
        )}
      </div>

      {/* Modal: Create Production Order */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800 font-sans text-sm">開立生產工單</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  選擇要生產的成品項目 *
                </label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500 font-medium text-slate-700"
                >
                  <option value="" disabled>請選擇產品...</option>
                  {finishedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    計劃生產量 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    預計生產日期
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  工單備註與技術說明
                </label>
                <textarea
                  rows={3}
                  placeholder="請填寫此生產工單的客製化要求、備註或緊急等級說明..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-emerald-500 resize-none placeholder-slate-400"
                />
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
                  確認開單
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Production Order */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-100">
              <h3 className="font-bold text-slate-800 font-sans text-sm">修改生產工單 #{editingOrder.id}</h3>
              <button onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  選擇要生產的成品項目 *
                </label>
                <select
                  required
                  value={editProductId}
                  onChange={(e) => setEditProductId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-amber-500 font-medium text-slate-700"
                >
                  <option value="" disabled>請選擇產品...</option>
                  {finishedProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    計劃生產量 *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editQty}
                    onChange={(e) => setEditQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    預計生產日期
                  </label>
                  <input
                    type="date"
                    required
                    value={editScheduledDate}
                    onChange={(e) => setEditScheduledDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  工單備註與技術說明
                </label>
                <textarea
                  rows={3}
                  placeholder="請填寫此生產工單的客製化要求、備註或緊急等級說明..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-amber-500 resize-none placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-lg text-sm cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm shadow-xs cursor-pointer font-medium"
                >
                  儲存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
