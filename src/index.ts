import type { AstroIntegration, AstroConfig } from 'astro';
import { createPlugin } from './plugin.js';
import type { PlantUMLOptions } from './types.js';

export { type PlantUMLOptions } from './types.js';

/**
 * Creates an Astro integration for converting PlantUML code blocks to images
 * 
 * @param options - Configuration options for PlantUML processing
 * @returns An Astro integration
 */
export default function astroPlantUML(options: PlantUMLOptions = {}): AstroIntegration {
  const resolvedOptions: PlantUMLOptions = {
    serverUrl: options.serverUrl || 'http://www.plantuml.com/plantuml/png/',
    timeout: options.timeout || 10000,
    addWrapperClasses: options.addWrapperClasses !== false,
    ...options
  };

  return {
    name: 'astro-plantuml',
    hooks: {
      'astro:config:setup': ({ updateConfig, config }: { updateConfig: (newConfig: Partial<AstroConfig>) => void, config: AstroConfig }) => {
        // Get existing rehype plugins or initialize empty array
        const existingRehypePlugins = Array.isArray(config.markdown?.rehypePlugins) 
          ? config.markdown.rehypePlugins 
          : [];
        
        // Add our plugin to the array
        updateConfig({
          markdown: {
            rehypePlugins: [
              ...existingRehypePlugins,
              [createPlugin, resolvedOptions]
            ]
          }
        });
      }
    }
  };
}