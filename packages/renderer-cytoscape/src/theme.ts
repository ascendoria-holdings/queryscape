/**
 * Theme configuration for graph rendering
 */

/** Theme configuration */
export interface Theme {
  // Node styling
  nodeColor: string;
  nodeBorderColor: string;
  nodeSize: number;
  selectedNodeColor: string;
  selectedBorderColor: string;

  // Edge styling
  edgeColor: string;
  edgeWidth: number;
  selectedEdgeColor: string;

  // Text styling
  textColor: string;
  fontSize: number;

  // Highlight styling
  highlightColor: string;
  highlightBorderColor: string;

  // Search styling
  searchMatchColor: string;

  // Background
  backgroundColor: string;
}

/** Default light theme */
export const DEFAULT_THEME: Theme = {
  nodeColor: "#4A90D9",
  nodeBorderColor: "#2E5A87",
  nodeSize: 40,
  selectedNodeColor: "#F5A623",
  selectedBorderColor: "#D4820E",

  edgeColor: "#999999",
  edgeWidth: 2,
  selectedEdgeColor: "#F5A623",

  textColor: "#333333",
  fontSize: 12,

  highlightColor: "#7ED321",
  highlightBorderColor: "#5AA516",

  searchMatchColor: "#FF6B6B",

  backgroundColor: "#FFFFFF",
};

/** Dark theme */
export const DARK_THEME: Theme = {
  nodeColor: "#5B9BD5",
  nodeBorderColor: "#3A6EA5",
  nodeSize: 40,
  selectedNodeColor: "#FFC000",
  selectedBorderColor: "#CC9900",

  edgeColor: "#666666",
  edgeWidth: 2,
  selectedEdgeColor: "#FFC000",

  textColor: "#EEEEEE",
  fontSize: 12,

  highlightColor: "#70C050",
  highlightBorderColor: "#509030",

  searchMatchColor: "#FF6B6B",

  backgroundColor: "#1E1E1E",
};

/** Theme presets by label */
export interface LabelTheme {
  color: string;
  borderColor: string;
  shape?: string;
}

/** Apply per-label theming */
export function applyLabelThemes(
  baseTheme: Theme,
  _labelThemes: Record<string, LabelTheme>
): Theme {
  // This returns the base theme; label-specific styling
  // is applied via Cytoscape selectors
  return baseTheme;
}

/** Generate label-specific style selectors */
export function generateLabelStyles(
  labelThemes: Record<string, LabelTheme>
): Array<{ selector: string; style: Record<string, unknown> }> {
  return Object.entries(labelThemes).map(([label, theme]) => ({
    selector: `node[label = "${label}"]`,
    style: {
      "background-color": theme.color,
      "border-color": theme.borderColor,
      shape: theme.shape ?? "ellipse",
    },
  }));
}

/** Apply theme to Cytoscape instance */
export function applyTheme(
  cy: { style: (styles: unknown[]) => void },
  theme: Theme,
  additionalStyles?: Array<{ selector: string; style: Record<string, unknown> }>
): void {
  const baseStyles = [
    {
      selector: "node",
      style: {
        "background-color": theme.nodeColor,
        "border-color": theme.nodeBorderColor,
        width: theme.nodeSize,
        height: theme.nodeSize,
        color: theme.textColor,
        "font-size": theme.fontSize,
      },
    },
    {
      selector: "edge",
      style: {
        "line-color": theme.edgeColor,
        width: theme.edgeWidth,
        color: theme.textColor,
        "font-size": theme.fontSize - 2,
      },
    },
    ...(additionalStyles ?? []),
  ];

  cy.style(baseStyles);
}
