import { proxyAdminMasterData } from "@/lib/adminMasterDataProxy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { slug } = await params;
  const body = await req.text();
  return proxyAdminMasterData(`/companies/${encodeURIComponent(slug)}`, { method: "PUT", body });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { slug } = await params;
  return proxyAdminMasterData(`/companies/${encodeURIComponent(slug)}`, { method: "DELETE" });
}
