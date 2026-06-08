import { proxyAdminMasterData } from "@/lib/adminMasterDataProxy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string; id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { category, id } = await params;
  const body = await req.text();
  return proxyAdminMasterData(`/lookups/${encodeURIComponent(category)}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { category, id } = await params;
  return proxyAdminMasterData(`/lookups/${encodeURIComponent(category)}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
