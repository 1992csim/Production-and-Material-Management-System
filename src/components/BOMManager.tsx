import React, { useState } from "react";
import { Material, BOM, BOMItem } from "../types";
import { Plus, Trash2, Brain, Save, CheckCircle, HelpCircle, Loader2, RefreshCw, Printer } from "lucide-react";

interface BOMManagerProps {
  materials: Material[];
  boms: BOM[];
  onSaveBOM: (productId: string, items: BOMItem[]) => void;
  onCreateMaterial: (material: Omit<Material, "id">) => Promise<Material>;
  user?: any;
}

export default function BOMManager({ materials, boms, onSaveBOM, onCreateMaterial, user }: BOMManagerProps) {
  const finishedProducts = materials.filter(m => m.category === "finished_product");
  const availableComponents = materials.filter(m => m.category !== "finished_product");

  const [selectedProductId, setSelectedProductId] = useState<string>(finishedProducts[0]?.id || "");
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // States for AI BOM Assistant
  const [aiProductName, setAiProductName] = useState("");
  const [aiProductDesc, setAiProductDesc] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{
    suggestedItems: {
      name: string;
      category: 'raw_material' | 'component' | 'packaging';
      quantity: number;
      unit: string;
      estCost: number;
      reason: string;
    }[];
    engineerSummary: string;
  } | null>(null);

  // Sync state when selected product changes
  React.useEffect(() => {
    if (selectedProductId) {
      const activeBom = boms.find(b => b.productId === selectedProductId);
      if (activeBom) {
        setBomItems([...activeBom.items]);
      } else {
        setBomItems([]);
      }
    }
  }, [selectedProductId, boms]);

  // Handle items modification
  const handleAddRow = () => {
    if (availableComponents.length === 0) return;
    setBomItems([...bomItems, { materialId: availableComponents[0].id, quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...bomItems];
    updated.splice(index, 1);
    setBomItems(updated);
  };

  const handleItemChange = (index: number, field: keyof BOMItem, value: any) => {
    const updated = [...bomItems];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setBomItems(updated);
  };

  const handleSave = () => {
    if (!selectedProductId) return;
    onSaveBOM(selectedProductId, bomItems);
    setSuccessMsg("物料清單 (BOM) 已成功儲存並同步至配配料庫！");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Run AI BOM suggested recipe
  const handleAiSuggestBOM = async () => {
    if (!aiProductName) {
      alert("請輸入您要開發設計的新產品名稱！");
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/gemini/suggest-bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName: aiProductName, description: aiProductDesc })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`伺服器傳回非 JSON 格式回應 (狀態碼 ${res.status})。這通常是因為伺服器正在啟動中，請稍候 5-10 秒再試！`);
      }

      const data = await res.json();
      if (res.ok && data.suggestedItems) {
        setAiResult(data);
      } else if (data.error) {
        alert(`AI 服務發生錯誤：${data.error}\n\n請確認您的 GEMINI_API_KEY 是否有效，可在 [Settings > Secrets] 面板中重新檢查或設定。`);
      } else {
        alert("AI 配料生成失敗，請稍後再試。");
      }
    } catch (e: any) {
      alert(e.message || "伺服器連線失敗。請確認已設定 GEMINI_API_KEY，且伺服器目前處於正常運作狀態。");
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-provision AI suggested materials & Save BOM
  const handleProvisionAiBOM = async () => {
    if (!aiResult) return;
    if (confirm(`確認要一鍵在系統建立新產品「${aiProductName}」與其建議物料檔，並自動綁定 BOM 嗎？`)) {
      setAiLoading(true);
      try {
        // 1. Create the Finished Product first
        const newFinishedProd = await onCreateMaterial({
          sku: `PROD-${aiProductName.toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
          name: aiProductName,
          category: "finished_product",
          stock: 0,
          unit: "台",
          safetyStock: 5,
          unitCost: aiResult.suggestedItems.reduce((acc, curr) => acc + (curr.estCost * curr.quantity), 0) + 1200, // Cost + estimated labor markup
          location: "W1-TEMP",
          supplierId: ""
        });

        // 2. Create each suggested raw material / component
        const createdBOMItems: BOMItem[] = [];
        for (const item of aiResult.suggestedItems) {
          // Generate a distinctive SKU prefix
          const skuPrefix = item.category === "raw_material" ? "RAW" : item.category === "packaging" ? "PKG" : "COMP";
          const createdMat = await onCreateMaterial({
            sku: `${skuPrefix}-${item.name.toUpperCase().slice(0, 4)}-${Math.floor(100 + Math.random() * 900)}`,
            name: item.name,
            category: item.category,
            stock: 30, // Default some initial stock so user can play with production order right away!
            unit: item.unit,
            safetyStock: 10,
            unitCost: item.estCost,
            location: "W2-TEMP",
            supplierId: ""
          });
          createdBOMItems.push({
            materialId: createdMat.id,
            quantity: item.quantity
          });
        }

        // 3. Save the BOM linking them
        onSaveBOM(newFinishedProd.id, createdBOMItems);

        // Switch active tab/product view to this newly created product
        setSelectedProductId(newFinishedProd.id);
        
        alert(`一鍵導入成功！已建立成品「${aiProductName}」與 ${aiResult.suggestedItems.length} 種物料，並已設定對應物料清單(BOM)。初始原物料已自動配撥 30 單位！`);
        setAiResult(null);
        setAiProductName("");
        setAiProductDesc("");
      } catch (error) {
        alert("建立過程中發生錯誤：" + error);
      } finally {
        setAiLoading(false);
      }
    }
  };

  const selectedProduct = finishedProducts.find(p => p.id === selectedProductId);

  // Calculate standard single finished product cost based on BOM quantities
  const calculatedUnitCost = bomItems.reduce((sum, item) => {
    const mat = materials.find(m => m.id === item.materialId);
    if (mat) {
      return sum + (mat.unitCost * item.quantity);
    }
    return sum;
  }, 0);

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
      {/* BOM Configuration Left Panel */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">物料清單 (BOM) 配置器</h2>
            <p className="text-xs text-slate-500 mt-1">選定您的成品，設定其生產單個成品所需的原物料配料比例。</p>
          </div>
          {successMsg && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 font-medium">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Finished Product Selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              產成品對象 (Finished Product)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500 font-medium"
            >
              <option value="" disabled>請選擇成品項目...</option>
              {finishedProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-xs text-slate-600 self-stretch flex items-center">
            <div>
              <span className="block font-semibold text-slate-400 uppercase tracking-wider">配料標準成本累計</span>
              <span className="text-sm font-bold text-slate-800 mt-0.5">
                NT$ {calculatedUnitCost.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ 每台</span>
              </span>
            </div>
          </div>
        </div>

        {/* BOM items editor table */}
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-4">項次</th>
                <th className="py-2.5 px-4">選擇原料/組件</th>
                <th className="py-2.5 px-4">原物料規格與分類</th>
                <th className="py-2.5 px-4 text-center w-36">投料用量 (每單位成品)</th>
                <th className="py-2.5 px-4 text-right">原料單價成本</th>
                <th className="py-2.5 px-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bomItems.map((item, index) => {
                const materialObj = materials.find(m => m.id === item.materialId);
                return (
                  <tr key={index} className="hover:bg-slate-50/20">
                    <td className="py-3 px-4 font-mono text-slate-400 font-medium text-xs">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={item.materialId}
                        onChange={(e) => handleItemChange(index, "materialId", e.target.value)}
                        className="border border-slate-200 rounded-lg p-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500 max-w-xs"
                      >
                        {availableComponents.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs font-medium">
                      {materialObj ? (
                        <div className="space-y-0.5">
                          <div>SKU: <span className="font-mono font-semibold">{materialObj.sku}</span></div>
                          <div className="text-slate-400 text-xxs border border-slate-100 rounded-sm px-1 inline-block bg-slate-50">
                            {materialObj.category === "raw_material" ? "原材料" : materialObj.category === "packaging" ? "包材" : "零組件"}
                          </div>
                        </div>
                      ) : "未載入"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, "quantity", Math.max(0.01, parseFloat(e.target.value) || 1))}
                          className="w-20 border border-slate-200 rounded-lg p-1 text-center text-xs focus:outline-none focus:border-emerald-500 font-bold font-mono"
                        />
                        <span className="text-slate-400 text-xs">{materialObj?.unit || "個"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {materialObj ? `NT$ ${materialObj.unitCost}` : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRemoveRow(index)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {bomItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                    目前尚未設定配料。請點選下方按鈕新增用料。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* BOM Action Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-50">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold text-xs border border-emerald-200 hover:bg-emerald-50/50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>新增用料項目</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              disabled={!selectedProductId || bomItems.length === 0}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-xs transition-colors cursor-pointer border border-slate-700 disabled:border-transparent"
              title="列印備料單與倉庫撿料單"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>列印備料單</span>
            </button>

            <button
              onClick={handleSave}
              disabled={!selectedProductId}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>儲存 BOM 配置</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI BOM Recipe Assistant Panel Right */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Brain className="h-5 w-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold tracking-tight">AI 智慧研發與 BOM 產生器</h2>
            <p className="text-xxs text-slate-400 mt-0.5">輸入欲研發的新產品，AI 自動建議關鍵用料配比！</p>
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3">
          <div>
            <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">
              新產品名稱 (Product Name)
            </label>
            <input
              type="text"
              placeholder="例如: 智慧溫控感應保溫杯"
              value={aiProductName}
              onChange={(e) => setAiProductName(e.target.value)}
              disabled={aiLoading}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">
              產品描述/功能特點 (Description)
            </label>
            <textarea
              rows={2}
              placeholder="例如: 具備藍牙連線、手機 App 溫度調節、高質感不鏽鋼真空雙層與 15W 快速無線充電底座。"
              value={aiProductDesc}
              onChange={(e) => setAiProductDesc(e.target.value)}
              disabled={aiLoading}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500 resize-none"
            />
          </div>

          <button
            onClick={handleAiSuggestBOM}
            disabled={aiLoading || !aiProductName}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 font-bold py-2 px-3 rounded-lg text-xs text-slate-900 transition-colors shadow-sm cursor-pointer"
          >
            {aiLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>AI 設計大師配置配料中...</span>
              </>
            ) : (
              <>
                <Brain className="h-3.5 w-3.5" />
                <span>利用 AI 自動規劃配料 BOM</span>
              </>
            )}
          </button>
        </div>

        {/* AI suggested results render */}
        {aiResult && (
          <div className="space-y-3 pt-3 border-t border-slate-800 max-h-96 overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              AI 建議關鍵配料清單：
            </h3>

            <div className="space-y-2">
              {aiResult.suggestedItems.map((item, idx) => (
                <div key={idx} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-100">{item.name}</span>
                    <span className="text-xxs border border-emerald-500/30 text-emerald-400 bg-emerald-950/40 rounded-sm px-1 font-semibold">
                      {item.category === "raw_material" ? "原材料" : item.category === "packaging" ? "包材" : "零組件"}
                    </span>
                  </div>
                  <div className="text-xxs text-slate-400 flex justify-between font-mono">
                    <span>標準用量: {item.quantity} {item.unit}</span>
                    <span>單價成本: NT$ {item.estCost}</span>
                  </div>
                  <p className="text-slate-400 text-xxs font-sans leading-relaxed pt-1 border-t border-slate-700/50">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>

            {/* Engineer Summary Comments */}
            <div className="bg-slate-800/50 border border-slate-800 p-2.5 rounded-lg">
              <span className="text-xxs font-bold text-emerald-400 block uppercase tracking-wider mb-1">
                量產與工程師製程點評
              </span>
              <p className="text-xxs text-slate-300 leading-relaxed font-sans italic">
                "{aiResult.engineerSummary}"
              </p>
            </div>

            {/* Complete Setup Trigger */}
            <button
              onClick={handleProvisionAiBOM}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-900 font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-md transform active:scale-98 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
              <span>一鍵建立產品並自動配料 BOM</span>
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Printable Material Picking Bill Layout */}
      <div className="print-only font-sans text-slate-900 bg-white p-6 space-y-6">
        {/* Title & Metadata Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">
              生產與材料管理系統 (ERP-Lite)
            </h1>
            <h2 className="text-lg font-bold text-slate-700 mt-1">
              產成品物料備料單 (BOM Picking List)
            </h2>
          </div>
          <div className="text-right text-xs font-mono text-slate-500 space-y-1">
            <div>列印時間: {new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}</div>
            <div>經辦人員: {user?.displayName || "系統操作員"} ({user?.email || "系統離線模式"})</div>
            <div className="font-bold text-slate-800">單據編號: BOM-PICK-{selectedProduct?.id || "TEMP"}-{Date.now().toString().slice(-6)}</div>
          </div>
        </div>

        {/* Main Info Card */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">產成品名稱 (Finished Product)</span>
            <span className="text-base font-bold text-slate-800 mt-0.5 inline-block">{selectedProduct?.name || "未指定成品"}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">產品規格 SKU</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 inline-block font-mono">{selectedProduct?.sku || "N/A"}</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">累計標準成本 (預估)</span>
              <span className="text-sm font-semibold text-slate-800 mt-0.5 inline-block font-mono">NT$ {calculatedUnitCost.toLocaleString()} 元 / 每單位</span>
            </div>
          </div>
        </div>

        {/* Table of BOM items */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-2">配料與撿料細目 (Picking Details)</h3>
          <table className="w-full text-left text-xs text-slate-700 border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-bold uppercase">
                <th className="py-2 px-3 border border-slate-300 w-12 text-center">項次</th>
                <th className="py-2 px-3 border border-slate-300">物料名稱</th>
                <th className="py-2 px-3 border border-slate-300">規格 SKU</th>
                <th className="py-2 px-3 border border-slate-300 w-24 text-center">物料分類</th>
                <th className="py-2 px-3 border border-slate-300 w-28 text-center">單個成品用量</th>
                <th className="py-2 px-3 border border-slate-300 w-24 text-center">儲位 location</th>
                <th className="py-2 px-3 border border-slate-300 w-28 text-center">目前在庫</th>
                <th className="py-2 px-3 border border-slate-300 w-28 text-center">實領數量簽章</th>
              </tr>
            </thead>
            <tbody>
              {bomItems.map((item, idx) => {
                const matObj = materials.find(m => m.id === item.materialId);
                return (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-2 px-3 border border-slate-300 text-center font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 border border-slate-300 font-semibold">{matObj?.name || "未知物料"}</td>
                    <td className="py-2 px-3 border border-slate-300 font-mono">{matObj?.sku || "N/A"}</td>
                    <td className="py-2 px-3 border border-slate-300 text-center">
                      {matObj?.category === "raw_material" ? "原材料" : matObj?.category === "packaging" ? "包材" : "零組件"}
                    </td>
                    <td className="py-2 px-3 border border-slate-300 text-center font-bold font-mono">
                      {item.quantity} {matObj?.unit || "個"}
                    </td>
                    <td className="py-2 px-3 border border-slate-300 text-center font-bold text-slate-800 bg-amber-50/20">
                      {matObj?.location || "未定位"}
                    </td>
                    <td className="py-2 px-3 border border-slate-300 text-center font-mono">
                      {matObj ? `${matObj.stock} ${matObj.unit}` : "0"}
                    </td>
                    <td className="py-2 px-3 border border-slate-300 text-center text-slate-300">
                      [ &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; ]
                    </td>
                  </tr>
                );
              })}
              {bomItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-slate-400">
                    本成品目前無物料配料明細。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures area */}
        <div className="grid grid-cols-3 gap-8 pt-10">
          <div className="border-t border-dashed border-slate-400 pt-2 text-center text-xs">
            <span className="block font-bold text-slate-500">領料人員簽章</span>
            <span className="block text-slate-300 mt-6">(簽名 / 日期)</span>
          </div>
          <div className="border-t border-dashed border-slate-400 pt-2 text-center text-xs">
            <span className="block font-bold text-slate-500">配料發料人員簽章</span>
            <span className="block text-slate-300 mt-6">(簽名 / 日期)</span>
          </div>
          <div className="border-t border-dashed border-slate-400 pt-2 text-center text-xs">
            <span className="block font-bold text-slate-500">庫管主管審核</span>
            <span className="block text-slate-300 mt-6">(核章)</span>
          </div>
        </div>

        {/* Print Footer Notice */}
        <div className="text-center text-xxs text-slate-400 pt-4 border-t border-slate-100 font-sans">
          本單據由 ERP-Lite 智慧材料管理系統自動生成，列印供現場配料及庫房備料發料核對使用。
        </div>
      </div>
    </>
  );
}
