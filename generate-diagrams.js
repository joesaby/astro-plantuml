#!/usr/bin/env node

import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { createGeneratePlugin } from './dist/remark-plugin-generate.js';
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Generate PlantUML diagrams for markdown files
 * Usage: node generate-diagrams.js [pattern] [options]
 */
async function generateDiagrams() {
  const args = process.argv.slice(2);
  const pattern = args[0] || 'src/**/*.md';
  
  // Configuration - adjust as needed
  const options = {
    serverUrl: 'http://localhost:8080/svg/',
    format: 'svg',
    diagramsPath: 'diagrams',
    timeout: 10000
  };

  console.log('PlantUML Diagram Generator');
  console.log('==========================');
  console.log(`Pattern: ${pattern}`);
  console.log(`Server: ${options.serverUrl}`);
  console.log(`Output: ${options.diagramsPath}`);
  console.log('');

  try {
    // Find markdown files
    const files = await glob(pattern, { ignore: 'node_modules/**' });
    
    if (files.length === 0) {
      console.log('No markdown files found');
      return;
    }

    console.log(`Found ${files.length} markdown files`);

    // Create processor with generate plugin
    const processor = unified()
      .use(remarkParse)
      .use(createGeneratePlugin(options));

    // Process each file
    for (const file of files) {
      console.log(`\nProcessing: ${file}`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const vfile = { path: path.resolve(file) };
        
        await processor.process({ value: content, ...vfile });
      } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
      }
    }

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDiagrams();
}