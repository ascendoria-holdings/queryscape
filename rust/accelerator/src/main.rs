//! GraphScope Accelerator Sidecar
//!
//! A JSON-RPC server that provides accelerated graph operations.
//! Communicates over stdin/stdout for easy integration with Node.js.

use graphscope_accelerator::protocol::*;
use graphscope_accelerator::sampling;
use std::io::{self, BufRead, Write};

fn handle_request(request: &Request) -> Result<String, String> {
    match request.method.as_str() {
        "protocol.version" => {
            let result = ProtocolVersionResult {
                version: PROTOCOL_VERSION.to_string(),
                features: FEATURES.iter().map(|s| s.to_string()).collect(),
            };
            let response = SuccessResponse::new(request.id, result);
            serde_json::to_string(&response).map_err(|e| e.to_string())
        }

        "sample.random" => {
            let params: RandomSampleParams = serde_json::from_value(request.params.clone())
                .map_err(|e| format!("Invalid params: {}", e))?;

            let result = sampling::random_sample(&params.nodes, &params.edges, params.count);
            let response = SuccessResponse::new(request.id, result);
            serde_json::to_string(&response).map_err(|e| e.to_string())
        }

        "sample.randomWalk" => {
            let params: RandomWalkParams = serde_json::from_value(request.params.clone())
                .map_err(|e| format!("Invalid params: {}", e))?;

            let result = sampling::random_walk_sample(
                &params.nodes,
                &params.edges,
                &params.start_node_id,
                params.walk_length,
                params.num_walks,
            );
            let response = SuccessResponse::new(request.id, result);
            serde_json::to_string(&response).map_err(|e| e.to_string())
        }

        "sample.frontier" => {
            let params: FrontierSampleParams = serde_json::from_value(request.params.clone())
                .map_err(|e| format!("Invalid params: {}", e))?;

            let result = sampling::frontier_sample(
                &params.nodes,
                &params.edges,
                &params.start_node_ids,
                params.max_nodes,
            );
            let response = SuccessResponse::new(request.id, result);
            serde_json::to_string(&response).map_err(|e| e.to_string())
        }

        _ => {
            let response = ErrorResponse::method_not_found(request.id, &request.method);
            serde_json::to_string(&response).map_err(|e| e.to_string())
        }
    }
}

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();

    eprintln!("GraphScope Accelerator v{} started", PROTOCOL_VERSION);

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Error reading stdin: {}", e);
                continue;
            }
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Request = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                eprintln!("Error parsing request: {}", e);
                // Send parse error response
                let response = ErrorResponse::new(0, -32700, format!("Parse error: {}", e));
                if let Ok(json) = serde_json::to_string(&response) {
                    let _ = writeln!(stdout, "{}", json);
                    let _ = stdout.flush();
                }
                continue;
            }
        };

        let response = match handle_request(&request) {
            Ok(json) => json,
            Err(e) => {
                let response = ErrorResponse::internal_error(request.id, e);
                serde_json::to_string(&response).unwrap_or_default()
            }
        };

        if let Err(e) = writeln!(stdout, "{}", response) {
            eprintln!("Error writing response: {}", e);
        }
        if let Err(e) = stdout.flush() {
            eprintln!("Error flushing stdout: {}", e);
        }
    }
}
