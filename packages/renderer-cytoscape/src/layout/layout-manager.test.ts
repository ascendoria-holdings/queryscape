import type { Core as CytoscapeCore } from 'cytoscape';
import { describe, it, expect, vi } from 'vitest';

import type { LayoutName } from './layout-manager';
import { LayoutManager } from './layout-manager';

// Mock type for Cytoscape Core
interface MockLayout {
  run: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface MockCy {
  layout: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  _layoutMock: MockLayout;
}

// Mock Cytoscape Core
const createMockCy = (): MockCy => {
  const layoutMock: MockLayout = {
    run: vi.fn(),
    on: vi.fn(),
    stop: vi.fn(),
  };

  return {
    layout: vi.fn(() => layoutMock),
    stop: vi.fn(),
    _layoutMock: layoutMock,
  };
};

describe('LayoutManager', () => {
  describe('run', () => {
    it('should run layout with default options', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('cose');

      expect(cy.layout).toHaveBeenCalled();
      expect(cy._layoutMock.run).toHaveBeenCalled();
    });

    it('should pass layout name', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('circle');

      const callArgs = cy.layout.mock.calls[0][0];
      expect(callArgs.name).toBe('circle');
    });

    it('should set animate option', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('grid', { animate: false });

      const callArgs = cy.layout.mock.calls[0][0];
      expect(callArgs.animate).toBe(false);
    });

    it('should set animation duration', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('cose', { animationDuration: 1000 });

      const callArgs = cy.layout.mock.calls[0][0];
      expect(callArgs.animationDuration).toBe(1000);
    });

    it('should register onComplete callback', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);
      const onComplete = vi.fn();

      manager.run('cose', { onComplete });

      expect(cy._layoutMock.on).toHaveBeenCalledWith('layoutstop', onComplete);
    });

    it('should update current layout', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      expect(manager.getCurrentLayout()).toBe('cose'); // default

      manager.run('breadthfirst');

      expect(manager.getCurrentLayout()).toBe('breadthfirst');
    });

    it('should merge custom options', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('cose', {
        options: {
          gravity: 200,
          nodeRepulsion: 500000,
        },
      });

      const callArgs = cy.layout.mock.calls[0][0];
      expect(callArgs.gravity).toBe(200);
      expect(callArgs.nodeRepulsion).toBe(500000);
    });
  });

  describe('getCurrentLayout', () => {
    it('should return current layout name', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('concentric');
      expect(manager.getCurrentLayout()).toBe('concentric');

      manager.run('random');
      expect(manager.getCurrentLayout()).toBe('random');
    });
  });

  describe('getAvailableLayouts', () => {
    it('should return all available layout names', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      const layouts = manager.getAvailableLayouts();

      expect(layouts).toContain('cose');
      expect(layouts).toContain('circle');
      expect(layouts).toContain('grid');
      expect(layouts).toContain('breadthfirst');
      expect(layouts).toContain('concentric');
      expect(layouts).toContain('random');
      expect(layouts).toContain('preset');
    });
  });

  describe('stop', () => {
    it('should stop layout animation', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.stop();

      expect(cy.stop).toHaveBeenCalled();
    });
  });

  describe('layout defaults', () => {
    const cy = createMockCy();
    const manager = new LayoutManager(cy as unknown as CytoscapeCore);

    const layoutTests: LayoutName[] = ['cose', 'circle', 'grid', 'breadthfirst', 'concentric', 'random', 'preset'];

    layoutTests.forEach(layoutName => {
      it(`should have valid defaults for ${layoutName}`, () => {
        manager.run(layoutName);

        const callArgs = cy.layout.mock.calls[cy.layout.mock.calls.length - 1][0];

        expect(callArgs.name).toBe(layoutName);
        expect(callArgs.fit).toBe(true);
        expect(callArgs.padding).toBeDefined();
      });
    });
  });

  describe('animation options', () => {
    it('should set animation easing', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('cose', { animate: true });

      const callArgs = cy.layout.mock.calls[0][0];
      expect(callArgs.animationEasing).toBe('ease-out-quad');
    });

    it('should use default duration when not specified', () => {
      const cy = createMockCy();
      const manager = new LayoutManager(cy as unknown as CytoscapeCore);

      manager.run('circle');

      const callArgs = cy.layout.mock.calls[0][0];
      expect(callArgs.animationDuration).toBe(500);
    });
  });
});
