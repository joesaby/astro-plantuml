---
title: Configuration
description: Learn about the configuration options available in astro-plantuml.
---

# Configuration

The astro-plantuml integration accepts the following configuration options:

## Core Options

### `serverUrl`

The URL of the PlantUML server to use for rendering diagrams.

```js
plantuml({
  serverUrl: 'https://www.plantuml.com/plantuml/svg/'
})
```

**Default:** `'https://www.plantuml.com/plantuml/png/'`

### `format`

The output format for diagrams: `'svg'` or `'png'`.

```js
plantuml({
  format: 'svg'
})
```

**Default:** `'png'`

### `diagramsPath`

Path for storing/reading pre-generated diagrams. When set, enables local file lookup with server fallback.

```js
plantuml({
  diagramsPath: 'diagrams'
})
```

**Default:** `undefined` (always use server)

### `timeout`

Timeout for HTTP requests to the PlantUML server in milliseconds.

```js
plantuml({
  timeout: 15000
})
```

**Default:** `10000`

## Styling Options

### `addWrapperClasses`

Whether to add CSS classes to wrapper elements for styling.

```js
plantuml({
  addWrapperClasses: true
})
```

**Default:** `true`

### `removeInlineStyles`

Remove inline styles from SVG elements for better CSS control. Only applies when `format` is `'svg'`.

```js
plantuml({
  format: 'svg',
  removeInlineStyles: true
})
```

**Default:** `false`

### `language`

Language identifier in code blocks to process as PlantUML.

```js
plantuml({
  language: 'plantuml'
})
```

**Default:** `'plantuml'`

## Complete Configuration Examples

### Basic Configuration
```js
import { defineConfig } from 'astro/config';
import plantuml from 'astro-plantuml';

export default defineConfig({
  integrations: [
    plantuml({
      format: 'svg',
      serverUrl: 'https://www.plantuml.com/plantuml/svg/'
    })
  ]
});
```

### Development with Local Files
```js
import { defineConfig } from 'astro/config';
import plantuml from 'astro-plantuml';

export default defineConfig({
  integrations: [
    plantuml({
      format: 'svg',
      serverUrl: 'http://localhost:8080/svg/', // Local PlantUML server
      diagramsPath: 'diagrams', // Enable local file caching
      removeInlineStyles: true // Better CSS control
    })
  ]
});
```

### All Options
```js
import { defineConfig } from 'astro/config';
import plantuml from 'astro-plantuml';

export default defineConfig({
  integrations: [
    plantuml({
      serverUrl: 'https://www.plantuml.com/plantuml/svg/',
      format: 'svg',
      diagramsPath: 'diagrams',
      timeout: 15000,
      addWrapperClasses: true,
      removeInlineStyles: true,
      language: 'plantuml'
    })
  ]
});
```

## Workflow Configurations

### Server-Only Mode (Default)
Best for simple setups with reliable internet connection:

```js
plantuml({
  serverUrl: 'https://www.plantuml.com/plantuml/svg/',
  format: 'svg'
})
```

### Local File Mode with Fallback
Best for development/production workflows with pre-generated diagrams:

```js
plantuml({
  serverUrl: 'http://localhost:8080/svg/', // Development
  format: 'svg',
  diagramsPath: 'diagrams' // Use local files when available
})
```

## CSS Classes

When `addWrapperClasses` is enabled, the following CSS classes are added:

- `plantuml-diagram`: Wrapper around the diagram
- `plantuml-img`: The actual image element (PNG format)
- `plantuml-svg`: The SVG element (SVG format)
- `plantuml-error`: Error message container

```css
.plantuml-diagram {
  margin: 2rem 0;
  text-align: center;
}

.plantuml-svg {
  max-width: 100%;
  height: auto;
  border: 1px solid #eee;
  border-radius: 4px;
}
``` 