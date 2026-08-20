import React, { useState, useEffect } from "react";
import { Material, ProductionOrder, Supplier } from "../types";
import { AlertTriangle, Package, Calendar, DollarSign, Brain, RefreshCw, Layers } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";

interface DashboardProps {
  materials: Material[];
  orders: ProductionOrder[];
  suppliers: Supplier[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ materials, orders, suppliers, onNavigate }: DashboardProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Compute stats
  const totalMaterials = materials.filter(m => m.category !== "finished_product").length;
  const totalProducts = materials.filter(m => m.category === "finished_product").length;
  
  // Shortages (stock < safetyStock)
  const shortageItems = materials.filter(m => m.stock < m.safetyStock);
  const criticalCount = shortageItems.length;

  const activeOrders = orders.filter(o => o.status === "production" || o.status === "material_check" || o.status === "pending").length;

  // Calculate inventory total cost value
  const totalValue = materials.reduce((acc, curr) => acc + curr.stock * curr.unitCost, 0);

  // Recharts Chart 1: Stock vs Safety Stock
  const stockChartData = materials
    .filter(m => m.category !== "finished_product")
    .map(m => ({
      name: m.name.split(" ")[0], // short name
      "實際庫存": m.stock,
      "安全庫存": m.safetyStock,
      isLow: m.stock < m.safetyStock
    }));

  // Recharts Chart 2: Category distribution
  const categoryCountMap = materials.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    raw_material: "原材料",
    component: "零組件",
    packaging: "包材",
    finished_product: "產成品"
  };

  const pieData = Object.entries(categoryCountMap).map(([cat, val]) => ({
    name: categoryLabels[cat] || cat,
    value: val
  }));

  const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#6366f1"];

  // Run AI Inventory Health Diagnosis
  const handleAiAnalyze = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("伺服器傳回非 JSON 格式回應。這通常是因為伺服器正在啟動中，請稍候 5-10 秒再試！");
      }

      const data = await res.json();
      if (res.ok && data.analysis) {
        setAiAnalysis(data.analysis);
      } else if (data.error) {
        setAiAnalysis(`AI 診斷失敗：${data.error}。請確認您的 GEMINI_API_KEY 是否有效。`);
      } else {
        setAiAnalysis("AI 診斷失敗：無法取得診斷報告。");
      }
    } catch (e: any) {
      setAiAnalysis(e.message || "無法連接 AI 伺服器，請確保 GEMINI_API_KEY 已正確設定，且伺服器目前處於運作狀態。");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">生產與庫存決策主儀表板</h1>
          <p className="text-sm text-slate-500 mt-1">
            即時監控物料庫存、評估安全備料、追蹤未完工單，並利用 AI 智慧進行缺料診斷。
          </p>
        </div>
        <button
          onClick={handleAiAnalyze}
          disabled={aiLoading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium px-4 py-2.5 rounded-lg shadow-sm transition-all duration-150 text-sm cursor-pointer"
        >
          {aiLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>AI 引擎分析中...</span>
            </>
          ) : (
            <>
              <Brain className="h-4 w-4" />
              <span>啟動 AI 庫存健康診斷</span>
            </>
          )}
        </button>
      </div>

      {/* Grid KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">原料與零組件</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{totalMaterials} 品項</h3>
            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              另有 <strong className="text-emerald-600">{totalProducts}</strong> 款成品管理中
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className={`bg-white p-5 rounded-xl border shadow-xs flex items-center gap-4 ${criticalCount > 0 ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
          <div className={`p-3 rounded-lg ${criticalCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">低於安全庫存</span>
            <h3 className={`text-2xl font-bold mt-0.5 ${criticalCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
              {criticalCount} 項警報
            </h3>
            {criticalCount > 0 ? (
              <button 
                onClick={() => onNavigate("materials")}
                className="text-xs text-red-600 font-medium hover:underline mt-0.5 text-left block"
              >
                立即查看缺料明細 →
              </button>
            ) : (
              <span className="text-xs text-slate-500 mt-0.5 block">所有物料存量充足</span>
            )}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">進行中生產工單</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">{activeOrders} 張訂單</h3>
            <button 
              onClick={() => onNavigate("production")}
              className="text-xs text-blue-600 font-medium hover:underline mt-0.5 text-left block"
            >
              追蹤投料與進度 →
            </button>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">庫存資產總估值</span>
            <h3 className="text-2xl font-bold text-slate-800 mt-0.5">NT$ {totalValue.toLocaleString()}</h3>
            <span className="text-xs text-slate-500 mt-0.5 block">
              基於進貨成本與數量累計
            </span>
          </div>
        </div>
      </div>

      {/* AI Diagnostic Area */}
      {(aiLoading || aiAnalysis) && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-6 border border-slate-800 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-bold tracking-tight">Gemini 智慧庫存與採購診斷報告</h2>
            </div>
            <button
              onClick={() => setAiAnalysis(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              關閉診斷
            </button>
          </div>

          {aiLoading ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3">
              <div className="relative w-10 h-10">
                <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-slate-700 animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-emerald-400 border-t-transparent animate-spin"></div>
              </div>
              <p className="text-sm text-slate-400 font-mono">
                [AI MRP Engine] 正在分析物料清單(BOM)與進行庫存動態模擬...
              </p>
              <div className="text-xs text-slate-500 max-w-md text-center">
                系統正在向 Gemini 提供您的安全庫存係數、工單預計投料日與供應商前置期，進行最佳化採購批量試算。
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-line font-sans">
              {aiAnalysis}
            </div>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Bar Stock vs Safety */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              材料現有量 vs 安全庫存對比
            </h2>
            <span className="text-xs text-slate-500">
              紅框或警報代表已達補貨臨界值
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stockChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
              >
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    border: "none"
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="實際庫存" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="安全庫存" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              物料品項類別分布
            </h2>
            <div className="h-48 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "8px",
                      color: "#f8fafc",
                      fontSize: "12px",
                      border: "none"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-xs text-slate-400 block">總品項</span>
                <span className="text-xl font-bold text-slate-700">
                  {materials.length}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                <span className="text-slate-600 font-medium">{item.name}</span>
                <span className="text-slate-400 font-mono">({item.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Critical Shortage List Panel */}
      {criticalCount > 0 && (
        <div className="bg-white rounded-xl border border-red-100 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-base font-bold tracking-tight">系統嚴重缺料示警 (物料現存量 &lt; 安全庫存)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-xs tracking-wider font-semibold uppercase">
                  <th className="py-2 px-3">物料編號</th>
                  <th className="py-2 px-3">物料名稱</th>
                  <th className="py-2 px-3">當前庫存</th>
                  <th className="py-2 px-3">安全庫存</th>
                  <th className="py-2 px-3">缺口量</th>
                  <th className="py-2 px-3">負責供應商</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {shortageItems.map(m => {
                  const sup = suppliers.find(s => s.id === m.supplierId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-500">{m.sku}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{m.name}</td>
                      <td className="py-2.5 px-3 text-red-600 font-semibold">{m.stock} {m.unit}</td>
                      <td className="py-2.5 px-3 text-slate-500">{m.safetyStock} {m.unit}</td>
                      <td className="py-2.5 px-3 font-mono text-red-600 font-medium">
                        -{m.safetyStock - m.stock} {m.unit}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {sup ? sup.name : "未指定"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
