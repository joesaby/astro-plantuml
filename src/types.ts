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
  }