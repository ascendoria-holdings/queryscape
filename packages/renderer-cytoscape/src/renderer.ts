/**
 * Main Cytoscape renderer
 */

import type {
  GraphData,
  GraphNode,
  GraphEdge,
  GraphPatch,
  NodeId,
} from "@queryscape/core";

import { createInteractionHandlers, type InteractionHandlers } from "./interactions.js";
import { runLayout, type LayoutOptions, DEFAULT_LAYOUT_OPTIONS } from "./layout.js";
import { applyPatchToCytoscape } from "./patch-applier.js";
import { type Theme, DEFAULT_THEME } from "./theme.js";

/** Cytoscape instance type */
export interface CytoscapeInstance {
  mount(container: HTMLElement): void;
  unmount(): void;
  add(elements: CytoscapeElement | CytoscapeElement[]): void;
  remove(selector: string): void;
  elements(selector?: string): CytoscapeCollection;
  nodes(selector?: string): CytoscapeCollection;
  edges(selector?: string): CytoscapeCollection;
  getElementById(id: string): CytoscapeElement;
  layout(options: Record<string, unknown>): { run(): void };
  style(styles?: CytoscapeStylesheet[]): void;
  fit(padding?: number): void;
  center(): void;
  zoom(level?: number): number;
  pan(position?: { x: number; y: number }): { x: number; y: number };
  on(event: string, handler: (e: CytoscapeEvent) => void): void;
  on(event: string, selector: string, handler: (e: CytoscapeEvent) => void): void;
  off(event: string, handler?: (e: CytoscapeEvent) => void): void;
  off(event: string, selector: string, handler?: (e: CytoscapeEvent) => void): void;
  destroy(): void;
  json(): { elements: { nodes: CytoscapeElement[]; edges: CytoscapeElement[] } };
  batch(fn: () => void): void;
}

export interface CytoscapeElement {
  data(key?: string): unknown;
  id(): string;
  isNode(): boolean;
  isEdge(): boolean;
  addClass(className: string): void;
  removeClass(className: string): void;
  hasClass(className: string): boolean;
  select(): void;
  unselect(): void;
  position(pos?: { x: number; y: number }): { x: number; y: number };
  neighborhood(): CytoscapeCollection;
  connectedEdges(): CytoscapeCollection;
}

export interface CytoscapeCollection {
  length: number;
  forEach(fn: (ele: CytoscapeElement, i: number) => void): void;
  filter(fn: (ele: CytoscapeElement) => boolean): CytoscapeCollection;
  map<T>(fn: (ele: CytoscapeElement) => T): T[];
  addClass(className: string): void;
  removeClass(className: string): void;
  select(): void;
  unselect(): void;
  remove(): void;
  add(element: CytoscapeElement | CytoscapeCollection): CytoscapeCollection;
  nodes(selector?: string): CytoscapeCollection;
  edges(selector?: string): CytoscapeCollection;
}

export interface CytoscapeEvent {
  target: CytoscapeElement;
  position: { x: number; y: number };
  originalEvent?: MouseEvent;
}

export interface CytoscapeStylesheet {
  selector: string;
  style: Record<string, unknown>;
}

/** Cytoscape factory function type */
export type CytoscapeFactory = (options: {
  container?: HTMLElement;
  elements?: { nodes: CytoscapeElement[]; edges: CytoscapeElement[] };
  style?: CytoscapeStylesheet[];
  layout?: Record<string, unknown>;
}) => CytoscapeInstance;

/** Renderer configuration */
export interface RendererConfig {
  /** Cytoscape factory (from cytoscape import) */
  cytoscape: CytoscapeFactory;
  /** Container element */
  container: HTMLElement;
  /** Initial data */
  data?: GraphData;
  /** Theme configuration */
  theme?: Partial<Theme>;
  /** Layout options */
  layout?: Partial<LayoutOptions>;
  /** Enable interactions */
  interactions?: boolean;
}

/** Renderer event handlers */
export interface RendererEventHandlers {
  onNodeClick?: (nodeId: NodeId, node: GraphNode) => void;
  onNodeDoubleClick?: (nodeId: NodeId, node: GraphNode) => void;
  onEdgeClick?: (edgeId: string, edge: GraphEdge) => void;
  onCanvasClick?: () => void;
  onNodeHover?: (nodeId: NodeId | null) => void;
  onSelectionChange?: (selectedNodeIds: NodeId[]) => void;
}

/** Graph renderer class */
export class GraphRenderer {
  private cy: CytoscapeInstance;
  private readonly theme: Theme;
  private readonly layoutOptions: LayoutOptions;
  private nodeDataMap = new Map<NodeId, GraphNode>();
  private edgeDataMap = new Map<string, GraphEdge>();
  private interactionHandlers: InteractionHandlers | null = null;

  constructor(config: RendererConfig) {
    this.theme = { ...DEFAULT_THEME, ...config.theme };
    this.layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...config.layout };

    // Initialize Cytoscape
    this.cy = config.cytoscape({
      container: config.container,
      elements: { nodes: [], edges: [] },
      style: this.buildStylesheet(),
      layout: { name: "preset" },
    });

    // Set up interactions if enabled
    if (config.interactions !== false) {
      this.interactionHandlers = createInteractionHandlers(
        this.cy,
        this.theme,
        (nodeId) => this.nodeDataMap.get(nodeId),
        (edgeId) => this.edgeDataMap.get(edgeId)
      );
    }

    // Load initial data
    if (config.data) {
      this.setData(config.data);
    }
  }

  /** Build Cytoscape stylesheet from theme */
  private buildStylesheet(): CytoscapeStylesheet[] {
    return [
      {
        selector: "node",
        style: {
          "background-color": this.theme.nodeColor,
          label: "data(label)",
          "text-valign": "center",
          "text-halign": "center",
          "font-size": this.theme.fontSize,
          color: this.theme.textColor,
          width: this.theme.nodeSize,
          height: this.theme.nodeSize,
          "border-width": 2,
          "border-color": this.theme.nodeBorderColor,
        },
      },
      {
        selector: "edge",
        style: {
          width: this.theme.edgeWidth,
          "line-color": this.theme.edgeColor,
          "target-arrow-color": this.theme.edgeColor,
          "target-arrow-shape": "triangle",
          "curve-style": "bezier",
          label: "data(label)",
          "font-size": this.theme.fontSize - 2,
          color: this.theme.textColor,
          "text-rotation": "autorotate",
        },
      },
      {
        selector: "node:selected",
        style: {
          "background-color": this.theme.selectedNodeColor,
          "border-color": this.theme.selectedBorderColor,
          "border-width": 3,
        },
      },
      {
        selector: "edge:selected",
        style: {
          "line-color": this.theme.selectedEdgeColor,
          "target-arrow-color": this.theme.selectedEdgeColor,
          width: this.theme.edgeWidth + 1,
        },
      },
      {
        selector: ".highlighted",
        style: {
          "background-color": this.theme.highlightColor,
          "border-color": this.theme.highlightBorderColor,
          "border-width": 3,
        },
      },
      {
        selector: ".dimmed",
        style: {
          opacity: 0.3,
        },
      },
      {
        selector: ".search-match",
        style: {
          "background-color": this.theme.searchMatchColor,
          "border-width": 4,
        },
      },
    ];
  }

  /** Set complete graph data */
  setData(data: GraphData): void {
    this.cy.batch(() => {
      // Clear existing
      this.cy.elements().remove();
      this.nodeDataMap.clear();
      this.edgeDataMap.clear();

      // Add nodes
      for (const node of data.nodes) {
        this.nodeDataMap.set(node.id, node);
        this.cy.add({
          group: "nodes",
          data: {
            id: node.id,
            label: this.getNodeLabel(node),
            ...node.properties,
          },
        } as unknown as CytoscapeElement);
      }

      // Add edges
      for (const edge of data.edges) {
        this.edgeDataMap.set(edge.id, edge);
        this.cy.add({
          group: "edges",
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.type,
            ...edge.properties,
          },
        } as unknown as CytoscapeElement);
      }
    });

    this.runLayout();
  }

  /** Apply a graph patch */
  applyPatch(patch: GraphPatch): void {
    applyPatchToCytoscape(
      this.cy,
      patch,
      this.nodeDataMap,
      this.edgeDataMap,
      (node) => this.getNodeLabel(node)
    );
  }

  /** Get node display label */
  private getNodeLabel(node: GraphNode): string {
    // Try common label properties
    const labelProps = ["name", "title", "label", "id"];
    for (const prop of labelProps) {
      if (node.properties[prop]) {
        return String(node.properties[prop]);
      }
    }
    // Fall back to first label + truncated ID
    return `${node.labels[0] ?? "Node"}:${node.id.substring(0, 8)}`;
  }

  /** Run layout algorithm */
  runLayout(options?: Partial<LayoutOptions>): void {
    runLayout(this.cy, { ...this.layoutOptions, ...options });
  }

  /** Set event handlers */
  setEventHandlers(handlers: RendererEventHandlers): void {
    if (this.interactionHandlers) {
      this.interactionHandlers.setHandlers(handlers);
    }
  }

  /** Highlight nodes matching search */
  highlightSearch(text: string): NodeId[] {
    const lowerText = text.toLowerCase();
    const matches: NodeId[] = [];

    this.cy.nodes().forEach((node: CytoscapeElement) => {
      const nodeData = this.nodeDataMap.get(node.id());
      if (!nodeData) return;

      const searchable = [
        nodeData.id,
        ...nodeData.labels,
        ...Object.values(nodeData.properties).map(String),
      ].join(" ").toLowerCase();

      if (searchable.includes(lowerText)) {
        matches.push(node.id());
        node.addClass("search-match");
      } else {
        node.removeClass("search-match");
      }
    });

    return matches;
  }

  /** Clear search highlighting */
  clearSearchHighlight(): void {
    this.cy.nodes().removeClass("search-match");
  }

  /** Select nodes by ID */
  selectNodes(nodeIds: NodeId[]): void {
    this.cy.nodes().unselect();
    for (const nodeId of nodeIds) {
      this.cy.getElementById(nodeId).select();
    }
  }

  /** Get selected node IDs */
  getSelectedNodeIds(): NodeId[] {
    return this.cy.nodes(":selected").map((n: CytoscapeElement) => n.id());
  }

  /** Focus on a node (center and highlight) */
  focusNode(nodeId: NodeId): void {
    const node = this.cy.getElementById(nodeId);
    if (!node) return;

    this.cy.nodes().removeClass("highlighted");
    this.cy.edges().removeClass("highlighted");

    node.addClass("highlighted");
    node.connectedEdges().addClass("highlighted");
    node.neighborhood().nodes().addClass("highlighted");

    this.cy.fit();
  }

  /** Dim all except connected to node */
  dimExceptNeighborhood(nodeId: NodeId): void {
    const node = this.cy.getElementById(nodeId);
    if (!node) return;

    const neighborhood = node.neighborhood().add(node);
    this.cy.elements().addClass("dimmed");
    neighborhood.removeClass("dimmed");
  }

  /** Clear all dimming */
  clearDimming(): void {
    this.cy.elements().removeClass("dimmed");
  }

  /** Fit graph to viewport */
  fit(padding = 50): void {
    this.cy.fit(padding);
  }

  /** Center graph */
  center(): void {
    this.cy.center();
  }

  /** Get/set zoom level */
  zoom(level?: number): number {
    if (level !== undefined) {
      return this.cy.zoom(level);
    }
    return this.cy.zoom();
  }

  /** Export graph as PNG (requires cytoscape-image extension) */
  async exportImage(): Promise<string | null> {
    // This requires the cytoscape-image extension
    // Return null if not available
    const cy = this.cy as unknown as { png?: () => string };
    if (typeof cy.png === "function") {
      return cy.png();
    }
    return null;
  }

  /** Get current data */
  getData(): GraphData {
    return {
      nodes: Array.from(this.nodeDataMap.values()),
      edges: Array.from(this.edgeDataMap.values()),
    };
  }

  /** Apply theme updates */
  setTheme(theme: Partial<Theme>): void {
    Object.assign(this.theme, theme);
    this.cy.style(this.buildStylesheet());
  }

  /** Destroy renderer */
  destroy(): void {
    if (this.interactionHandlers) {
      this.interactionHandlers.destroy();
    }
    this.cy.destroy();
  }
}

/** Create a graph renderer */
export function createRenderer(config: RendererConfig): GraphRenderer {
  return new GraphRenderer(config);
}
