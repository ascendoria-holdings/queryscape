/**
 * Theme engine for converting themes to Cytoscape stylesheets
 */

/** Node style properties */
export interface NodeStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  shape: string;
  width: number;
  height: number;
  labelColor: string;
  labelFontSize: number;
  labelFontWeight: 'normal' | 'bold';
}

/** Partial node style for overrides */
export type PartialNodeStyle = Partial<NodeStyle>;

/** Edge style properties */
export interface EdgeStyle {
  lineColor: string;
  width: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  curveStyle: 'bezier' | 'straight' | 'unbundled-bezier' | 'taxi';
  targetArrowShape: 'triangle' | 'vee' | 'circle' | 'none';
  targetArrowColor: string;
  labelColor: string;
  labelFontSize: number;
}

/** Partial edge style for overrides */
export type PartialEdgeStyle = Partial<EdgeStyle>;

/** Complete theme definition */
export interface Theme {
  name: string;
  backgroundColor: string;
  node: NodeStyle;
  nodeSelected: PartialNodeStyle;
  nodeHighlighted: PartialNodeStyle;
  edge: EdgeStyle;
  edgeSelected: PartialEdgeStyle;
  nodeByLabel?: Record<string, PartialNodeStyle>;
  edgeByType?: Record<string, PartialEdgeStyle>;
}

/** Cytoscape style entry */
export interface CytoscapeStyleEntry {
  selector: string;
  style: Record<string, string | number>;
}

/**
 * ThemeEngine converts themes to Cytoscape stylesheets
 */
export class ThemeEngine {
  private theme: Theme;

  constructor(theme: Theme) {
    this.theme = theme;
  }

  /**
   * Get the current theme
   */
  getTheme(): Theme {
    return this.theme;
  }

  /**
   * Convert theme to Cytoscape stylesheet array
   */
  toCytoscapeStyle(): CytoscapeStyleEntry[] {
    const styles: CytoscapeStyleEntry[] = [];

    // Base node style
    styles.push({
      selector: 'node',
      style: {
        'background-color': this.theme.node.backgroundColor,
        'border-color': this.theme.node.borderColor,
        'border-width': this.theme.node.borderWidth,
        'shape': this.theme.node.shape,
        'width': this.theme.node.width,
        'height': this.theme.node.height,
        'color': this.theme.node.labelColor,
        'font-size': this.theme.node.labelFontSize,
        'font-weight': this.theme.node.labelFontWeight,
        'label': 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
      },
    });

    // Selected node style
    styles.push({
      selector: 'node:selected',
      style: this.nodeStyleToCSS(this.theme.nodeSelected),
    });

    // Highlighted node style
    styles.push({
      selector: 'node.highlighted',
      style: this.nodeStyleToCSS(this.theme.nodeHighlighted),
    });

    // Node styles by label
    if (this.theme.nodeByLabel) {
      for (const [label, style] of Object.entries(this.theme.nodeByLabel)) {
        styles.push({
          selector: `node[label = "${label}"], node.${label}`,
          style: this.nodeStyleToCSS(style),
        });
      }
    }

    // Base edge style
    styles.push({
      selector: 'edge',
      style: {
        'line-color': this.theme.edge.lineColor,
        'width': this.theme.edge.width,
        'line-style': this.theme.edge.lineStyle,
        'curve-style': this.theme.edge.curveStyle,
        'target-arrow-shape': this.theme.edge.targetArrowShape,
        'target-arrow-color': this.theme.edge.targetArrowColor,
        'color': this.theme.edge.labelColor,
        'font-size': this.theme.edge.labelFontSize,
        'label': 'data(label)',
        'text-rotation': 'autorotate',
      },
    });

    // Selected edge style
    styles.push({
      selector: 'edge:selected',
      style: this.edgeStyleToCSS(this.theme.edgeSelected),
    });

    // Edge styles by type
    if (this.theme.edgeByType) {
      for (const [type, style] of Object.entries(this.theme.edgeByType)) {
        styles.push({
          selector: `edge[type = "${type}"], edge.${type}`,
          style: this.edgeStyleToCSS(style),
        });
      }
    }

    return styles;
  }

  /**
   * Convert partial node style to Cytoscape CSS properties
   */
  private nodeStyleToCSS(style: PartialNodeStyle): Record<string, string | number> {
    const css: Record<string, string | number> = {};

    if (style.backgroundColor !== undefined) {
      css['background-color'] = style.backgroundColor;
    }
    if (style.borderColor !== undefined) {
      css['border-color'] = style.borderColor;
    }
    if (style.borderWidth !== undefined) {
      css['border-width'] = style.borderWidth;
    }
    if (style.shape !== undefined) {
      css['shape'] = style.shape;
    }
    if (style.width !== undefined) {
      css['width'] = style.width;
    }
    if (style.height !== undefined) {
      css['height'] = style.height;
    }
    if (style.labelColor !== undefined) {
      css['color'] = style.labelColor;
    }
    if (style.labelFontSize !== undefined) {
      css['font-size'] = style.labelFontSize;
    }
    if (style.labelFontWeight !== undefined) {
      css['font-weight'] = style.labelFontWeight;
    }

    return css;
  }

  /**
   * Convert partial edge style to Cytoscape CSS properties
   */
  private edgeStyleToCSS(style: PartialEdgeStyle): Record<string, string | number> {
    const css: Record<string, string | number> = {};

    if (style.lineColor !== undefined) {
      css['line-color'] = style.lineColor;
    }
    if (style.width !== undefined) {
      css['width'] = style.width;
    }
    if (style.lineStyle !== undefined) {
      css['line-style'] = style.lineStyle;
    }
    if (style.curveStyle !== undefined) {
      css['curve-style'] = style.curveStyle;
    }
    if (style.targetArrowShape !== undefined) {
      css['target-arrow-shape'] = style.targetArrowShape;
    }
    if (style.targetArrowColor !== undefined) {
      css['target-arrow-color'] = style.targetArrowColor;
    }
    if (style.labelColor !== undefined) {
      css['color'] = style.labelColor;
    }
    if (style.labelFontSize !== undefined) {
      css['font-size'] = style.labelFontSize;
    }

    return css;
  }
}
