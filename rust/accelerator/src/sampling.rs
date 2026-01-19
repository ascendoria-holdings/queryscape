//! Graph sampling algorithms

use crate::protocol::{GraphEdge, GraphNode, SampleResult};
use rand::prelude::*;
use std::collections::{HashMap, HashSet, VecDeque};

/// Build adjacency list from edges
fn build_adjacency(edges: &[GraphEdge]) -> HashMap<String, Vec<&GraphEdge>> {
    let mut adj: HashMap<String, Vec<&GraphEdge>> = HashMap::new();

    for edge in edges {
        adj.entry(edge.source.clone())
            .or_default()
            .push(edge);
        adj.entry(edge.target.clone())
            .or_default()
            .push(edge);
    }

    adj
}

/// Random sample: select random nodes and include edges between them
pub fn random_sample(nodes: &[GraphNode], edges: &[GraphEdge], count: usize) -> SampleResult {
    let mut rng = rand::thread_rng();

    // Fisher-Yates shuffle to select random nodes
    let count = count.min(nodes.len());
    let mut indices: Vec<usize> = (0..nodes.len()).collect();

    for i in (1..indices.len()).rev() {
        let j = rng.gen_range(0..=i);
        indices.swap(i, j);
    }

    let sampled_nodes: Vec<GraphNode> = indices[..count]
        .iter()
        .map(|&i| nodes[i].clone())
        .collect();

    let sampled_ids: HashSet<&str> = sampled_nodes.iter().map(|n| n.id.as_str()).collect();

    // Include edges where both endpoints are in sampled nodes
    let sampled_edges: Vec<GraphEdge> = edges
        .iter()
        .filter(|e| sampled_ids.contains(e.source.as_str()) && sampled_ids.contains(e.target.as_str()))
        .cloned()
        .collect();

    SampleResult {
        sampled_nodes,
        sampled_edges,
    }
}

/// Random walk sample: perform random walks from start node
pub fn random_walk_sample(
    nodes: &[GraphNode],
    edges: &[GraphEdge],
    start_node_id: &str,
    walk_length: usize,
    num_walks: usize,
) -> SampleResult {
    let mut rng = rand::thread_rng();
    let adjacency = build_adjacency(edges);
    let node_map: HashMap<&str, &GraphNode> = nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    let mut visited_nodes: HashSet<String> = HashSet::new();
    let mut visited_edges: HashSet<String> = HashSet::new();

    for _ in 0..num_walks {
        let mut current_node = start_node_id.to_string();
        visited_nodes.insert(current_node.clone());

        for _ in 0..walk_length {
            if let Some(neighbors) = adjacency.get(&current_node) {
                if neighbors.is_empty() {
                    break;
                }

                let edge = neighbors[rng.gen_range(0..neighbors.len())];
                visited_edges.insert(edge.id.clone());

                // Move to the other endpoint
                current_node = if edge.source == current_node {
                    edge.target.clone()
                } else {
                    edge.source.clone()
                };

                visited_nodes.insert(current_node.clone());
            } else {
                break;
            }
        }
    }

    let sampled_nodes: Vec<GraphNode> = visited_nodes
        .iter()
        .filter_map(|id| node_map.get(id.as_str()).map(|&n| n.clone()))
        .collect();

    let sampled_edges: Vec<GraphEdge> = edges
        .iter()
        .filter(|e| visited_edges.contains(&e.id))
        .cloned()
        .collect();

    SampleResult {
        sampled_nodes,
        sampled_edges,
    }
}

/// Frontier sample: BFS from start nodes up to max nodes
pub fn frontier_sample(
    nodes: &[GraphNode],
    edges: &[GraphEdge],
    start_node_ids: &[String],
    max_nodes: usize,
) -> SampleResult {
    let adjacency = build_adjacency(edges);
    let node_map: HashMap<&str, &GraphNode> = nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    let mut visited_nodes: HashSet<String> = HashSet::new();
    let mut visited_edges: HashSet<String> = HashSet::new();
    let mut queue: VecDeque<String> = start_node_ids.iter().cloned().collect();

    while let Some(current_node) = queue.pop_front() {
        if visited_nodes.len() >= max_nodes {
            break;
        }

        if visited_nodes.contains(&current_node) {
            continue;
        }

        visited_nodes.insert(current_node.clone());

        if let Some(neighbors) = adjacency.get(&current_node) {
            for edge in neighbors {
                let neighbor = if edge.source == current_node {
                    &edge.target
                } else {
                    &edge.source
                };

                if !visited_nodes.contains(neighbor) && visited_nodes.len() < max_nodes {
                    visited_edges.insert(edge.id.clone());
                    queue.push_back(neighbor.clone());
                }
            }
        }
    }

    let sampled_nodes: Vec<GraphNode> = visited_nodes
        .iter()
        .filter_map(|id| node_map.get(id.as_str()).map(|&n| n.clone()))
        .collect();

    let sampled_edges: Vec<GraphEdge> = edges
        .iter()
        .filter(|e| visited_edges.contains(&e.id))
        .cloned()
        .collect();

    SampleResult {
        sampled_nodes,
        sampled_edges,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn create_test_graph() -> (Vec<GraphNode>, Vec<GraphEdge>) {
        let nodes: Vec<GraphNode> = (0..10)
            .map(|i| GraphNode {
                id: format!("n{}", i),
                labels: vec!["Node".to_string()],
                properties: HashMap::new(),
            })
            .collect();

        let edges: Vec<GraphEdge> = vec![
            ("n0", "n1"),
            ("n1", "n2"),
            ("n2", "n3"),
            ("n3", "n4"),
            ("n0", "n5"),
            ("n5", "n6"),
            ("n6", "n7"),
            ("n7", "n8"),
            ("n8", "n9"),
        ]
        .into_iter()
        .enumerate()
        .map(|(i, (source, target))| GraphEdge {
            id: format!("e{}", i),
            source: source.to_string(),
            target: target.to_string(),
            edge_type: "CONNECTS".to_string(),
            properties: HashMap::new(),
        })
        .collect();

        (nodes, edges)
    }

    #[test]
    fn test_random_sample() {
        let (nodes, edges) = create_test_graph();
        let result = random_sample(&nodes, &edges, 5);

        assert_eq!(result.sampled_nodes.len(), 5);
    }

    #[test]
    fn test_random_walk() {
        let (nodes, edges) = create_test_graph();
        let result = random_walk_sample(&nodes, &edges, "n0", 5, 3);

        assert!(!result.sampled_nodes.is_empty());
        assert!(result.sampled_nodes.iter().any(|n| n.id == "n0"));
    }

    #[test]
    fn test_frontier_sample() {
        let (nodes, edges) = create_test_graph();
        let result = frontier_sample(&nodes, &edges, &["n0".to_string()], 5);

        assert!(result.sampled_nodes.len() <= 5);
        assert!(result.sampled_nodes.iter().any(|n| n.id == "n0"));
    }
}
