/**
 * Apply graph patches to Cytoscape
 */

import type {
  GraphPatch,
  GraphNode,
  GraphEdge,
  NodeId,
} from "@queryscape/core";

import type { CytoscapeInstance, CytoscapeElement } from "./renderer.js";

/** Apply a graph patch to Cytoscape instance */
export function applyPatchToCytoscape(
  cy: CytoscapeInstance,
  patch: GraphPatch,
  nodeDataMap: Map<NodeId, GraphNode>,
  edgeDataMap: Map<string, GraphEdge>,
  getNodeLabel: (node: GraphNode) => string
): void {
  cy.batch(() => {
    // Apply node patches
    for (const nodePatch of patch.nodePatch) {
      switch (nodePatch.operation) {
        case "add":
          nodeDataMap.set(nodePatch.node.id, nodePatch.node);
          cy.add({
            group: "nodes",
            data: {
              id: nodePatch.node.id,
              label: getNodeLabel(nodePatch.node),
              ...nodePatch.node.properties,
            },
          } as unknown as CytoscapeElement);
          break;

        case "remove":
          nodeDataMap.delete(nodePatch.node.id);
          cy.remove(`#${nodePatch.node.id}`);
          break;

        case "update": {
          nodeDataMap.set(nodePatch.node.id, nodePatch.node);
          const nodeEle = cy.getElementById(nodePatch.node.id);
          if (nodeEle) {
            // Update data properties
            const newData = {
              label: getNodeLabel(nodePatch.node),
              ...nodePatch.node.properties,
            };
            for (const [key, value] of Object.entries(newData)) {
              (nodeEle as unknown as { data(k: string, v: unknown): void }).data(key, value);
            }
          }
          break;
        }
      }
    }

    // Apply edge patches
    for (const edgePatch of patch.edgePatch) {
      switch (edgePatch.operation) {
        case "add":
          edgeDataMap.set(edgePatch.edge.id, edgePatch.edge);
          cy.add({
            group: "edges",
            data: {
              id: edgePatch.edge.id,
              source: edgePatch.edge.source,
              target: edgePatch.edge.target,
              label: edgePatch.edge.type,
              ...edgePatch.edge.properties,
            },
          } as unknown as CytoscapeElement);
          break;

        case "remove":
          edgeDataMap.delete(edgePatch.edge.id);
          cy.remove(`#${edgePatch.edge.id}`);
          break;

        case "update": {
          edgeDataMap.set(edgePatch.edge.id, edgePatch.edge);
          const edgeEle = cy.getElementById(edgePatch.edge.id);
          if (edgeEle) {
            const newData = {
              label: edgePatch.edge.type,
              ...edgePatch.edge.properties,
            };
            for (const [key, value] of Object.entries(newData)) {
              (edgeEle as unknown as { data(k: string, v: unknown): void }).data(key, value);
            }
          }
          break;
        }
      }
    }
  });
}
