import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StatusWorkflow } from "../../core/workflows/dev/StatusWorkflow.js";
import { loadConfig } from "../../utils/config.js";

export function registerStatusResource(
  server: McpServer,
  { projectPath }: { projectPath: string },
): void {
  server.registerResource(
    "sdd-status",
    "sdd://status",
    {
      description: "Estado agregado de todos los features en wip/",
      mimeType: "application/json",
    },
    async (uri) => {
      const config = await loadConfig(projectPath);
      const result = await new StatusWorkflow().execute({
        projectPath,
        config,
      });
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    },
  );
}
