/**
 * Fluent query builder for constructing queries safely.
 * Prevents raw query injection by design.
 */

import type { NodeId, PropertyValue } from '../types';
import type {
  NodeQuery,
  EdgeQuery,
  NeighborhoodQuery,
  PathQuery,
  SearchQuery,
  TraversalDirection,
} from './query-model';

/** Default query limits */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

export class QueryBuilder {
  /**
   * Start building a node query.
   */
  static nodes(): NodeQueryBuilder {
    return new NodeQueryBuilder();
  }

  /**
   * Start building an edge query.
   */
  static edges(): EdgeQueryBuilder {
    return new EdgeQueryBuilder();
  }

  /**
   * Start building a neighborhood query.
   */
  static neighborhood(nodeId: NodeId): NeighborhoodQueryBuilder {
    return new NeighborhoodQueryBuilder(nodeId);
  }

  /**
   * Start building a path query.
   */
  static path(sourceId: NodeId, targetId: NodeId): PathQueryBuilder {
    return new PathQueryBuilder(sourceId, targetId);
  }

  /**
   * Start building a search query.
   */
  static search(text: string): SearchQueryBuilder {
    return new SearchQueryBuilder(text);
  }
}

class NodeQueryBuilder {
  private _ids?: NodeId[];
  private _labels?: string[];
  private _properties?: Record<string, PropertyValue>;
  private _limit: number = DEFAULT_LIMIT;
  private _offset: number = 0;
  private _timeoutMs?: number;

  byIds(ids: NodeId[]): this {
    this._ids = [...ids];
    return this;
  }

  withLabels(labels: string[]): this {
    this._labels = [...labels];
    return this;
  }

  withProperties(properties: Record<string, PropertyValue>): this {
    this._properties = { ...properties };
    return this;
  }

  limit(limit: number): this {
    this._limit = Math.min(Math.max(1, limit), MAX_LIMIT);
    return this;
  }

  offset(offset: number): this {
    this._offset = Math.max(0, offset);
    return this;
  }

  timeout(ms: number): this {
    this._timeoutMs = Math.max(0, ms);
    return this;
  }

  build(): NodeQuery {
    return {
      type: 'node',
      ids: this._ids,
      labels: this._labels,
      properties: this._properties,
      limit: this._limit,
      offset: this._offset,
      timeoutMs: this._timeoutMs,
    };
  }
}

class EdgeQueryBuilder {
  private _ids?: string[];
  private _types?: string[];
  private _sourceId?: NodeId;
  private _targetId?: NodeId;
  private _limit: number = DEFAULT_LIMIT;
  private _offset: number = 0;
  private _timeoutMs?: number;

  byIds(ids: string[]): this {
    this._ids = [...ids];
    return this;
  }

  ofTypes(types: string[]): this {
    this._types = [...types];
    return this;
  }

  fromNode(sourceId: NodeId): this {
    this._sourceId = sourceId;
    return this;
  }

  toNode(targetId: NodeId): this {
    this._targetId = targetId;
    return this;
  }

  limit(limit: number): this {
    this._limit = Math.min(Math.max(1, limit), MAX_LIMIT);
    return this;
  }

  offset(offset: number): this {
    this._offset = Math.max(0, offset);
    return this;
  }

  timeout(ms: number): this {
    this._timeoutMs = Math.max(0, ms);
    return this;
  }

  build(): EdgeQuery {
    return {
      type: 'edge',
      ids: this._ids,
      types: this._types,
      sourceId: this._sourceId,
      targetId: this._targetId,
      limit: this._limit,
      offset: this._offset,
      timeoutMs: this._timeoutMs,
    };
  }
}

class NeighborhoodQueryBuilder {
  private _direction: TraversalDirection = 'both';
  private _depth: number = 1;
  private _edgeTypes?: string[];
  private _neighborLabels?: string[];
  private _limit: number = DEFAULT_LIMIT;
  private _offset: number = 0;
  private _timeoutMs?: number;

  constructor(private readonly _nodeId: NodeId) {}

  direction(direction: TraversalDirection): this {
    this._direction = direction;
    return this;
  }

  depth(depth: number): this {
    this._depth = Math.min(Math.max(1, depth), 5); // Cap at 5 to prevent explosion
    return this;
  }

  filterEdgeTypes(types: string[]): this {
    this._edgeTypes = [...types];
    return this;
  }

  filterNeighborLabels(labels: string[]): this {
    this._neighborLabels = [...labels];
    return this;
  }

  limit(limit: number): this {
    this._limit = Math.min(Math.max(1, limit), MAX_LIMIT);
    return this;
  }

  offset(offset: number): this {
    this._offset = Math.max(0, offset);
    return this;
  }

  timeout(ms: number): this {
    this._timeoutMs = Math.max(0, ms);
    return this;
  }

  build(): NeighborhoodQuery {
    return {
      type: 'neighborhood',
      nodeId: this._nodeId,
      direction: this._direction,
      depth: this._depth,
      edgeTypes: this._edgeTypes,
      neighborLabels: this._neighborLabels,
      limit: this._limit,
      offset: this._offset,
      timeoutMs: this._timeoutMs,
    };
  }
}

class PathQueryBuilder {
  private _maxLength: number = 10;
  private _shortestOnly: boolean = true;
  private _edgeTypes?: string[];
  private _limit: number = 10;
  private _offset: number = 0;
  private _timeoutMs?: number;

  constructor(
    private readonly _sourceId: NodeId,
    private readonly _targetId: NodeId
  ) {}

  maxLength(length: number): this {
    this._maxLength = Math.min(Math.max(1, length), 20); // Cap at 20
    return this;
  }

  allPaths(): this {
    this._shortestOnly = false;
    return this;
  }

  shortestOnly(): this {
    this._shortestOnly = true;
    return this;
  }

  filterEdgeTypes(types: string[]): this {
    this._edgeTypes = [...types];
    return this;
  }

  limit(limit: number): this {
    this._limit = Math.min(Math.max(1, limit), 100);
    return this;
  }

  offset(offset: number): this {
    this._offset = Math.max(0, offset);
    return this;
  }

  timeout(ms: number): this {
    this._timeoutMs = Math.max(0, ms);
    return this;
  }

  build(): PathQuery {
    return {
      type: 'path',
      sourceId: this._sourceId,
      targetId: this._targetId,
      maxLength: this._maxLength,
      shortestOnly: this._shortestOnly,
      edgeTypes: this._edgeTypes,
      limit: this._limit,
      offset: this._offset,
      timeoutMs: this._timeoutMs,
    };
  }
}

class SearchQueryBuilder {
  private _fields?: string[];
  private _labels?: string[];
  private _caseSensitive: boolean = false;
  private _limit: number = DEFAULT_LIMIT;
  private _offset: number = 0;
  private _timeoutMs?: number;

  constructor(private readonly _text: string) {}

  inFields(fields: string[]): this {
    this._fields = [...fields];
    return this;
  }

  withLabels(labels: string[]): this {
    this._labels = [...labels];
    return this;
  }

  caseSensitive(value: boolean = true): this {
    this._caseSensitive = value;
    return this;
  }

  limit(limit: number): this {
    this._limit = Math.min(Math.max(1, limit), MAX_LIMIT);
    return this;
  }

  offset(offset: number): this {
    this._offset = Math.max(0, offset);
    return this;
  }

  timeout(ms: number): this {
    this._timeoutMs = Math.max(0, ms);
    return this;
  }

  build(): SearchQuery {
    return {
      type: 'search',
      text: this._text,
      fields: this._fields,
      labels: this._labels,
      caseSensitive: this._caseSensitive,
      limit: this._limit,
      offset: this._offset,
      timeoutMs: this._timeoutMs,
    };
  }
}
