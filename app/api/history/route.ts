// app/api/history/route.ts

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const analyses = await prisma.analysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        inputType: true,
        sourceUrl: true,
        summary: true,
        confidenceScore: true,
        positivePoints: true,
        negativePoints: true,
        dataCollected: true,
        dataRetention: true,
        confidenceBreakdown: true,
        processingMs: true,
      },
    });
    return NextResponse.json(analyses);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
