import { isStaffAdminRole } from '@/lib/staffRoles';
import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";

const GATEWAY = process.env.API_URL ?? 'http://localhost:6002';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionOrRefresh();
  if (!session || (!isStaffAdminRole(session.role))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    
    const response = await fetch(`${GATEWAY}/tokens/limits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return new NextResponse("Backend error", { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Token limits update error:", error);
    return new NextResponse("Service unavailable", { status: 503 });
  }
}
