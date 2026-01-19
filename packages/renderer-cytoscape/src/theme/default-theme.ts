/**
 * Default themes for Cytoscape rendering
 */

import type { Theme } from './theme-engine';

/** Default light theme */
export const DEFAULT_THEME: Theme = {
  name: 'default',
  backgroundColor: '#ffffff',
  node: {
    backgroundColor: '#6FB1FC',
    borderColor: '#4A90D9',
    borderWidth: 2,
    shape: 'ellipse',
    width: 50,
    height: 50,
    labelColor: '#333333',
    labelFontSize: 12,
    labelFontWeight: 'normal',
  },
  nodeSelected: {
    backgroundColor: '#FFD54F',
    borderColor: '#FFA000',
    borderWidth: 3,
  },
  nodeHighlighted: {
    backgroundColor: '#81C784',
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  edge: {
    lineColor: '#9E9E9E',
    width: 2,
    lineStyle: 'solid',
    curveStyle: 'bezier',
    targetArrowShape: 'triangle',
    targetArrowColor: '#9E9E9E',
    labelColor: '#666666',
    labelFontSize: 10,
  },
  edgeSelected: {
    lineColor: '#FFD54F',
    width: 3,
    targetArrowColor: '#FFD54F',
  },
  nodeByLabel: {
    Person: {
      backgroundColor: '#6FB1FC',
      shape: 'ellipse',
    },
    Company: {
      backgroundColor: '#FFA726',
      shape: 'round-rectangle',
    },
    Project: {
      backgroundColor: '#AB47BC',
      shape: 'diamond',
    },
    Document: {
      backgroundColor: '#66BB6A',
      shape: 'rectangle',
    },
  },
  edgeByType: {
    KNOWS: {
      lineColor: '#42A5F5',
      lineStyle: 'solid',
    },
    WORKS_AT: {
      lineColor: '#FFA726',
      lineStyle: 'dashed',
    },
    MANAGES: {
      lineColor: '#EF5350',
      lineStyle: 'solid',
      width: 3,
    },
    REPORTS_TO: {
      lineColor: '#7E57C2',
      lineStyle: 'dotted',
    },
  },
};

/** Dark theme */
export const DARK_THEME: Theme = {
  name: 'dark',
  backgroundColor: '#1E1E1E',
  node: {
    backgroundColor: '#4A90D9',
    borderColor: '#2196F3',
    borderWidth: 2,
    shape: 'ellipse',
    width: 50,
    height: 50,
    labelColor: '#E0E0E0',
    labelFontSize: 12,
    labelFontWeight: 'normal',
  },
  nodeSelected: {
    backgroundColor: '#FFC107',
    borderColor: '#FF9800',
    borderWidth: 3,
  },
  nodeHighlighted: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
    borderWidth: 3,
  },
  edge: {
    lineColor: '#757575',
    width: 2,
    lineStyle: 'solid',
    curveStyle: 'bezier',
    targetArrowShape: 'triangle',
    targetArrowColor: '#757575',
    labelColor: '#BDBDBD',
    labelFontSize: 10,
  },
  edgeSelected: {
    lineColor: '#FFC107',
    width: 3,
    targetArrowColor: '#FFC107',
  },
  nodeByLabel: {
    Person: {
      backgroundColor: '#4A90D9',
      shape: 'ellipse',
    },
    Company: {
      backgroundColor: '#F57C00',
      shape: 'round-rectangle',
    },
    Project: {
      backgroundColor: '#9C27B0',
      shape: 'diamond',
    },
    Document: {
      backgroundColor: '#43A047',
      shape: 'rectangle',
    },
  },
  edgeByType: {
    KNOWS: {
      lineColor: '#1E88E5',
      lineStyle: 'solid',
    },
    WORKS_AT: {
      lineColor: '#F57C00',
      lineStyle: 'dashed',
    },
    MANAGES: {
      lineColor: '#E53935',
      lineStyle: 'solid',
      width: 3,
    },
    REPORTS_TO: {
      lineColor: '#5E35B1',
      lineStyle: 'dotted',
    },
  },
};
