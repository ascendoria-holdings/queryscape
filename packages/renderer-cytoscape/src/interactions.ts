/**
 * User interaction handlers
 */

import type { GraphNode, GraphEdge, NodeId } from "@queryscape/core";

import type {
  CytoscapeInstance,
  CytoscapeEvent,
  RendererEventHandlers,
} from "./renderer.js";

/** Interaction handlers */
export interface InteractionHandlers {
  setHandlers(handlers: RendererEventHandlers): void;
  destroy(): void;
}

/** Create interaction handlers */
export function createInteractionHandlers(
  cy: CytoscapeInstance,
  _theme: unknown,
  getNodeData: (id: NodeId) => GraphNode | undefined,
  getEdgeData: (id: string) => GraphEdge | undefined
): InteractionHandlers {
  let handlers: RendererEventHandlers = {};
  let hoveredNodeId: NodeId | null = null;

  // Node click handler
  const nodeClickHandler = (e: CytoscapeEvent): void => {
    const nodeId = e.target.id();
    const nodeData = getNodeData(nodeId);
    if (nodeData && handlers.onNodeClick) {
      handlers.onNodeClick(nodeId, nodeData);
    }
  };

  // Node double-click handler
  const nodeDoubleClickHandler = (e: CytoscapeEvent): void => {
    const nodeId = e.target.id();
    const nodeData = getNodeData(nodeId);
    if (nodeData && handlers.onNodeDoubleClick) {
      handlers.onNodeDoubleClick(nodeId, nodeData);
    }
  };

  // Edge click handler
  const edgeClickHandler = (e: CytoscapeEvent): void => {
    const edgeId = e.target.id();
    const edgeData = getEdgeData(edgeId);
    if (edgeData && handlers.onEdgeClick) {
      handlers.onEdgeClick(edgeId, edgeData);
    }
  };

  // Canvas click handler
  const canvasClickHandler = (e: CytoscapeEvent): void => {
    // Only trigger if clicking on background, not an element
    if (e.target === (cy as unknown)) {
      handlers.onCanvasClick?.();
    }
  };

  // Node hover handlers
  const nodeMouseOverHandler = (e: CytoscapeEvent): void => {
    const nodeId = e.target.id();
    if (nodeId !== hoveredNodeId) {
      hoveredNodeId = nodeId;
      handlers.onNodeHover?.(nodeId);
    }
  };

  const nodeMouseOutHandler = (): void => {
    if (hoveredNodeId !== null) {
      hoveredNodeId = null;
      handlers.onNodeHover?.(null);
    }
  };

  // Selection change handler
  const selectionChangeHandler = (): void => {
    const selectedIds = cy
      .nodes(":selected")
      .map((n) => n.id());
    handlers.onSelectionChange?.(selectedIds);
  };

  // Register event handlers
  cy.on("tap", "node", nodeClickHandler);
  cy.on("dbltap", "node", nodeDoubleClickHandler);
  cy.on("tap", "edge", edgeClickHandler);
  cy.on("tap", canvasClickHandler);
  cy.on("mouseover", "node", nodeMouseOverHandler);
  cy.on("mouseout", "node", nodeMouseOutHandler);
  cy.on("select unselect", "node", selectionChangeHandler);

  return {
    setHandlers(newHandlers: RendererEventHandlers): void {
      handlers = newHandlers;
    },

    destroy(): void {
      cy.off("tap", "node", nodeClickHandler);
      cy.off("dbltap", "node", nodeDoubleClickHandler);
      cy.off("tap", "edge", edgeClickHandler);
      cy.off("tap", canvasClickHandler);
      cy.off("mouseover", "node", nodeMouseOverHandler);
      cy.off("mouseout", "node", nodeMouseOutHandler);
      cy.off("select unselect", "node", selectionChangeHandler);
    },
  };
}
