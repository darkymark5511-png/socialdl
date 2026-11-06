import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  listVipAccounts,
  addVipAccount,
  removeVipAccount,
  setVipActive,
} from "@/lib/vip-store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const accounts = await listVipAccounts();
    const safe = accounts.map(({ passwordHash: _, ...rest }) => rest);
    return NextResponse.json({ ok: true, accounts: safe });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Blob error" },
      { status: 500 }
    );
  }
}

const createSchema = z.object({
  username: z.string().min(2).max(64),
  password: z.string().min(6).max(128),
  label: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }
  try {
    const account = await addVipAccount({
      ...parsed.data,
      createdBy: session.user?.name ?? "admin",
    });
    const { passwordHash: _, ...safe } = account;
    return NextResponse.json({ ok: true, account: safe });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 }
    );
  }
}

const patchSchema = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  delete: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  try {
    if (parsed.data.delete) {
      const ok = await removeVipAccount(parsed.data.id);
      return NextResponse.json({ ok });
    }
    if (typeof parsed.data.active === "boolean") {
      const ok = await setVipActive(parsed.data.id, parsed.data.active);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "No op" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 }
    );
  }
}
