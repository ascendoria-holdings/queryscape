import { describe, it, expect } from 'vitest';

import { ThemeEngine } from './theme-engine';
import { DEFAULT_THEME, DARK_THEME } from './default-theme';
import type { Theme } from './theme-engine';

describe('ThemeEngine', () => {
  describe('toCytoscapeStyle', () => {
    it('should generate cytoscape stylesheet from default theme', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      expect(styles).toBeInstanceOf(Array);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should include node style', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const nodeStyle = styles.find(s => s.selector === 'node');
      expect(nodeStyle).toBeDefined();
      expect(nodeStyle?.style).toHaveProperty('background-color');
      expect(nodeStyle?.style).toHaveProperty('border-color');
    });

    it('should include selected node style', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const selectedStyle = styles.find(s => s.selector === 'node:selected');
      expect(selectedStyle).toBeDefined();
    });

    it('should include highlighted node style', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const highlightedStyle = styles.find(s => s.selector === 'node.highlighted');
      expect(highlightedStyle).toBeDefined();
    });

    it('should include edge style', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const edgeStyle = styles.find(s => s.selector === 'edge');
      expect(edgeStyle).toBeDefined();
      expect(edgeStyle?.style).toHaveProperty('line-color');
      expect(edgeStyle?.style).toHaveProperty('target-arrow-shape');
    });

    it('should include selected edge style', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const selectedEdgeStyle = styles.find(s => s.selector === 'edge:selected');
      expect(selectedEdgeStyle).toBeDefined();
    });

    it('should include label-specific node styles', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const personStyle = styles.find(s => s.selector?.includes('Person'));
      expect(personStyle).toBeDefined();

      const companyStyle = styles.find(s => s.selector?.includes('Company'));
      expect(companyStyle).toBeDefined();
    });

    it('should include type-specific edge styles', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const knowsStyle = styles.find(s => s.selector?.includes('KNOWS'));
      expect(knowsStyle).toBeDefined();
    });
  });

  describe('getTheme', () => {
    it('should return the current theme', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const theme = engine.getTheme();

      expect(theme.name).toBe('default');
      expect(theme).toEqual(DEFAULT_THEME);
    });
  });

  describe('dark theme', () => {
    it('should generate valid stylesheet for dark theme', () => {
      const engine = new ThemeEngine(DARK_THEME);
      const styles = engine.toCytoscapeStyle();

      expect(styles).toBeInstanceOf(Array);
      expect(styles.length).toBeGreaterThan(0);
    });

    it('should have different colors than light theme', () => {
      const lightEngine = new ThemeEngine(DEFAULT_THEME);
      const darkEngine = new ThemeEngine(DARK_THEME);

      const lightStyles = lightEngine.toCytoscapeStyle();
      const darkStyles = darkEngine.toCytoscapeStyle();

      const lightNode = lightStyles.find(s => s.selector === 'node');
      const darkNode = darkStyles.find(s => s.selector === 'node');

      expect(lightNode?.style?.['background-color']).not.toBe(darkNode?.style?.['background-color']);
    });
  });

  describe('custom theme', () => {
    it('should handle custom theme', () => {
      const customTheme: Theme = {
        name: 'custom',
        backgroundColor: '#000000',
        node: {
          backgroundColor: '#ff0000',
          borderColor: '#00ff00',
          borderWidth: 5,
          shape: 'diamond',
          width: 100,
          height: 100,
          labelColor: '#0000ff',
          labelFontSize: 16,
          labelFontWeight: 'bold',
        },
        nodeSelected: {
          backgroundColor: '#ffff00',
        },
        nodeHighlighted: {
          backgroundColor: '#ff00ff',
        },
        edge: {
          lineColor: '#cccccc',
          width: 3,
          lineStyle: 'dashed',
          curveStyle: 'straight',
          targetArrowShape: 'vee',
          targetArrowColor: '#cccccc',
          labelColor: '#666666',
          labelFontSize: 12,
        },
        edgeSelected: {
          lineColor: '#ffffff',
        },
      };

      const engine = new ThemeEngine(customTheme);
      const styles = engine.toCytoscapeStyle();

      const nodeStyle = styles.find(s => s.selector === 'node');
      expect(nodeStyle?.style?.['background-color']).toBe('#ff0000');
      expect(nodeStyle?.style?.['border-color']).toBe('#00ff00');
      expect(nodeStyle?.style?.['shape']).toBe('diamond');
    });

    it('should handle theme with custom label styles', () => {
      const customTheme: Theme = {
        ...DEFAULT_THEME,
        nodeByLabel: {
          CustomLabel: {
            backgroundColor: '#123456',
            shape: 'hexagon',
          },
        },
      };

      const engine = new ThemeEngine(customTheme);
      const styles = engine.toCytoscapeStyle();

      const customLabelStyle = styles.find(s => s.selector?.includes('CustomLabel'));
      expect(customLabelStyle).toBeDefined();
      expect(customLabelStyle?.style?.['background-color']).toBe('#123456');
    });

    it('should handle theme with custom edge type styles', () => {
      const customTheme: Theme = {
        ...DEFAULT_THEME,
        edgeByType: {
          CUSTOM_REL: {
            lineColor: '#abcdef',
            width: 5,
          },
        },
      };

      const engine = new ThemeEngine(customTheme);
      const styles = engine.toCytoscapeStyle();

      const customEdgeStyle = styles.find(s => s.selector?.includes('CUSTOM_REL'));
      expect(customEdgeStyle).toBeDefined();
      expect(customEdgeStyle?.style?.['line-color']).toBe('#abcdef');
    });
  });

  describe('style properties', () => {
    it('should set correct node shape', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const nodeStyle = styles.find(s => s.selector === 'node');
      expect(nodeStyle?.style?.['shape']).toBe('ellipse');
    });

    it('should set correct edge curve style', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const edgeStyle = styles.find(s => s.selector === 'edge');
      expect(edgeStyle?.style?.['curve-style']).toBe('bezier');
    });

    it('should set label data binding', () => {
      const engine = new ThemeEngine(DEFAULT_THEME);
      const styles = engine.toCytoscapeStyle();

      const nodeStyle = styles.find(s => s.selector === 'node');
      expect(nodeStyle?.style?.['label']).toBe('data(label)');

      const edgeStyle = styles.find(s => s.selector === 'edge');
      expect(edgeStyle?.style?.['label']).toBe('data(label)');
    });
  });
});
