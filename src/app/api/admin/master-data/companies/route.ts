import { proxyAdminMasterData } from "@/lib/adminMasterDataProxy";

export const dynamic = "force-dynamic";

export async function GET() {
  return proxyAdminMasterData("/companies");
}

export async function POST(req: Request) {
  const body = await req.text();
  return proxyAdminMasterData("/companies", { method: "POST", body });
}
