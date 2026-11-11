import { safeFetch } from "@/lib/security";

export type DriverPrediction = {
  driver_id: string;
  driver_name: string;
  constructor_id?: string | null;
  win_probability: number;
  podium_probability: number;
  rank: number;
};

export type PredictPayload = {
  season?: number;
  round?: number;
  model_version?: string;
  status?: string;
  message?: string | null;
  predictions?: DriverPrediction[];
  error?: string;
};

/** Server-side call to FastAPI /predict (same contract as /api/predict BFF). */
export async function getPredictions(
  season: number,
  round: number,
): Promise<PredictPayload> {
  const base = process.env.ML_API_URL ?? "http://127.0.0.1:8000";
  const secret = process.env.ML_SHARED_SECRET;
  if (!secret) {
    return {
      error: "ML_SHARED_SECRET not configured",
      status: "unavailable",
      predictions: [],
    };
  }

  try {
    const res = await safeFetch(`${base}/predict?season=${season}&round=${round}`, {
      headers: { "X-ML-Secret": secret },
      cache: "no-store",
    });
    const body = (await res.json()) as PredictPayload;
    if (!res.ok) {
      return {
        ...body,
        error: body.error || body.message || `HTTP ${res.status}`,
        status: body.status || "unavailable",
        predictions: body.predictions ?? [],
      };
    }
    return body;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "ML service unavailable",
      status: "unavailable",
      predictions: [],
    };
  }
}
