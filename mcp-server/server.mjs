#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createSolvaMcpServer, loadLocalEnv } from "./create-server.mjs";

async function main() {
  await loadLocalEnv();
  const server = createSolvaMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Solva HR MCP server running on stdio");
}

main().catch((error) => {
  console.error("Solva HR MCP server error:", error);
  process.exit(1);
});
