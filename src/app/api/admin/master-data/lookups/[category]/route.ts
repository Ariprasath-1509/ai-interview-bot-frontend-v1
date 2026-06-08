import { proxyAdminMasterData } from "@/lib/adminMasterDataProxy";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ category: string }> };

export async function GET(req: Request, { params }: Params) {
  const { category } = await params;
  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("includeInactive") === "true";
  return proxyAdminMasterData(
    `/lookups/${encodeURIComponent(category)}?includeInactive=${includeInactive}`
  );
}

export async function POST(req: Request, { params }: Params) {
  const { category } = await params;
  const body = await req.text();
  return proxyAdminMasterData(`/lookups/${encodeURIComponent(category)}`, {
    method: "POST",
    body,
  });
}
