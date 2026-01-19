/**
 * Layout manager for Cytoscape.js
 */

import type { Core as CytoscapeCore, LayoutOptions } from 'cytoscape';

/** Available layout names */
export type LayoutName =
  | 'cose'
  | 'circle'
  | 'grid'
  | 'breadthfirst'
  | 'concentric'
  | 'random'
  | 'preset';

/** Layout run options */
export interface LayoutRunOptions {
  /** Whether to animate the layout transition */
  animate?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  /** Callback when layout completes */
  onComplete?: () => void;
  /** Additional layout-specific options */
  options?: Record<string, unknown>;
}

/** Default layout options for each layout type */
const LAYOUT_DEFAULTS: Record<LayoutName, Partial<LayoutOptions>> = {
  cose: {
    name: 'cose',
    fit: true,
    padding: 30,
    nodeRepulsion: () => 400000,
    idealEdgeLength: () => 100,
    edgeElasticity: () => 100,
    nestingFactor: 5,
    gravity: 80,
    numIter: 1000,
    initialTemp: 200,
    coolingFactor: 0.95,
    minTemp: 1.0,
  },
  circle: {
    name: 'circle',
    fit: true,
    padding: 30,
    radius: undefined,
    startAngle: (3 / 2) * Math.PI,
    sweep: undefined,
    clockwise: true,
  },
  grid: {
    name: 'grid',
    fit: true,
    padding: 30,
    rows: undefined,
    cols: undefined,
    condense: false,
  },
  breadthfirst: {
    name: 'breadthfirst',
    fit: true,
    padding: 30,
    directed: false,
    circle: false,
    spacingFactor: 1.75,
    maximal: false,
  },
  concentric: {
    name: 'concentric',
    fit: true,
    padding: 30,
    startAngle: (3 / 2) * Math.PI,
    sweep: undefined,
    clockwise: true,
    equidistant: false,
    minNodeSpacing: 10,
  },
  random: {
    name: 'random',
    fit: true,
    padding: 30,
  },
  preset: {
    name: 'preset',
    fit: true,
    padding: 30,
    positions: undefined,
  },
};

/**
 * LayoutManager handles layout computation and animation for Cytoscape graphs
 */
export class LayoutManager {
  private cy: CytoscapeCore;
  private currentLayout: LayoutName = 'cose';

  constructor(cy: CytoscapeCore) {
    this.cy = cy;
  }

  /**
   * Run a layout on the graph
   */
  run(name: LayoutName, options: LayoutRunOptions = {}): void {
    const {
      animate = true,
      animationDuration = 500,
      onComplete,
      options: customOptions = {},
    } = options;

    this.currentLayout = name;

    const layoutOptions: LayoutOptions = {
      ...LAYOUT_DEFAULTS[name],
      ...customOptions,
      name,
      fit: true,
      padding: LAYOUT_DEFAULTS[name]?.padding ?? 30,
      animate,
      animationDuration,
      animationEasing: 'ease-out-quad',
    } as LayoutOptions;

    const layout = this.cy.layout(layoutOptions);

    if (onComplete) {
      layout.on('layoutstop', onComplete);
    }

    layout.run();
  }

  /**
   * Get the current layout name
   */
  getCurrentLayout(): LayoutName {
    return this.currentLayout;
  }

  /**
   * Get all available layout names
   */
  getAvailableLayouts(): LayoutName[] {
    return Object.keys(LAYOUT_DEFAULTS) as LayoutName[];
  }

  /**
   * Stop any running layout animation
   */
  stop(): void {
    this.cy.stop();
  }
}
