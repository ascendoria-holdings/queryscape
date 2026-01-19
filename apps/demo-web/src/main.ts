/**
 * QueryScape Demo Application
 */


import { createMockConnector } from "@queryscape/connectors";
import { createSession, createQueryBuilder } from "@queryscape/core";
import type { GraphSession, GraphNode, NodeId } from "@queryscape/core";
import { createRenderer } from "@queryscape/renderer-cytoscape";
import type { GraphRenderer } from "@queryscape/renderer-cytoscape";
import cytoscape from "cytoscape";

// DOM Elements
const graphContainer = document.getElementById("graph-container") as HTMLElement;
const searchInput = document.getElementById("search-input") as HTMLInputElement;
const searchBtn = document.getElementById("search-btn") as HTMLButtonElement;
const clearSearchBtn = document.getElementById("clear-search-btn") as HTMLButtonElement;
const sampleBtn = document.getElementById("sample-btn") as HTMLButtonElement;
const layoutBtn = document.getElementById("layout-btn") as HTMLButtonElement;
const fitBtn = document.getElementById("fit-btn") as HTMLButtonElement;
const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;
const statsEl = document.getElementById("stats") as HTMLElement;
const nodeDetailsEl = document.getElementById("node-details") as HTMLElement;

// Application state
let session: GraphSession;
let renderer: GraphRenderer;
const qb = createQueryBuilder();

/** Initialize the application */
async function init(): Promise<void> {
  showLoading();

  try {
    // Create session with mock connector
    session = createSession({
      config: {
        maxNodes: 1000,
        maxEdges: 5000,
        maxElementsPerFetch: 100,
        cacheTtlMs: 5 * 60 * 1000,
        enableAccelerator: false,
      },
    });

    const connector = createMockConnector({
      dataOptions: {
        nodeCount: 200,
        edgesPerNode: 3,
        labels: ["Person", "Company", "Project", "Document", "Technology"],
        edgeTypes: ["KNOWS", "WORKS_AT", "CREATED", "USES", "REFERENCES"],
        seed: 12345, // Reproducible data
      },
    });

    await session.connect(connector);

    // Load initial sample
    await session.executeQuery({
      type: "sample",
      strategy: "random",
      count: 30,
    });

    // Initialize renderer
    renderer = createRenderer({
      cytoscape: cytoscape as unknown as Parameters<typeof createRenderer>[0]["cytoscape"],
      container: graphContainer,
      data: session.getData(),
      theme: {
        nodeSize: 35,
        fontSize: 8,
      },
      layout: {
        algorithm: "cose",
        animate: true,
        animationDuration: 500,
      },
    });

    // Set up event handlers
    renderer.setEventHandlers({
      onNodeClick: handleNodeClick,
      onNodeDoubleClick: handleNodeDoubleClick,
      onCanvasClick: handleCanvasClick,
      onSelectionChange: handleSelectionChange,
    });

    // Set up UI event listeners
    setupEventListeners();

    // Update stats
    updateStats();

    hideLoading();
    showToast("Connected to mock database", "success");
  } catch (error) {
    hideLoading();
    showToast(`Error: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

/** Set up UI event listeners */
function setupEventListeners(): void {
  // Search
  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
  clearSearchBtn.addEventListener("click", handleClearSearch);

  // Actions
  sampleBtn.addEventListener("click", handleSampleRandom);
  layoutBtn.addEventListener("click", handleRelayout);
  fitBtn.addEventListener("click", handleFitView);
  clearBtn.addEventListener("click", handleClearSession);
}

/** Handle node click */
function handleNodeClick(nodeId: NodeId, node: GraphNode): void {
  showNodeDetails(node);
  renderer.focusNode(nodeId);
}

/** Handle node double-click (expand) */
async function handleNodeDoubleClick(nodeId: NodeId, _node: GraphNode): Promise<void> {
  try {
    await session.executeQuery(
      qb.getNeighbors(nodeId, "both")
    );

    // Apply the patch to renderer
    const patch = session.getLastPatchSummary();
    if (patch && (patch.nodesAdded > 0 || patch.edgesAdded > 0)) {
      renderer.setData(session.getData());
      showToast(`Added ${patch.nodesAdded} nodes and ${patch.edgesAdded} edges`, "success");
    }

    updateStats();
  } catch (error) {
    showToast(`Error: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

/** Handle canvas click (deselect) */
function handleCanvasClick(): void {
  nodeDetailsEl.innerHTML = '<p class="hint">Click a node to see details</p>';
  renderer.clearDimming();
}

/** Handle selection change */
function handleSelectionChange(_selectedNodeIds: NodeId[]): void {
  // Could update UI to show multi-selection state
}

/** Handle search */
function handleSearch(): void {
  const text = searchInput.value.trim();
  if (!text) return;

  const matches = renderer.highlightSearch(text);
  showToast(`Found ${matches.length} matching nodes`, "success");
}

/** Handle clear search */
function handleClearSearch(): void {
  searchInput.value = "";
  renderer.clearSearchHighlight();
}

/** Handle sample random */
async function handleSampleRandom(): Promise<void> {
  try {
    await session.executeQuery({
      type: "sample",
      strategy: "random",
      count: 20,
    });

    renderer.setData(session.getData());
    updateStats();

    const patch = session.getLastPatchSummary();
    if (patch) {
      showToast(`Sampled ${patch.nodesAdded} new nodes`, "success");
    }
  } catch (error) {
    showToast(`Error: ${error instanceof Error ? error.message : String(error)}`, "error");
  }
}

/** Handle re-layout */
function handleRelayout(): void {
  renderer.runLayout({ animate: true });
}

/** Handle fit view */
function handleFitView(): void {
  renderer.fit(50);
}

/** Handle clear session */
function handleClearSession(): void {
  session.clear();
  renderer.setData(session.getData());
  nodeDetailsEl.innerHTML = '<p class="hint">Click a node to see details</p>';
  updateStats();
  showToast("Session cleared", "success");
}

/** Show node details in sidebar */
function showNodeDetails(node: GraphNode): void {
  const html = `
    <div class="node-id">${node.id}</div>
    <div class="labels">
      ${node.labels.map((l) => `<span class="label-tag">${l}</span>`).join("")}
    </div>
    <div class="properties">
      ${Object.entries(node.properties)
        .map(
          ([key, value]) => `
        <div class="property">
          <span class="property-key">${key}</span>
          <span class="property-value">${formatValue(value)}</span>
        </div>
      `
        )
        .join("")}
    </div>
    <button class="expand-btn" onclick="window.expandNode('${node.id}')">
      Expand Neighbors
    </button>
  `;

  nodeDetailsEl.innerHTML = html;
}

/** Format property value for display */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleDateString();
  }
  return String(value);
}

/** Update stats display */
function updateStats(): void {
  const state = session.getState();
  statsEl.textContent = `Nodes: ${state.nodeCount} | Edges: ${state.edgeCount}`;
}

/** Show loading state */
function showLoading(): void {
  graphContainer.innerHTML = '<div class="loading">Loading...</div>';
}

/** Hide loading state */
function hideLoading(): void {
  const loading = graphContainer.querySelector(".loading");
  if (loading) loading.remove();
}

/** Show toast notification */
function showToast(message: string, type: "success" | "error" = "success"): void {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Global function for expand button
(window as unknown as { expandNode: (nodeId: string) => Promise<void> }).expandNode = async (
  nodeId: string
): Promise<void> => {
  const node = session.getNode(nodeId);
  if (node) {
    await handleNodeDoubleClick(nodeId, node);
  }
};

// Initialize on load
init();
