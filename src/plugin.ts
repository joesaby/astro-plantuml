import type { Root, Element, Parent } from 'hast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import axios from 'axios';
import * as zlib from 'node:zlib';
import type { PlantUMLOptions } from './types.js';
import { encode64 } from './utils.js';

/**
 * Create a rehype plugin for PlantUML processing
 */
export function createPlugin(options: PlantUMLOptions = {}): Plugin<[], Root> {
  const serverUrl = options.serverUrl || 'http://www.plantuml.com/plantuml/png/';
  const timeout = options.timeout || 10000;
  const addWrapperClasses = options.addWrapperClasses !== false;
  const language = options.language || 'plantuml';

  return function rehypePlantuml() {
    return async function transformer(tree: Root) {
      if (!tree || typeof tree !== 'object') {
        console.warn('Received invalid AST in rehypePlantuml plugin');
        return tree;
      }
      
      const codeBlocks: Array<{
        node: Element;
        parent: Parent;
        index: number;
        codeNode: Element;
      }> = [];

      // First pass: collect all PlantUML code blocks
      try {
        visit(tree, 'element', (node: Element, index: number | null, parent: Parent | null) => {
          if (node && parent && typeof index === 'number' && isPlantUMLBlock(node, language)) {
            codeBlocks.push({
              node,
              parent,
              index,
              codeNode: node.children[0] as Element
            });
          }
        });
      } catch (error) {
        console.error('Error traversing AST in rehypePlantuml:', error);
        return tree;
      }
      
      if (codeBlocks.length > 0) {
        console.log(`Found ${codeBlocks.length} PlantUML blocks to process`);
      }

      // Process each code block sequentially to ensure completion
      for (const { node, parent, index, codeNode } of codeBlocks) {
        try {
          // Get the PlantUML content
          const content = codeNode.children?.[0]?.value as string | undefined;
          if (!content) {
            console.warn('Empty PlantUML content found');
            continue;
          }

          // Encode the PlantUML content using the proper encoder
          const encodedContent = encodePlantUmlForUrl(content.trim());
          
          // Call the PlantUML server to get the PNG
          const url = `${serverUrl}${encodedContent}`;
          
          const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            timeout: timeout
          });

          // Convert the binary response to a base64 string for embedding in HTML
          const base64Image = Buffer.from(response.data).toString('base64');
          const imgSrc = `data:image/png;base64,${base64Image}`;

          // Create a figure element to contain the PNG image
          const figureNode: Element = {
            type: 'element',
            tagName: 'figure',
            properties: addWrapperClasses ? { className: ['plantuml-diagram'] } : {},
            children: [
              {
                type: 'element',
                tagName: 'img',
                properties: { 
                  src: imgSrc,
                  alt: 'PlantUML Diagram',
                  ...(addWrapperClasses ? { className: ['plantuml-img'] } : {})
                },
                children: []
              },
            ],
          };

          // Replace the original code block with the PNG image
          parent.children.splice(index, 1, figureNode);
        } catch (error) {
          console.error('Error processing PlantUML diagram:', error);
          
          // Create an error message if the conversion fails
          const errorNode: Element = {
            type: 'element',
            tagName: 'div',
            properties: addWrapperClasses ? { className: ['plantuml-error'] } : {},
            children: [
              {
                type: 'element',
                tagName: 'p',
                children: [
                  {
                    type: 'text',
                    value: `Error generating PlantUML diagram: ${(error as Error).message}`,
                  },
                ],
              },
              // Keep the original code block
              node, 
            ],
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
 * Determines if a node is a PlantUML code block
 */
function isPlantUMLBlock(node: Element, language: string): boolean {
  if (node.tagName !== 'pre') return false;
  
  // Get the code element
  const codeElement = node.children?.[0] as Element | undefined;
  if (!codeElement || codeElement.tagName !== 'code') return false;
  
  // Check for className as an array of strings
  const classNames = codeElement.properties?.className;
  
  if (Array.isArray(classNames)) {
    // Check for the language-plantuml class (or custom language)
    return classNames.some(className => {
      if (typeof className !== 'string') return false;
      return className === `language-${language}`;
    });
  }
  
  return false;
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
  
  // Compress with zlib deflate
  const compressed = zlib.deflateSync(text, { level: 9 });
  
  // Encode with PlantUML's custom base64 variant
  return encode64(compressed);
}