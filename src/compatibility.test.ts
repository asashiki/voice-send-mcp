import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { loadConfig } from "./config.js";
import { createMcpServer } from "./mcp.js";
test("plain MCP client can discover and consume portable results", async () => {
 const config=loadConfig();
 const server=createMcpServer(config);
 const client=new Client({name:"plain-client",version:"1"},{capabilities:{}});
 const [a,b]=InMemoryTransport.createLinkedPair();
 try {
  await server.connect(a);await client.connect(b);
  const tools=await client.listTools();assert.ok(tools.tools.length);
  const resources=await client.listResources();const widget=resources.resources[0]!;
  const read=await client.readResource({uri:widget.uri});
  const resource=read.contents[0]!;
  assert.equal(resource.mimeType,"text/html;profile=mcp-app");
  assert.equal(resource._meta?.["openai/widgetDomain"],undefined);
 } finally {
  await client.close();await server.close();
 }
});
