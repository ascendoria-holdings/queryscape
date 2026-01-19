import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  'packages/core/vitest.config.ts',
  'packages/connectors/vitest.config.ts',
  'packages/renderer-cytoscape/vitest.config.ts',
]);
