/**
 * Configuration options for the PlantUML integration
 */
export interface PlantUMLOptions {
    /**
     * URL of the PlantUML server
     * @default 'http://www.plantuml.com/plantuml/png/'
     */
    serverUrl?: string;
    
    /**
     * Timeout for HTTP requests to the PlantUML server in milliseconds
     * @default 10000
     */
    timeout?: number;
    
    /**
     * Add CSS classes to wrapper elements for styling
     * @default true
     */
    addWrapperClasses?: boolean;
    
    /**
     * Language identifier in code blocks to process as PlantUML
     * @default 'plantuml'
     */
    language?: string;
    
    /**
     * Output format for PlantUML diagrams
     * @default 'png'
     */
    format?: 'png' | 'svg';
    
    /**
     * Remove inline styles from SVG elements for better CSS control
     * Only applies when format is 'svg'
     * @default false
     */
    removeInlineStyles?: boolean;
    
    /**
     * Path where diagram files are stored/generated, relative to project root
     * When set, the plugin will look for pre-generated diagrams in this directory
     * If not found, it falls back to server generation
     * @default undefined (always use server)
     */
    diagramsPath?: string;

    /**
     * Reuse HTTP connections (Keep-Alive) when requesting diagrams from the
     * PlantUML server. Some local servers, such as `plantuml.jar --picoweb`,
     * handle persistent connections poorly and can fail or hang on the
     * second and later requests on a page with multiple diagrams. Set this
     * to `false` if you see rendering issues with a local PlantUML server.
     * @default true
     */
    keepAlive?: boolean;
  }