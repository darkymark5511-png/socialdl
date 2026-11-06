import { put, list, del } from "@vercel/blob";
import bcrypt from "bcryptjs";

export type VipAccount = {
  id: string;
  username: string;
  passwordHash: string;
  label?: string;
  createdAt: string;
  createdBy: string;
  active: boolean;
};

const PATH = "vip/accounts.json";

async function findAccountsBlobUrl(): Promise<string | null> {
  const { blobs } = await list({
    prefix: "vip/",
    limit: 20,
  });
  const hit = blobs.find(
    (b) => b.pathname === PATH || b.pathname.endsWith("accounts.json")
  );
  return hit?.url ?? null;
}

export async function listVipAccounts(): Promise<VipAccount[]> {
  try {
    const url = await findAccountsBlobUrl();
    if (!url) return [];
    const res = await fetch(url, {
      headers: process.env.BLOB_READ_WRITE_TOKEN
        ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` }
        : {},
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as VipAccount[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveAccounts(accounts: VipAccount[]): Promise<void> {
  await put(PATH, JSON.stringify(accounts, null, 2), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function addVipAccount(input: {
  username: string;
  password: string;
  label?: string;
  createdBy: string;
}): Promise<VipAccount> {
  const username = input.username.trim().toLowerCase();
  if (!username || username.length < 2) throw new Error("Invalid username");
  if (input.password.length < 6) throw new Error("Password min 6 chars");

  const accounts = await listVipAccounts();
  if (accounts.some((a) => a.username === username)) {
    throw new Error("Username already exists");
  }
  if (username === (process.env.ADMIN_USERNAME ?? "admin").toLowerCase()) {
    throw new Error("Reserved username");
  }

  const account: VipAccount = {
    id: `vip_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    username,
    passwordHash: await bcrypt.hash(input.password, 12),
    label: input.label?.trim() || undefined,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    active: true,
  };

  accounts.push(account);
  await saveAccounts(accounts);
  return account;
}

export async function removeVipAccount(id: string): Promise<boolean> {
  const accounts = await listVipAccounts();
  const next = accounts.filter((a) => a.id !== id);
  if (next.length === accounts.length) return false;
  await saveAccounts(next);
  return true;
}

export async function setVipActive(id: string, active: boolean): Promise<boolean> {
  const accounts = await listVipAccounts();
  const idx = accounts.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  accounts[idx] = { ...accounts[idx]!, active };
  await saveAccounts(accounts);
  return true;
}

export async function verifyVip(
  username: string,
  password: string
): Promise<VipAccount | null> {
  const accounts = await listVipAccounts();
  const user = accounts.find(
    (a) => a.active && a.username === username.trim().toLowerCase()
  );
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user : null;
}
