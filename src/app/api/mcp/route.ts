import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createSolvaMcpServer } from "../../../../mcp-server/create-server.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createSolvaMcpServer();
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export async function POST(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createSolvaMcpServer();
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export async function DELETE(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = createSolvaMcpServer();
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  Object.entries(corsHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}
