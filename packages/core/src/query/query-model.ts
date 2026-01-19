/**
 * Query model for QueryScape.
 * Designed to support both property graph and RDF/SPARQL models.
 */

import type { NodeId, EdgeId, PropertyValue } from '../types';

/** Types of queries supported */
export type QueryType = 'node' | 'edge' | 'neighborhood' | 'path' | 'search';

/** Base query interface */
export interface QueryBase {
  readonly type: QueryType;

  /** Maximum number of results to return */
  readonly limit?: number;

  /** Offset for pagination */
  readonly offset?: number;

  /** Optional timeout in milliseconds */
  readonly timeoutMs?: number;
}

/** Query for specific nodes by ID or filter */
export interface NodeQuery extends QueryBase {
  readonly type: 'node';

  /** Specific node IDs to fetch */
  readonly ids?: readonly NodeId[];

  /** Filter by labels (OR semantics - any label matches) */
  readonly labels?: readonly string[];

  /** Filter by properties */
  readonly properties?: Record<string, PropertyValue>;
}

/** Query for specific edges by ID or filter */
export interface EdgeQuery extends QueryBase {
  readonly type: 'edge';

  /** Specific edge IDs to fetch */
  readonly ids?: readonly EdgeId[];

  /** Filter by edge type */
  readonly types?: readonly string[];

  /** Filter edges by source node ID */
  readonly sourceId?: NodeId;

  /** Filter edges by target node ID */
  readonly targetId?: NodeId;
}

/** Direction for neighborhood traversal */
export type TraversalDirection = 'outgoing' | 'incoming' | 'both';

/** Query for node neighborhood (expand) */
export interface NeighborhoodQuery extends QueryBase {
  readonly type: 'neighborhood';

  /** Center node ID */
  readonly nodeId: NodeId;

  /** Traversal direction */
  readonly direction: TraversalDirection;

  /** Number of hops (default: 1) */
  readonly depth?: number;

  /** Filter by edge types */
  readonly edgeTypes?: readonly string[];

  /** Filter by neighbor labels */
  readonly neighborLabels?: readonly string[];
}

/** Query for paths between nodes */
export interface PathQuery extends QueryBase {
  readonly type: 'path';

  /** Source node ID */
  readonly sourceId: NodeId;

  /** Target node ID */
  readonly targetId: NodeId;

  /** Maximum path length */
  readonly maxLength?: number;

  /** Whether to find shortest path only */
  readonly shortestOnly?: boolean;

  /** Filter by edge types */
  readonly edgeTypes?: readonly string[];
}

/** Query for full-text or property search */
export interface SearchQuery extends QueryBase {
  readonly type: 'search';

  /** Search text */
  readonly text: string;

  /** Fields to search in (if supported) */
  readonly fields?: readonly string[];

  /** Filter by labels */
  readonly labels?: readonly string[];

  /** Whether search is case-sensitive */
  readonly caseSensitive?: boolean;
}

/** Union type for all query types */
export type Query = NodeQuery | EdgeQuery | NeighborhoodQuery | PathQuery | SearchQuery;
