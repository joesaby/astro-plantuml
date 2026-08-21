import type { Root, Code } from 'mdast';
import type { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import type { PlantUMLOptions } from './types.js';
import {
  buildErrorHtml,
  renderPlantUmlHtml,
  resolvePlantUMLOptions,
} from './render.js';

/**
 * Create a remark plugin for PlantUML processing
 */
export function createRemarkPlugin(options: PlantUMLOptions = {}): Plugin<[], Root> {
  const resolved = resolvePlantUMLOptions(options);

  return function remarkPlantuml() {
    return async function transformer(tree: Root, file: any) {
      if (!tree || typeof tree !== 'object') {
        console.warn('Received invalid AST in remarkPlantuml plugin');
        return tree;
      }

      const currentFilePath = file?.path as string | undefined;

      const codeBlocks: Array<{
        node: Code;
        parent: any;
        index: number;
      }> = [];

      try {
        visit(tree, 'code', (node: Code, index?: number, parent?: any) => {
          if (node && parent && typeof index === 'number' && node.lang === resolved.language) {
            codeBlocks.push({
              node,
              parent,
              index,
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

      // Process in reverse so splice indices stay valid when replacing earlier siblings
      for (const { node, parent, index } of codeBlocks) {
        try {
          const content = node.value;
          if (!content) {
            console.warn('Empty PlantUML content found');
            continue;
          }

          const htmlContent = await renderPlantUmlHtml(content, resolved, currentFilePath);

          parent.children.splice(index, 1, {
            type: 'html',
            value: htmlContent,
          });
        } catch (error) {
          console.error('Error processing PlantUML diagram:', error);

          parent.children.splice(index, 1, {
            type: 'html',
            value: buildErrorHtml(node.value, (error as Error).message, resolved),
          });
        }
      }

      return tree;
    };
  };
}
