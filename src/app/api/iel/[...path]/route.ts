import { NextRequest, NextResponse } from "next/server";
import { IEL_API_BASE_URL } from "@/lib/ielApiConfig";

async function forwardResponse(res: Response) {
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${IEL_API_BASE_URL}/api/psxApi/${path.join("/")}/${req.nextUrl.search}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    return await forwardResponse(res);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the IEL PSX API." },
      { status: 502 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${IEL_API_BASE_URL}/api/psxApi/${path.join("/")}/`;

  try {
    const body = await req.text();
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return await forwardResponse(res);
  } catch {
    return NextResponse.json(
      { error: "Could not reach the IEL PSX API." },
      { status: 502 }
    );
  }
}
