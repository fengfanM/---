import type { PullResult } from "../types";
import { supabase } from "./supabaseClient";

export interface PullRow {
  id?: string;
  user_id: string;
  pool_id: string;
  results: { card_id: string; rarity: string; is_up?: boolean }[];
  created_at: string;
}

export interface GameSaveRow {
  id?: string;
  user_id: string;
  save_data: any;
  created_at: string;
  updated_at: string;
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

export async function saveGameSave(userId: string, saveData: any): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("game_saves")
    .upsert(
      {
        user_id: userId,
        save_data: saveData,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );
  if (error) throw error;
}

export async function fetchGameSave(userId: string): Promise<GameSaveRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("game_saves")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data as GameSaveRow;
}

export async function syncInventoryToCloud(
  userId: string,
  inventory: Record<string, number>
): Promise<void> {
  if (!supabase) return;
  const { error: deleteError } = await supabase
    .from("inventory")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw deleteError;

  const inventoryRows = Object.entries(inventory).map(([cardId, count]) => ({
    user_id: userId,
    card_id: cardId,
    count: count,
  }));

  if (inventoryRows.length > 0) {
    const { error: insertError } = await supabase
      .from("inventory")
      .insert(inventoryRows);
    if (insertError) throw insertError;
  }
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

