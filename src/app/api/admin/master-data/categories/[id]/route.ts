import { proxyAdminMasterData } from "@/lib/adminMasterDataProxy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const body = await req.text();
  return proxyAdminMasterData(`/categories/${encodeURIComponent(id)}`, { method: "PUT", body });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return proxyAdminMasterData(`/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
}
