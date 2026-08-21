import axios from 'axios';
import * as zlib from 'node:zlib';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { PlantUMLOptions } from './types.js';
import { encode64 } from './utils.js';

/**
 * Resolved options with defaults applied
 */
export interface ResolvedPlantUMLOptions {
  serverUrl: string;
  timeout: number;
  addWrapperClasses: boolean;
  language: string;
  format: 'png' | 'svg';
  removeInlineStyles: boolean;
  diagramsPath?: string;
}

/**
 * Apply defaults to PlantUML options
 */
export function resolvePlantUMLOptions(options: PlantUMLOptions = {}): ResolvedPlantUMLOptions {
  const format = options.format || 'png';
  return {
    format,
    serverUrl: options.serverUrl || `https://www.plantuml.com/plantuml/${format}/`,
    timeout: options.timeout || 10000,
    addWrapperClasses: options.addWrapperClasses !== false,
    language: options.language || 'plantuml',
    removeInlineStyles: options.removeInlineStyles || false,
    diagramsPath: options.diagramsPath,
  };
}

/**
 * Encode PlantUML source for a PlantUML server URL
 */
export function encodePlantUmlForUrl(plantUmlText: string): string {
  let text = plantUmlText.trim();
  if (!text.startsWith('@startuml')) {
    text = '@startuml\n' + text;
  }
  if (!text.endsWith('@enduml')) {
    text = text + '\n@enduml';
  }

  const compressed = zlib.deflateRawSync(text, { level: 9 });
  return encode64(compressed);
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Remove specific inline styles from SVG for better CSS control
 */
export function removeInlineStylesFromSvg(svgContent: string): string {
  return svgContent.replace(/style="([^"]*)"/g, (_match, styleContent: string) => {
    const cleanedStyles = styleContent
      .replace(/\bbackground[^;]*;?/g, '')
      .replace(/width:[^;]*;?/g, 'max-width:100%;')
      .replace(/height:[^;]*;?/g, 'auto')
      .replace(/;+/g, ';')
      .replace(/^;|;$/g, '');

    return cleanedStyles ? `style="${cleanedStyles}"` : '';
  });
}

/**
 * Find a pre-generated local diagram file for PlantUML content
 */
export function findLocalFile(
  content: string,
  currentFilePath: string | undefined,
  diagramsPath: string = 'diagrams',
  format: string = 'svg'
): string | Buffer | null {
  if (!currentFilePath) {
    return null;
  }

  const hash = crypto.createHash('md5').update(content).digest('hex');

  let projectRoot = path.dirname(currentFilePath);
  while (projectRoot && projectRoot !== path.dirname(projectRoot)) {
    if (fs.existsSync(path.join(projectRoot, 'package.json'))) {
      break;
    }
    projectRoot = path.dirname(projectRoot);
  }

  if (!projectRoot) {
    console.warn('Could not find project root for local diagram lookup');
    return null;
  }

  const diagramsDir = path.join(projectRoot, diagramsPath);
  const relativePath = path.relative(projectRoot, currentFilePath);
  const baseFileName = relativePath.replace(/[\/\\]/g, '-').replace(/\.md$/, '');
  const fileName = `${baseFileName}-${hash}.${format}`;
  const filePath = path.join(diagramsDir, fileName);

  if (fs.existsSync(filePath)) {
    try {
      if (format === 'svg') {
        return fs.readFileSync(filePath, 'utf8');
      }
      if (format === 'png') {
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to read local ${format.toUpperCase()} file: ${filePath}`, error);
      return null;
    }
  }

  return null;
}

function buildSvgHtml(svgContent: string, options: ResolvedPlantUMLOptions): string {
  let svg = svgContent;

  if (options.removeInlineStyles) {
    svg = removeInlineStylesFromSvg(svg);
  }

  if (options.addWrapperClasses && !svg.includes('class=')) {
    svg = svg.replace('<svg', '<svg class="plantuml-svg"');
  }

  return `<figure${options.addWrapperClasses ? ' class="plantuml-diagram"' : ''}>
  ${svg}
</figure>`;
}

function buildPngHtml(pngData: Buffer, options: ResolvedPlantUMLOptions): string {
  const imgSrc = `data:image/png;base64,${pngData.toString('base64')}`;
  return `<figure${options.addWrapperClasses ? ' class="plantuml-diagram"' : ''}>
  <img src="${imgSrc}" alt="PlantUML Diagram"${options.addWrapperClasses ? ' class="plantuml-img"' : ''} />
</figure>`;
}

/**
 * Build an error HTML fallback that preserves the original PlantUML source
 */
export function buildErrorHtml(
  content: string,
  message: string,
  options: ResolvedPlantUMLOptions
): string {
  return `<div${options.addWrapperClasses ? ' class="plantuml-error"' : ''}>
  <p>Error generating PlantUML diagram: ${escapeHtml(message)}</p>
  <pre><code class="language-${options.language}">${escapeHtml(content)}</code></pre>
</div>`;
}

/**
 * Render a PlantUML code block to HTML (local file or PlantUML server)
 */
export async function renderPlantUmlHtml(
  content: string,
  options: ResolvedPlantUMLOptions,
  currentFilePath?: string
): Promise<string> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Empty PlantUML content');
  }

  if (options.diagramsPath) {
    const localFile = findLocalFile(trimmed, currentFilePath, options.diagramsPath, options.format);

    if (localFile) {
      console.log(`Using local ${options.format.toUpperCase()} file for PlantUML diagram`);

      if (options.format === 'svg' && typeof localFile === 'string') {
        return buildSvgHtml(localFile, options);
      }
      if (options.format === 'png' && Buffer.isBuffer(localFile)) {
        return buildPngHtml(localFile, options);
      }
    } else {
      console.warn(`Local ${options.format.toUpperCase()} file not found, falling back to server generation`);
    }
  }

  const encodedContent = encodePlantUmlForUrl(trimmed);
  const url = `${options.serverUrl}${encodedContent}`;

  const response = await axios.get(url, {
    responseType: options.format === 'svg' ? 'text' : 'arraybuffer',
    timeout: options.timeout,
  });

  if (options.format === 'svg') {
    return buildSvgHtml(response.data as string, options);
  }

  return buildPngHtml(Buffer.from(response.data), options);
}
