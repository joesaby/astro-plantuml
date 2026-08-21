import type { AstroConfig, AstroIntegration } from 'astro';
import { createRemarkPlugin } from './remark-plugin.js';
import { createSatteriPlugin } from './satteri-plugin.js';
import type { PlantUMLOptions } from './types.js';
import { resolvePlantUMLOptions } from './render.js';

export { type PlantUMLOptions } from './types.js';
export { generateDiagramsFromAst } from './remark-cli.js';
export { createRemarkPlugin } from './remark-plugin.js';
export { createSatteriPlugin } from './satteri-plugin.js';

/**
 * Minimal logger shape used when available from Astro hooks
 */
interface IntegrationLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
}

interface MarkdownProcessorLike {
  name?: string;
  options?: Record<string, unknown>;
}

/**
 * Creates an Astro integration for converting PlantUML code blocks to images.
 *
 * Dispatches on `markdown.processor.name` at `astro:config:setup`:
 * - `satteri` (Astro 7+ default): register a Sätteri mdast plugin
 * - `unified` (Astro 6.4+): register via `unified({ remarkPlugins })`
 * - none / legacy: fall back to top-level `markdown.remarkPlugins`
 */
export default function astroPlantUML(options: PlantUMLOptions = {}): AstroIntegration {
  const resolvedOptions = resolvePlantUMLOptions(options);

  return {
    name: 'astro-plantuml',
    hooks: {
      'astro:config:setup': async ({
        updateConfig,
        config,
        logger,
      }: {
        updateConfig: (newConfig: Partial<AstroConfig>) => void;
        config: AstroConfig;
        logger?: IntegrationLogger;
      }) => {
        const log: IntegrationLogger = logger || {
          info: (message) => console.log(`[astro-plantuml] ${message}`),
          warn: (message) => console.warn(`[astro-plantuml] ${message}`),
        };

        const remarkPlugin = createRemarkPlugin(resolvedOptions);
        const existingProcessor = (
          config.markdown as { processor?: MarkdownProcessorLike } | undefined
        )?.processor;
        let usedProcessor = false;

        // Branch on processor.name rather than blindly importing helper packages:
        // Astro 7 does not ship `@astrojs/markdown-remark`, and Astro 5/6 may not
        // ship `@astrojs/markdown-satteri`. A failed dynamic import falls through
        // to the legacy remarkPlugins path.
        //
        // Variable import paths keep TypeScript from requiring those packages at
        // compile time (they arrive transitively with the user's Astro version).
        if (existingProcessor?.name === 'unified') {
          try {
            const unifiedPackage = '@astrojs/markdown-remark';
            const { unified, isUnifiedProcessor } = (await import(unifiedPackage)) as {
              unified: (options?: Record<string, unknown>) => unknown;
              isUnifiedProcessor: (processor: unknown) => boolean;
            };
            if (isUnifiedProcessor(existingProcessor)) {
              const existingOptions = existingProcessor.options || {};
              const markdownConfig = {
                processor: unified({
                  ...existingOptions,
                  remarkPlugins: [
                    ...((existingOptions.remarkPlugins as unknown[]) || []),
                    remarkPlugin,
                  ],
                }),
              } as unknown as AstroConfig['markdown'];
              updateConfig({ markdown: markdownConfig });
              usedProcessor = true;
              log.info('Registered PlantUML remark plugin on unified markdown processor');
            }
          } catch (error) {
            log.warn(
              `Could not configure the unified markdown processor, falling back ` +
                `to remarkPlugins: ${(error as Error).message}`
            );
          }
        } else if (existingProcessor?.name === 'satteri') {
          try {
            const satteriPackage = '@astrojs/markdown-satteri';
            const { satteri, isSatteriProcessor } = (await import(satteriPackage)) as {
              satteri: (options?: Record<string, unknown>) => unknown;
              isSatteriProcessor: (processor: unknown) => boolean;
            };
            if (isSatteriProcessor(existingProcessor)) {
              const existingOptions = existingProcessor.options || {};
              const markdownConfig = {
                processor: satteri({
                  ...existingOptions,
                  mdastPlugins: [
                    ...((existingOptions.mdastPlugins as unknown[]) || []),
                    createSatteriPlugin({ ...resolvedOptions, logger: log }),
                  ],
                }),
              } as unknown as AstroConfig['markdown'];
              updateConfig({ markdown: markdownConfig });
              usedProcessor = true;
              log.info('Registered PlantUML mdast plugin on Sätteri markdown processor');
            }
          } catch (error) {
            log.warn(
              `Could not configure the Sätteri markdown processor, falling back ` +
                `to remarkPlugins: ${(error as Error).message}`
            );
          }
        }

        if (!usedProcessor) {
          const existingRemarkPlugins = Array.isArray(config.markdown?.remarkPlugins)
            ? config.markdown.remarkPlugins
            : [];

          updateConfig({
            markdown: {
              ...config.markdown,
              remarkPlugins: [...existingRemarkPlugins, remarkPlugin],
            },
          });
        }
      },
    },
  };
}
