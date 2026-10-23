/** MCP stdio server exposing the engine tools to TigrimOS (or any MCP client). */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import { toolDefs } from "./tools.js"

const server = new McpServer({ name: "horathai", version: "0.1.0" })

for (const [name, def] of Object.entries(toolDefs)) {
  const shape = ((def.schema as any).shape ?? {}) as Record<string, any>
  server.tool(name, def.description, shape, async (args: any) => {
    try {
      const result = await (def.handler as any)(args)
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] }
    } catch (e) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) }], isError: true }
    }
  })
}

const transport = new StdioServerTransport()
await server.connect(transport)
process.stderr.write("[horathai] MCP server ready on stdio\n")
