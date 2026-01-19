/**
 * Layout algorithms and configuration
 */

import type { CytoscapeInstance } from "./renderer.js";

/** Available layout algorithms */
export type LayoutAlgorithm =
  | "cose"
  | "cola"
  | "dagre"
  | "grid"
  | "circle"
  | "concentric"
  | "breadthfirst"
  | "preset"
  | "random";

/** Layout options */
export interface LayoutOptions {
  /** Layout algorithm */
  algorithm: LayoutAlgorithm;
  /** Animate layout */
  animate: boolean;
  /** Animation duration in ms */
  animationDuration: number;
  /** Padding around graph */
  padding: number;
  /** Fit to viewport after layout */
  fit: boolean;
  /** Algorithm-specific options */
  algorithmOptions?: Record<string, unknown>;
}

/** Default layout options */
export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  algorithm: "cose",
  animate: true,
  animationDuration: 500,
  padding: 50,
  fit: true,
};

/** COSE layout defaults */
const COSE_DEFAULTS = {
  name: "cose",
  idealEdgeLength: 100,
  nodeOverlap: 20,
  refresh: 20,
  randomize: false,
  componentSpacing: 100,
  nodeRepulsion: 400000,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
};

/** Grid layout defaults */
const GRID_DEFAULTS = {
  name: "grid",
  avoidOverlap: true,
  avoidOverlapPadding: 10,
  condense: false,
  rows: undefined,
  cols: undefined,
};

/** Circle layout defaults */
const CIRCLE_DEFAULTS = {
  name: "circle",
  avoidOverlap: true,
  radius: undefined,
  startAngle: (3 / 2) * Math.PI,
  sweep: undefined,
  clockwise: true,
};

/** Breadthfirst layout defaults */
const BREADTHFIRST_DEFAULTS = {
  name: "breadthfirst",
  directed: true,
  spacingFactor: 1.75,
  avoidOverlap: true,
  roots: undefined,
};

/** Concentric layout defaults */
const CONCENTRIC_DEFAULTS = {
  name: "concentric",
  levelWidth: () => 1,
  minNodeSpacing: 50,
  avoidOverlap: true,
  startAngle: (3 / 2) * Math.PI,
  clockwise: true,
};

/** Get layout configuration */
function getLayoutConfig(options: LayoutOptions): Record<string, unknown> {
  const baseConfig = {
    animate: options.animate,
    animationDuration: options.animationDuration,
    padding: options.padding,
    fit: options.fit,
  };

  switch (options.algorithm) {
    case "cose":
      return { ...COSE_DEFAULTS, ...baseConfig, ...options.algorithmOptions };
    case "grid":
      return { ...GRID_DEFAULTS, ...baseConfig, ...options.algorithmOptions };
    case "circle":
      return { ...CIRCLE_DEFAULTS, ...baseConfig, ...options.algorithmOptions };
    case "breadthfirst":
      return { ...BREADTHFIRST_DEFAULTS, ...baseConfig, ...options.algorithmOptions };
    case "concentric":
      return { ...CONCENTRIC_DEFAULTS, ...baseConfig, ...options.algorithmOptions };
    case "random":
      return { name: "random", ...baseConfig };
    case "preset":
      return { name: "preset", ...baseConfig };
    default:
      return { name: options.algorithm, ...baseConfig, ...options.algorithmOptions };
  }
}

/** Run layout on Cytoscape instance */
export function runLayout(
  cy: CytoscapeInstance,
  options: LayoutOptions
): void {
  const config = getLayoutConfig(options);
  const layout = cy.layout(config);
  layout.run();
}

/** Run layout only on specific nodes */
export function runLayoutOnNodes(
  cy: CytoscapeInstance,
  nodeIds: string[],
  options: LayoutOptions
): void {
  const config = getLayoutConfig(options);
  const selector = nodeIds.map((id) => `#${id}`).join(", ");
  const nodes = cy.nodes(selector);

  if (nodes.length > 0) {
    const layout = (nodes as unknown as { layout(opts: Record<string, unknown>): { run(): void } }).layout(config);
    layout.run();
  }
}
