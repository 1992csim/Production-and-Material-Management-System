import React, { useState } from "react";
import { InventoryLog, Material } from "../types";
import { Search, ArrowDownRight, ArrowUpRight, ShieldCheck, Trash2, RefreshCw, AlertTriangle } from "lucide-react";

interface LogsViewerProps {
  logs: InventoryLog[];
  materials: Material[];
  onDeleteLog: (id: string) => Promise<void>;
  onCleanupLogs: () => Promise<any>;
  user: any;
}

export default function LogsViewer({ logs, materials, onDeleteLog, onCleanupLogs, user }: LogsViewerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isCleaning, setIsCleaning] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Map to check if material still exists
  const materialIds = new Set(materials.map((m) => m.id));
  const orphanedCount = logs.filter((log) => !materialIds.has(log.materialId)).length;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.materialName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.notes && log.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (log.referenceId && log.referenceId.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === "all" || log.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleCleanup = async () => {
    if (!user) {
      alert("目前為唯讀模式，請先登入 Google 帳號！");
      return;
    }
    if (confirm(`確認要清理所有已刪除材料的異動日誌嗎？這將會刪除共 ${orphanedCount} 筆失效紀錄且無法復原。`)) {
      try {
        setIsCleaning(true);
        await onCleanupLogs();
        alert("同步清理失效日誌完成！");
      } catch (error: any) {
        alert(error.message || "清理失敗，請稍後再試！");
      } finally {
        setIsCleaning(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      alert("目前為唯讀模式，請先登入 Google 帳號！");
      return;
    }
    if (confirm(`確認要刪除日誌編號 ${id} 的紀錄嗎？此動作將無法復原。`)) {
      try {
        setDeletingId(id);
        await onDeleteLog(id);
      } catch (error: any) {
        alert(error.message || "刪除失敗，請稍後再試！");
      } finally {
        setDeletingId(null);
      }
    }
  };

  const typeLabels: Record<string, string> = {
    inbound: "進貨/完工入庫",
    outbound: "領料/投料出庫",
    adjustment: "手動盤點調整"
  };

  const typeBadgeColors: Record<string, string> = {
    inbound: "bg-emerald-50 text-emerald-700 border-emerald-100",
    outbound: "bg-blue-50 text-blue-700 border-blue-100",
    adjustment: "bg-amber-50 text-amber-700 border-amber-100"
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜尋材料名稱、工單號、交易單號、備註..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-emerald-500"
          >
            <option value="all">所有異動類別 (All Transactions)</option>
            <option value="inbound">進庫 (Inbound)</option>
            <option value="outbound">出庫 (Outbound)</option>
            <option value="adjustment">盤點調整 (Adjustment)</option>
          </select>
        </div>

        {/* Sync Cleanup Button & Audit Info */}
        <div className="flex flex-wrap items-center gap-3">
          {orphanedCount > 0 && (
            <button
              onClick={handleCleanup}
              disabled={isCleaning || !user}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                user
                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                  : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
              }`}
              title={user ? "清除所有已刪除物料的日誌" : "唯讀模式：登入後可進行清理"}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isCleaning ? "animate-spin" : ""}`} />
              <span>同步清理失效日誌 ({orphanedCount})</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold border border-slate-100 rounded-lg p-2 bg-slate-50">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>生產材料異動審計日誌已啟用</span>
          </div>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">日誌編號</th>
                <th className="py-3 px-4">時間戮記</th>
                <th className="py-3 px-4">異動對象材料名稱</th>
                <th className="py-3 px-4">交易類別</th>
                <th className="py-3 px-4 text-center">異動數量</th>
                <th className="py-3 px-4">關聯工單</th>
                <th className="py-3 px-4">備註細節</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const isInbound = log.type === "inbound";
                  const isOutbound = log.type === "outbound";
                  const isOrphan = !materialIds.has(log.materialId);
                  
                  return (
                    <tr key={log.id} className={`hover:bg-slate-50/20 transition-colors ${isOrphan ? "bg-red-50/10" : ""}`}>
                      <td className="py-3 px-4 font-mono text-slate-400 text-xs font-bold">
                        {log.id}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-xs">
                        {new Date(log.date).toLocaleString("zh-TW")}
                      </td>
                      <td className="py-3 px-4 text-slate-800 text-xs font-bold">
                        <div className="flex flex-col">
                          <span>{log.materialName}</span>
                          {isOrphan && (
                            <span className="inline-flex items-center gap-1 text-red-500 text-[10px] font-normal mt-0.5">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              此物料已在系統中被刪除 (已失效)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-bold border ${typeBadgeColors[log.type]}`}>
                          {isInbound && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                          {isOutbound && <ArrowDownRight className="h-3 w-3 text-blue-500" />}
                          <span>{typeLabels[log.type]}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-mono font-bold ${isInbound ? "text-emerald-600" : isOutbound ? "text-blue-600" : "text-amber-600"}`}>
                          {isInbound ? "+" : isOutbound ? "-" : ""}
                          {log.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {log.referenceId ? (
                          <span className="font-mono text-xxs font-bold text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                            {log.referenceId}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal italic">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {log.notes || "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {user ? (
                          <button
                            onClick={() => handleDelete(log.id)}
                            disabled={deletingId === log.id}
                            className="p-1 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-md transition-colors border border-slate-100 disabled:opacity-50"
                            title="刪除此筆日誌"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-xxs text-slate-300 italic">唯讀</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                    目前尚無任何符合條件的材料異動歷史紀錄。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
