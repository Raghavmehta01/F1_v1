import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "ok", service: "f1_v1-web" });
}
