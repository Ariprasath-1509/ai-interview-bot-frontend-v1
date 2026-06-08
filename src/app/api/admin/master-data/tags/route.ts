import { proxyAdminMasterData } from "@/lib/adminMasterDataProxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyAdminMasterData("/tags");
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyAdminMasterData("/tags", { method: "POST", body });
}
