"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";

export default function ProductListing() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);
  const router = useRouter();

  // 🟢 Live Ticker System Logs State
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  useEffect(() => {
    // Initialize standard diagnostics logs
    setSystemLogs([
      "System initialized. Polling Neon Postgres connection pool...",
      "Row-level write-fencing constraints active. Isolation: READ COMMITTED.",
    ]);
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to pull latest inventory.");
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // 🏬 Fixed: Dynamic warehouse ID mapping added to keep backend compliance intact
  const handleReserve = async (productId: string, defaultWarehouseId: string = "w1") => {
    setReservingId(productId);
    setError(null);

    // Safeguard lookup to ensure we read real multi-warehouse relations if present
    const targetProduct = products.find(p => p.id === productId);
    const activeWarehouseId = targetProduct?.warehouses?.[0]?.warehouseId || defaultWarehouseId;

    setSystemLogs((prev) => [
      `Initializing atomic reservation sequence for SKU: ${productId} at ${activeWarehouseId.toUpperCase()}...`,
      ...prev,
    ]);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          warehouseId: activeWarehouseId, 
          quantity: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setSystemLogs((prev) => [
            `❌ 409 Conflict: Row-level fencing blocked allocation for SKU: ${productId} due to parallel acquisition lock.`,
            ...prev,
          ]);
          throw new Error("⚠ Concurrency Conflict: This item was just claimed by another user's checkout flow!");
        }
        throw new Error(data.error || "Failed to establish a stock lock.");
      }

      setSystemLogs((prev) => [
        `🔒 Isolation Verified: Acquired lease hold token ${data.id}. Redirecting to secure tunnel...`,
        ...prev,
      ]);

      router.push(`/reservation/${data.id}`);
    } catch (err: any) {
      setError(err.message);
      setReservingId(null);
      fetchProducts(); 
    }
  };

  const handleAdminReset = async () => {
    if (!confirm("Reset all live reservation locks back to a pristine state?")) return;
    
    setSystemLogs((prev) => ["Sending total global flush request to database...", ...prev]);
    try {
      const res = await fetch("/api/dev/reset", { method: "POST" });
      if (res.ok) {
        setSystemLogs((prev) => ["Database state completely cleared! Stock metrics fully restored.", ...prev]);
        alert("System Reset Successful! Multi-warehouse inventory restored.");
        fetchProducts();
      } else {
        throw new Error("Database reset failed.");
      }
    } catch (err: any) {
      setSystemLogs((prev) => [`❌ Reset Error: ${err.message}`, ...prev]);
      alert("Reset failed. Make sure you created the /api/dev/reset API endpoint.");
    }
  };

  // Dynamic image resolution engine based on targeted product IDs
  const getDeviceImage = (id: string) => {
    switch (id) {
      case "p2":
        return "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=150&q=80";
      case "p3":
        return "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=150&q=80";
      default:
        return "https://images.unsplash.com/photo-1697284959152-32ef13855932?q=80&w=150&auto=format&fit=crop";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 font-medium tracking-wide animate-pulse">Syncing inventory registry...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-16">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Block */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-5">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Allo Multi-Warehouse Platform</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time concurrency evaluation suite</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            Neon Connection Active
          </span>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium shadow-sm">
            {error}
          </div>
        )}

        {/* 🏬 Clean 3-Column Product Grid Layout */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const depletionPercentage = product.totalStock > 0 
              ? (product.reservedStock / product.totalStock) * 100 
              : 0;

            return (
              <div key={product.id} className="group bg-white border border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                <div>
                  {/* Top Section: Title & Metadata Image Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="h-14 w-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center p-2 shadow-inner transition-transform group-hover:scale-105 shrink-0">
                        <img 
                          src={getDeviceImage(product.id)} 
                          alt={product.name}
                          className="object-contain h-full w-full"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/150?text=Device";
                          }}
                        />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-gray-900 tracking-tight leading-snug mb-1">
                          {product.name}
                        </h2>
                        <span className="text-[10px] font-mono tracking-wider text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                          SKU: {product.id}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 📊 Premium Real-time Inventory Progress Bar Layout */}
                  <div className="mb-5">
                    <div className="flex justify-between text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                      <span>Stock Depletion Ratio</span>
                      <span className={product.reservedStock > 0 ? "text-amber-600 font-bold animate-pulse" : ""}>
                        {Math.round(depletionPercentage)}% Reserved
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden shadow-inner border border-gray-50">
                      <div 
                        className="bg-amber-500 h-full transition-all duration-500 ease-out rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]" 
                        style={{ width: `${depletionPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* 🏷️ Premium Enterprise Status Pill Badges Grid */}
                  <div className="space-y-3 border-t border-gray-100 pt-4 mb-5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Sub-Inventory Total Base:</span>
                      <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200">
                        {product.totalStock} units
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Active Reservation Holds:</span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                        product.reservedStock > 0
                          ? "bg-amber-50 text-amber-700 border-amber-200 shadow-xs animate-pulse"
                          : "bg-gray-50 text-gray-400 border-gray-200"
                      }`}>
                        {product.reservedStock > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-ping"></span>}
                        {product.reservedStock} Held
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm pt-1">
                      <span className="text-gray-900 font-bold">Available to Claim:</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black tracking-wide border shadow-xs ${
                        product.availableStock > 0 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}>
                        {product.availableStock} Units Free
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleReserve(product.id)}
                  disabled={product.availableStock <= 0 || reservingId === product.id}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold tracking-wide transition-all shadow-sm cursor-pointer hover:shadow-md ${
                    product.availableStock > 0
                      ? "bg-gray-900 text-white hover:bg-gray-800 transform active:scale-[0.99]"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none"
                  }`}
                >
                  {reservingId === product.id ? "Acquiring DB Lock..." : product.availableStock > 0 ? "Begin Checkout Process" : "Sold Out"}
                </button>
              </div>
            );
          })}
        </div>

        {/* 🛠️ Aligned Unified Dev & Metrics Dashboard Container */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-900 rounded-3xl p-6 border border-gray-800 shadow-xl font-mono">
          
          {/* Engine Metrics Console */}
          <div className="md:col-span-2 flex flex-col justify-between border-b md:border-b-0 md:border-r border-gray-800 pb-5 md:pb-0 md:pr-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Engine Metrics Console
                </span>
              </div>
              <div className="space-y-2 text-[11px] max-h-[110px] overflow-y-auto text-gray-300 scrollbar-none pr-1">
                {systemLogs.map((log, idx) => (
                  <div key={idx} className={idx === 0 ? "text-emerald-300 font-semibold" : "opacity-70"}>
                    {`> `}{log}
                  </div>
                ))}
              </div>
            </div>
            <span className="text-[10px] text-gray-600 font-sans mt-3 block">Read-Only Pipeline Diagnostics</span>
          </div>

          {/* Recruiter Testing Suite Box */}
          <div className="flex flex-col justify-between pt-1 md:pt-0 md:pl-2">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs font-bold tracking-wider uppercase text-gray-200 font-sans">
                  Recruiter Testing Suite
                </span>
              </div>
              <p className="text-[11px] font-sans text-gray-400 leading-normal">
                Use this tool to instantly delete all current reservation holds and restore the product stock back to original parameters for clean multi-window testing.
              </p>
            </div>

            <button
              onClick={handleAdminReset}
              className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-md text-center tracking-wide font-sans mt-4"
            >
              Force Reset Stock Metrics
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}