"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Reservation } from "@/lib/types";

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [status, setStatus] = useState<"PENDING" | "CONFIRMED" | "RELEASED">("PENDING");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReservationDetails = async () => {
      try {
        const res = await fetch(`/api/reservations/${id}`);
        if (!res.ok) throw new Error("Reservation token not valid or dead.");
        const data = await res.json();

        if (!data) throw new Error("No data returned for this reservation session.");

        setReservation(data);
        setStatus(data.status);

        const diffInSeconds = Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
        setTimeLeft(diffInSeconds);
      } catch (err: any) {
        setError(err.message);
      }
    };

    fetchReservationDetails();
  }, [id]);

  useEffect(() => {
    if (status !== "PENDING" || timeLeft <= 0) return;

    const ticker = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(ticker);
          setStatus("RELEASED");
          setError("⏳ 410 Lease Gone: The checkout reservation lease has expired.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [timeLeft, status]);

  const handleConfirmPurchase = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 410) {
          setStatus("RELEASED");
          throw new Error("❌ 410 Expired: The reservation expired mid-flight before verification processing completed.");
        }
        throw new Error(data.error || "Fulfillment processing failed.");
      }

      setStatus("CONFIRMED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseEarly = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      if (!res.ok) throw new Error("Unable to cleanly release your reservation hold.");

      setStatus("RELEASED");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatClockDisplay = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  if (error && !reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl p-8 text-center shadow-md">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="bg-black text-white px-6 py-2.5 rounded-xl font-medium cursor-pointer">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 font-medium animate-pulse">Securing connection to checkout session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl p-8">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight text-center">Secure Allocation Checkout</h2>
        <p className="text-xs text-gray-400 font-mono text-center mt-1">Reservation ID: {reservation.id}</p>

        {error && (
          <div className="my-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="my-6">
          {status === "PENDING" && (
            <div className="text-center bg-gray-50 border border-dashed border-gray-200 rounded-2xl py-6 px-4">
              <span className="text-xs text-gray-400 font-bold uppercase tracking-widest block mb-1">Time Left to Complete Order</span>
              <div className={`text-4xl font-mono font-black tracking-tight ${timeLeft < 60 ? "text-red-500 animate-pulse" : "text-gray-900"}`}>
                {formatClockDisplay(timeLeft)}
              </div>
              <p className="text-xs text-gray-400 mt-2">1 unit is safely held for you inside Neon Postgres.</p>
            </div>
          )}

          {status === "CONFIRMED" && (
            <div className="text-center bg-emerald-50 border border-emerald-100 rounded-2xl py-6 px-4">
              <div className="text-3xl mb-2">🎉</div>
              <h4 className="text-emerald-900 font-black text-lg">Transaction Complete</h4>
              <p className="text-xs text-emerald-600 mt-1">Physical inventory has been cleanly decremented from stock.</p>
            </div>
          )}

          {status === "RELEASED" && (
            <div className="text-center bg-rose-50 border border-rose-100 rounded-2xl py-6 px-4">
              <div className="text-3xl mb-2">🔒</div>
              <h4 className="text-rose-900 font-black text-lg">Lock Safely Released</h4>
              <p className="text-xs text-rose-600 mt-1">The item has been restored back to the global pool.</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {status === "PENDING" ? (
            <>
              <button
                onClick={handleConfirmPurchase}
                disabled={isProcessing || timeLeft <= 0}
                className="w-full bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-emerald-500 shadow-sm transition-all cursor-pointer disabled:bg-gray-200 disabled:cursor-not-allowed"
              >
                {isProcessing ? "Processing Merchant Authorization..." : "Confirm Secure Purchase"}
              </button>
              <button
                onClick={handleReleaseEarly}
                disabled={isProcessing}
                className="w-full bg-white text-gray-500 border border-gray-200 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-50 transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel and Release Units
              </button>
            </>
          ) : (
            <button onClick={() => router.push("/")} className="w-full bg-gray-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all cursor-pointer">
              Return to Catalog Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}