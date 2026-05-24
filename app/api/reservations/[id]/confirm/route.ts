import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// THIS IS THE KEY FIX:
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (new Date(reservation.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Reservation expired" },
        { status: 410 }
      );
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: { status: "CONFIRMED" },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}