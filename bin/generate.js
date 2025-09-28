#!/usr/bin/env node

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { generateDiagramsFromAst } from '../dist/remark-cli.js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Generate PlantUML diagrams for markdown files
 * Usage: npx astro-plantuml generate [pattern] [options]
 */
async function generateDiagrams() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let pattern = '**/*.md';
  let options = {
    serverUrl: 'https://www.plantuml.com/plantuml/svg/',
    format: 'svg',
    diagramsPath: 'diagrams',
    timeout: 10000
  };

  let i = 0;
  if (args[i] === 'generate') i++; // Skip 'generate' command if present
  
  // First non-option argument is the pattern
  if (args[i] && !args[i].startsWith('--')) {
    pattern = args[i];
    i++;
  }
  
  // Parse options
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--format' && args[i + 1]) {
      options.format = args[i + 1];
      options.serverUrl = `https://www.plantuml.com/plantuml/${args[i + 1]}/`;
      i += 2;
    } else if (arg === '--server' && args[i + 1]) {
      options.serverUrl = args[i + 1];
      i += 2;
    } else if (arg === '--output' && args[i + 1]) {
      options.diagramsPath = args[i + 1];
      i += 2;
    } else if (arg === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]);
      i += 2;
    } else {
      console.warn(`Unknown option: ${arg}`);
      i++;
    }
  }

  console.log('PlantUML Diagram Generator');
  console.log('==========================');
  console.log(`Pattern: ${pattern}`);
  console.log(`Server: ${options.serverUrl}`);
  console.log(`Output: ${options.diagramsPath || 'diagrams'}`);
  console.log('');

  try {
    // Find markdown files
    const files = await glob(pattern, { ignore: 'node_modules/**' });
    
    if (files.length === 0) {
      console.log('No markdown files found');
      return;
    }

    console.log(`Found ${files.length} markdown files`);

    // Create processor to parse markdown
    const processor = unified()
      .use(remarkParse);

    // Process each file
    for (const file of files) {
      console.log(`\nProcessing: ${file}`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const vfile = { value: content };
        const tree = processor.parse(vfile);
        
        await generateDiagramsFromAst(tree, path.resolve(file), options);
      } catch (error) {
        console.error(`  Error: ${error.message}`);
      }
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}


// Show usage if no arguments or help requested
if (process.argv.length <= 2 || process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('astro-plantuml generate');
  console.log('');
  console.log('Generate PlantUML diagrams from markdown files');
  console.log('');
  console.log('Usage:');
  console.log('  npx astro-plantuml generate [pattern] [options]');
  console.log('');
  console.log('Options:');
  console.log('  --format FORMAT    Output format (svg, png) [default: svg]');
  console.log('  --server URL       PlantUML server URL');
  console.log('  --output PATH      Output directory [default: diagrams]');
  console.log('  --timeout MS       Request timeout in milliseconds [default: 10000]');
  console.log('');
  console.log('Examples:');
  console.log('  npx astro-plantuml generate');
  console.log('  npx astro-plantuml generate "src/**/*.md"');
  console.log('  npx astro-plantuml generate "docs/*.md" --format png');
  console.log('  npx astro-plantuml generate --server http://localhost:8080/png/ --format png');
  process.exit(0);
}

// Run generator
generateDiagrams().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});