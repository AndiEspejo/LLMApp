import "server-only";

// Server-side base URL for the FastAPI backend. Read at request time so the
// same build can point at different environments.
const API_URL = process.env.API_URL ?? "http://localhost:8000";

export type HealthResponse = {
  status: "ok" | "degraded";
  version: string;
  environment: string;
  database: "ok" | "error";
};

export type HealthResult =
  | { ok: true; httpStatus: number; data: HealthResponse }
  | { ok: false; error: string };

export async function getHealth(): Promise<HealthResult> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const data = (await res.json()) as HealthResponse;
    return { ok: true, httpStatus: res.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Could not reach API at ${API_URL}: ${message}` };
  }
}
