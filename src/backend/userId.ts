function randomId(): string {
  // 兼容无 crypto 的环境
  const g = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (g?.randomUUID) return g.randomUUID();
  return `u_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function getOrCreateUserId(): string {
  const key = "tj_user_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = randomId();
  localStorage.setItem(key, id);
  return id;
}

