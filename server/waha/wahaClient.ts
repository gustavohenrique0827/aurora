import axios from "axios";
import { env } from "../config/env";

const client = axios.create({
  baseURL: env.WAHA_URL,
  timeout: 10_000,
  headers: { "X-Api-Key": env.WAHA_API_KEY },
});

export type WahaRawStatus = "WORKING" | "STARTING" | "SCAN_QR_CODE" | "FAILED" | "STOPPED";

export async function fetchWahaSessionStatus(): Promise<WahaRawStatus> {
  const response = await client.get(`/api/sessions/${env.WAHA_SESSION}`);
  const status = response.data?.status as string | undefined;
  const known: WahaRawStatus[] = ["WORKING", "STARTING", "SCAN_QR_CODE", "FAILED", "STOPPED"];
  return (known.find((s) => s === status) ?? "STOPPED") as WahaRawStatus;
}
