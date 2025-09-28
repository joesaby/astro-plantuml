import type { Root, Code } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import axios from 'axios';
import * as zlib from 'node:zlib';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { PlantUMLOptions } from './types.js';
import { encode64 } from './utils.js';

/**
 * Create a remark plugin for PlantUML processing
 */
export function createRemarkPlugin(options: PlantUMLOptions = {}): Plugin<[], Root> {
  const format = options.format || 'png';
  const serverUrl = options.serverUrl || `https://www.plantuml.com/plantuml/${format}/`;
  const timeout = options.timeout || 10000;
  const addWrapperClasses = options.addWrapperClasses !== false;
  const language = options.language || 'plantuml';
  const removeInlineStyles = options.removeInlineStyles || false;
  const diagramsPath = options.diagramsPath;

  return function remarkPlantuml() {
    return async function transformer(tree: Root, file: any) {
      if (!tree || typeof tree !== 'object') {
        console.warn('Received invalid AST in remarkPlantuml plugin');
        return tree;
      }
      
      // Get current file path for local file lookup
      const currentFilePath = file?.path;
      
      const codeBlocks: Array<{
        node: Code;
        parent: any;
        index: number;
      }> = [];

      // First pass: collect all PlantUML code blocks
      try {
        visit(tree, 'code', (node: Code, index?: number, parent?: any) => {
          if (node && parent && typeof index === 'number' && node.lang === language) {
            codeBlocks.push({
              node,
              parent,
              index
            });
          }
        });
      } catch (error) {
        console.error('Error traversing AST in remarkPlantuml:', error);
        return tree;
      }
      
      if (codeBlocks.length > 0) {
        console.log(`Found ${codeBlocks.length} PlantUML blocks to process`);
      }

      // Process each code block sequentially to ensure completion
      for (const { node, parent, index } of codeBlocks) {
        try {
          const content = node.value;
          if (!content) {
            console.warn('Empty PlantUML content found');
            continue;
          }

          let htmlContent: string = '';
          
          // Check for local files first if diagramsPath is configured
          if (diagramsPath) {
            const localFile = findLocalFile(content.trim(), currentFilePath, diagramsPath, format);
            
            if (localFile) {
              console.log(`Using local ${format.toUpperCase()} file for PlantUML diagram`);
              
              if (format === 'svg' && typeof localFile === 'string') {
                let svgContent = localFile;
                
                // Remove inline styles if requested
                if (removeInlineStyles) {
                  svgContent = removeInlineStylesFromSvg(svgContent);
                }
                
                // Add CSS classes to the SVG element if wrapper classes are enabled
                if (addWrapperClasses && !svgContent.includes('class=')) {
                  svgContent = svgContent.replace('<svg', '<svg class="plantuml-svg"');
                }
                
                htmlContent = `<figure${addWrapperClasses ? ' class="plantuml-diagram"' : ''}>
  ${svgContent}
</figure>`;
              } else if (format === 'png' && Buffer.isBuffer(localFile)) {
                // For PNG, convert to base64 data URL
                const base64Image = localFile.toString('base64');
                const imgSrc = `data:image/png;base64,${base64Image}`;
                htmlContent = `<figure${addWrapperClasses ? ' class="plantuml-diagram"' : ''}>
  <img src="${imgSrc}" alt="PlantUML Diagram"${addWrapperClasses ? ' class="plantuml-img"' : ''} />
</figure>`;
              }
            } else {
              console.warn(`Local ${format.toUpperCase()} file not found, falling back to server generation`);
              // Fall through to server generation
            }
          }
          
          // Server generation (fallback or primary method)
          if (!htmlContent) {
            // Encode the PlantUML content using the proper encoder
            const encodedContent = encodePlantUmlForUrl(content.trim());
            
            // Call the PlantUML server to get the diagram
            const url = `${serverUrl}${encodedContent}`;
            
            const response = await axios.get(url, { 
              responseType: format === 'svg' ? 'text' : 'arraybuffer',
              timeout: timeout
            });

            // Handle different formats
            if (format === 'svg') {
              // For SVG, embed the raw SVG content directly
              let svgContent = response.data as string;
              
              // Remove inline styles if requested
              if (removeInlineStyles) {
                svgContent = removeInlineStylesFromSvg(svgContent);
              }
              
              // Add CSS classes to the SVG element if wrapper classes are enabled
              if (addWrapperClasses && !svgContent.includes('class=')) {
                svgContent = svgContent.replace('<svg', '<svg class="plantuml-svg"');
              }
              
              htmlContent = `<figure${addWrapperClasses ? ' class="plantuml-diagram"' : ''}>
  ${svgContent}
</figure>`;
            } else {
              // For PNG, convert binary response to base64 and use img tag
              const base64Image = Buffer.from(response.data).toString('base64');
              const imgSrc = `data:image/png;base64,${base64Image}`;
              htmlContent = `<figure${addWrapperClasses ? ' class="plantuml-diagram"' : ''}>
  <img src="${imgSrc}" alt="PlantUML Diagram"${addWrapperClasses ? ' class="plantuml-img"' : ''} />
</figure>`;
            }
          }

          // Replace the code block with an HTML node containing the diagram
          const htmlNode: any = {
            type: 'html',
            value: htmlContent
          };

          // Replace the original code block with the HTML node
          parent.children.splice(index, 1, htmlNode);
        } catch (error) {
          console.error('Error processing PlantUML diagram:', error);
          
          // Create an error message if the conversion fails
          const errorHtml = `<div${addWrapperClasses ? ' class="plantuml-error"' : ''}>
  <p>Error generating PlantUML diagram: ${(error as Error).message}</p>
  <pre><code class="language-${language}">${escapeHtml(node.value)}</code></pre>
</div>`;

          const errorNode: any = {
            type: 'html',
            value: errorHtml
          };
          
          // Replace the original code block with the error message
          parent.children.splice(index, 1, errorNode);
        }
      }

      return tree;
    };
  };
}

/**
 * Encodes a string into the format expected by PlantUML servers
 */
function encodePlantUmlForUrl(plantUmlText: string): string {
  // Add the @startuml and @enduml if they're not already there
  let text = plantUmlText.trim();
  if (!text.startsWith('@startuml')) {
    text = '@startuml\n' + text;
  }
  if (!text.endsWith('@enduml')) {
    text = text + '\n@enduml';
  }
  
  // Compress with zlib deflate (raw deflate, no headers)
  const compressed = zlib.deflateRawSync(text, { level: 9 });
  
  // Encode with PlantUML's custom base64 variant
  return encode64(compressed);
}

/**
 * Find local file for PlantUML content (SVG or PNG)
 */
function findLocalFile(content: string, currentFilePath?: string, diagramsPath: string = 'diagrams', format: string = 'svg'): string | Buffer | null {
  if (!currentFilePath) {
    return null;
  }
  
  // Generate hash for the content (same as generation script)
  const hash = crypto.createHash('md5').update(content).digest('hex');
  
  // Look for SVG file in top-level diagrams directory
  // Need to find project root - assume it's where package.json exists
  let projectRoot = path.dirname(currentFilePath);
  while (projectRoot && projectRoot !== path.dirname(projectRoot)) {
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
      break;
    }
    projectRoot = path.dirname(projectRoot);
  }
  
  if (!projectRoot) {
    console.warn('Could not find project root for local SVG lookup');
    return null;
  }
  
  const diagramsDir = path.join(projectRoot, diagramsPath);
  
  // Use relative path for unique naming (same as generation script)
  const relativePath = path.relative(projectRoot, currentFilePath);
  const baseFileName = relativePath.replace(/[\/\\]/g, '-').replace(/\.md$/, '');
  const fileName = `${baseFileName}-${hash}.${format}`;
  const filePath = path.join(diagramsDir, fileName);
  
  if (fs.existsSync(filePath)) {
    try {
      if (format === 'svg') {
        return fs.readFileSync(filePath, 'utf8');
      } else if (format === 'png') {
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to read local ${format.toUpperCase()} file: ${filePath}`, error);
      return null;
    }
  }
  
  return null;
}

/**
 * Remove specific inline styles from SVG content for better CSS control
 * Only removes background properties while preserving width, height and other essential styles
 */
function removeInlineStylesFromSvg(svgContent: string): string {
  return svgContent
    // Remove specific CSS properties from style attributes while preserving others
    .replace(/style="([^"]*)"/g, (match, styleContent) => {
      // Remove background properties but keep everything else including width/height
      const cleanedStyles = styleContent
        .replace(/\bbackground[^;]*;?/g, '')
          .replace(/width:[^;]*;?/g, 'max-width:100%;')
          .replace(/height:[^;]*;?/g, 'auto')
        .replace(/;+/g, ';') // Clean up multiple semicolons
        .replace(/^;|;$/g, ''); // Remove leading/trailing semicolons
      
      return cleanedStyles ? `style="${cleanedStyles}"` : '';
    });
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}