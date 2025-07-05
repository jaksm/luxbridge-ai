import * as fs from 'fs';
import * as path from 'path';
import mustache from 'mustache';

export function loadMarkdownTemplate<T extends Record<string, any>>(
  filePath: string,
  variables: T
): string {
  const resolvedPath = path.resolve(filePath);
  
  try {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    return mustache.render(content, variables);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load markdown template: ${error.message}`);
    }
    throw new Error('Failed to load markdown template: Unknown error');
  }
}