"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stock = {
  warehouseId: string;
  totalQty: number;
  reservedQty: number;
};

type Product = {
  id: string;
  name: string;
  stocks: Stock[];
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts);
  }, []);

  const reserve = async (productId: string, warehouseId: string) => {
    const res = await fetch("/api/reservations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
    });

    const data = await res.json();
    if (!res.ok) return alert(data.error);

    router.push(`/reservation/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-10">
      <h1 className="text-3xl font-semibold mb-8">
        Inventory Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-2xl border shadow-sm p-6"
          >
            <h2 className="text-xl font-medium">{p.name}</h2>

            <div className="mt-4 space-y-3">
              {(p.stocks ?? []).map((s) => {
                const available = s.totalQty - s.reservedQty;

                return (
                  <div
                    key={s.warehouseId}
                    className="p-4 rounded-xl bg-gray-50 border"
                  >
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">
                        Warehouse {s.warehouseId}
                      </span>
                      <span className="text-sm font-medium">
                        Available: {available}
                      </span>
                    </div>

                    <div className="h-2 bg-gray-200 rounded-full mt-2">
                      <div
                        className="h-2 bg-black rounded-full"
                        style={{
                          width: `${(available / s.totalQty) * 100}%`,
                        }}
                      />
                    </div>

                    <button
                      onClick={() => reserve(p.id, s.warehouseId)}
                      className="mt-3 w-full py-2 rounded-xl bg-black text-white hover:opacity-90"
                    >
                      Reserve
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}