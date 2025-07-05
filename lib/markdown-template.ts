import * as fs from "fs";
import * as path from "path";
import mustache from "mustache";

export function loadMarkdownTemplate<T extends Record<string, any>>(
  filePath: string,
  variables: T,
): string {
  // Try multiple path resolution strategies to work in both local and serverless environments
  const possiblePaths = [
    // For local development and build
    path.resolve(process.cwd(), filePath),
    // For Vercel serverless functions - relative to the function bundle
    path.resolve(__dirname, "..", filePath),
    // For Vercel serverless functions - absolute path within the function
    path.resolve("/var/task", filePath),
    // For webpack bundled files
    path.resolve(__dirname, "..", "..", filePath),
  ];

  let lastError: Error | null = null;

  for (const resolvedPath of possiblePaths) {
    try {
      const content = fs.readFileSync(resolvedPath, "utf8");
      return mustache.render(content, variables);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw new Error(
    `Failed to load markdown template: ${lastError?.message || "Unknown error"}`,
  );
}
