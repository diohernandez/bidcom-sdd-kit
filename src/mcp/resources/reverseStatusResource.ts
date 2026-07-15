import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { ReverseStatusWorkflow } from "../../core/workflows/reverse/ReverseStatusWorkflow.js";
import { loadConfig } from "../../utils/config.js";

export function registerReverseStatusResource(
  server: McpServer,
  { projectPath }: { projectPath: string },
): void {
  server.registerResource(
    "sdd-reverse-status",
    new ResourceTemplate("sdd://reverse/{name}", { list: undefined }),
    {
      description: "Estado de un análisis de ingeniería inversa puntual",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const config = await loadConfig(projectPath);
      const rawName = variables.name;
      const projectName = Array.isArray(rawName) ? rawName[0] : rawName;
      const result = await new ReverseStatusWorkflow().execute({
        projectPath,
        config,
        projectName,
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
