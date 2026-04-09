import type { PullResult } from "../types";
import { supabase } from "./supabaseClient";

export interface PullRow {
  id?: string;
  user_id: string;
  pool_id: string;
  results: { card_id: string; rarity: string; is_up?: boolean }[];
  created_at: string;
}

export async function postPull(row: PullRow): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("pulls").insert(row);
  if (error) throw error;
}

export async function fetchHistory(userId: string, limit = 20): Promise<PullRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("pulls")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as PullRow[];
}

export async function fetchInventory(userId: string): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("inventory")
    .select("card_id,count")
    .eq("user_id", userId);
  if (error) throw error;
  const inv: Record<string, number> = {};
  for (const r of (data ?? []) as { card_id: string; count: number }[]) {
    inv[r.card_id] = r.count;
  }
  return inv;
}

export function pullResultsToRow(
  userId: string,
  poolId: string,
  results: PullResult[]
): PullRow {
  return {
    user_id: userId,
    pool_id: poolId,
    results: results.map((r) => ({
      card_id: r.card.id,
      rarity: r.rarity,
      is_up: r.isUp ?? undefined,
    })),
    created_at: new Date().toISOString(),
  };
}

