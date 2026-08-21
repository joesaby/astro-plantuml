import { fileURLToPath } from 'node:url';
import type { PlantUMLOptions } from './types.js';
import {
  buildErrorHtml,
  renderPlantUmlHtml,
  resolvePlantUMLOptions,
  type ResolvedPlantUMLOptions,
} from './render.js';

/**
 * Minimal shape of a Sätteri mdast visitor context.
 * Kept loose so we do not take a hard dependency on `satteri` types.
 */
interface SatteriCodeContext {
  fileURL?: URL | string;
}

interface SatteriCodeNode {
  lang?: string | null;
  value?: string;
}

/**
 * Logger subset used by Astro integrations
 */
export interface PlantUMLLogger {
  info: (message: string) => void;
  warn?: (message: string) => void;
}

export interface SatteriPlantUMLPluginOptions extends PlantUMLOptions {
  logger?: PlantUMLLogger;
}

/**
 * Resolve a Sätteri context file URL to a filesystem path (when available)
 */
function resolveFilePath(context?: SatteriCodeContext): string | undefined {
  if (!context?.fileURL) {
    return undefined;
  }

  try {
    if (context.fileURL instanceof URL) {
      return fileURLToPath(context.fileURL);
    }
    if (typeof context.fileURL === 'string') {
      return context.fileURL.startsWith('file:')
        ? fileURLToPath(new URL(context.fileURL))
        : context.fileURL;
    }
  } catch {
    // Ignore unresolvable URLs and fall through to server-only rendering
  }

  return undefined;
}

/**
 * Create a Sätteri mdast plugin that transforms PlantUML code blocks.
 *
 * Astro 7 ships `@astrojs/markdown-satteri` as the default markdown processor,
 * which uses its own mdast/hast plugin model instead of remark/rehype.
 *
 * Returns a plain `{ type: 'html' }` node — not Sätteri's `{ rawHtml }` escape
 * hatch — so diagram content is emitted verbatim (see astro-mermaid #71).
 */
export function createSatteriPlugin(options: SatteriPlantUMLPluginOptions = {}) {
  const resolved: ResolvedPlantUMLOptions = resolvePlantUMLOptions(options);
  const logger = options.logger;

  return {
    name: 'astro-plantuml',
    async code(node: SatteriCodeNode, context?: SatteriCodeContext) {
      if (node.lang !== resolved.language) {
        return;
      }

      const content = node.value || '';
      const filePath = resolveFilePath(context);

      if (logger) {
        const file = filePath || 'unknown file';
        logger.info(`Sätteri transformed PlantUML block in ${file}`);
      }

      try {
        const htmlContent = await renderPlantUmlHtml(content, resolved, filePath);
        return {
          type: 'html',
          value: htmlContent,
        };
      } catch (error) {
        console.error('Error processing PlantUML diagram:', error);
        return {
          type: 'html',
          value: buildErrorHtml(content, (error as Error).message, resolved),
        };
      }
    },
  };
}
