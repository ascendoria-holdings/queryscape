//! JSON-RPC protocol types

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Protocol version
pub const PROTOCOL_VERSION: &str = "1.0.0";

/// Supported features
pub const FEATURES: &[&str] = &["sampling", "community_detection"];

/// JSON-RPC request
#[derive(Debug, Deserialize)]
pub struct Request {
    pub jsonrpc: String,
    pub id: u64,
    pub method: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

/// JSON-RPC success response
#[derive(Debug, Serialize)]
pub struct SuccessResponse<T: Serialize> {
    pub jsonrpc: String,
    pub id: u64,
    pub result: T,
}

/// JSON-RPC error
#[derive(Debug, Serialize)]
pub struct RpcError {
    pub code: i32,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

/// JSON-RPC error response
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub jsonrpc: String,
    pub id: u64,
    pub error: RpcError,
}

/// Graph node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphNode {
    pub id: String,
    pub labels: Vec<String>,
    pub properties: HashMap<String, serde_json::Value>,
}

/// Graph edge
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GraphEdge {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: String,
    pub properties: HashMap<String, serde_json::Value>,
}

/// Sample result
#[derive(Debug, Serialize)]
pub struct SampleResult {
    #[serde(rename = "sampledNodes")]
    pub sampled_nodes: Vec<GraphNode>,
    #[serde(rename = "sampledEdges")]
    pub sampled_edges: Vec<GraphEdge>,
}

/// Protocol version result
#[derive(Debug, Serialize)]
pub struct ProtocolVersionResult {
    pub version: String,
    pub features: Vec<String>,
}

/// Random sample params
#[derive(Debug, Deserialize)]
pub struct RandomSampleParams {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    pub count: usize,
}

/// Random walk params
#[derive(Debug, Deserialize)]
pub struct RandomWalkParams {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    #[serde(rename = "startNodeId")]
    pub start_node_id: String,
    #[serde(rename = "walkLength")]
    pub walk_length: usize,
    #[serde(rename = "numWalks")]
    pub num_walks: usize,
}

/// Frontier sample params
#[derive(Debug, Deserialize)]
pub struct FrontierSampleParams {
    pub nodes: Vec<GraphNode>,
    pub edges: Vec<GraphEdge>,
    #[serde(rename = "startNodeIds")]
    pub start_node_ids: Vec<String>,
    #[serde(rename = "maxNodes")]
    pub max_nodes: usize,
}

impl<T: Serialize> SuccessResponse<T> {
    pub fn new(id: u64, result: T) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            result,
        }
    }
}

impl ErrorResponse {
    pub fn new(id: u64, code: i32, message: impl Into<String>) -> Self {
        Self {
            jsonrpc: "2.0".to_string(),
            id,
            error: RpcError {
                code,
                message: message.into(),
                data: None,
            },
        }
    }

    pub fn method_not_found(id: u64, method: &str) -> Self {
        Self::new(id, -32601, format!("Method not found: {}", method))
    }

    pub fn invalid_params(id: u64, message: impl Into<String>) -> Self {
        Self::new(id, -32602, message)
    }

    pub fn internal_error(id: u64, message: impl Into<String>) -> Self {
        Self::new(id, -32603, message)
    }
}
