// app/api/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

const SYSTEM_PROMPT = `Tu es un expert juridique spécialisé dans l'analyse des Conditions Générales d'Utilisation (CGU). 
Ton rôle est d'analyser rigoureusement les CGU soumises et de produire un rapport structuré UNIQUEMENT au format JSON valide.

Tu dois extraire et évaluer :
1. Les points positifs (droits utilisateur clairs, transparence, protections explicites)
2. Les points négatifs (clauses abusives, imprécisions, risques pour l'utilisateur)
3. Les données personnelles collectées
4. La durée de conservation des données
5. Un score de confiance (0-100) calculé selon :
   - Clarté des clauses : 25 points max (termes précis, pas de jargon vague)
   - Droits utilisateur explicites : 25 points max (droit à l'oubli, portabilité, rectification)
   - Transparence sur les données : 25 points max (liste exhaustive des données collectées, finalités claires)
   - Absence de clauses ambiguës : 25 points max (pas de "nous pouvons", "à notre discrétion", "sans préavis")

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après.
Format exact :
{
  "summary": "Résumé global en 2-3 phrases",
  "positivePoints": ["point 1", "point 2"],
  "negativePoints": ["point 1", "point 2"],
  "dataCollected": ["donnée 1", "donnée 2"],
  "dataRetention": "Description de la durée de conservation",
  "confidenceScore": 72,
  "confidenceBreakdown": {
    "clarity": 18,
    "userRights": 20,
    "dataTransparency": 15,
    "ambiguity": 19
  }
}`;

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
}

async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 CGU-Analyzer/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} lors du fetch de l'URL`);
  const html = await res.text();
  // Strip HTML tags
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120000); // Groq context limit safety
}

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = await req.json();
    const { inputType, text, url } = body as {
      inputType: "TEXT" | "URL";
      text?: string;
      url?: string;
    };

    if (inputType === "TEXT" && (!text || text.trim().length < 100)) {
      return NextResponse.json(
        { error: "Le texte doit faire au moins 100 caractères." },
        { status: 400 }
      );
    }
    if (inputType === "URL" && (!url || !url.startsWith("http"))) {
      return NextResponse.json(
        { error: "URL invalide." },
        { status: 400 }
      );
    }

    // Resolve content
    let rawContent = inputType === "TEXT" ? text! : await fetchUrlContent(url!);
    const contentHash = hashContent(rawContent);

    // Check cache
    const cached = await prisma.analysis.findUnique({
      where: { contentHash },
    });
    if (cached) {
      return NextResponse.json({ ...cached, cached: true });
    }

    // Call Groq
    const { text: aiResponse } = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: SYSTEM_PROMPT,
      prompt: `Analyse ces CGU :\n\n${rawContent.slice(0, 100000)}`,
      maxOutputTokens: 2048,
      temperature: 0.1,
    });

    // Parse JSON
    let parsed: any;
    try {
      const cleaned = aiResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "L'IA n'a pas retourné un JSON valide. Réessaie." },
        { status: 502 }
      );
    }

    // Save to DB
    const analysis = await prisma.analysis.create({
      data: {
        inputType,
        inputText: rawContent.slice(0, 50000),
        sourceUrl: url ?? null,
        contentHash,
        summary: parsed.summary ?? "",
        positivePoints: parsed.positivePoints ?? [],
        negativePoints: parsed.negativePoints ?? [],
        dataCollected: parsed.dataCollected ?? [],
        dataRetention: parsed.dataRetention ?? "Non spécifié",
        confidenceScore: Math.min(100, Math.max(0, parsed.confidenceScore ?? 0)),
        confidenceBreakdown: parsed.confidenceBreakdown ?? {},
        model: "llama-3.3-70b-versatile",
        processingMs: Date.now() - start,
      },
    });

    return NextResponse.json({ ...analysis, cached: false });
  } catch (err: any) {
    console.error("[analyze]", err);
    return NextResponse.json(
      { error: err.message ?? "Erreur interne" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
