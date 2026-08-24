import type { SearchWebResult } from "../types.js";
import { searchWeb } from "./search-web.js";

export async function executeTool(
  name: string,
  args: unknown,
): Promise<SearchWebResult> {
  switch (name) {
    case "searchWeb":
      return searchWeb(args);

    default:
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
  }
}
