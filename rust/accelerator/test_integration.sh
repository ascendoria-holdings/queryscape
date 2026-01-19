#!/bin/bash
# Integration test for QueryScape Rust accelerator JSON-RPC protocol

set -e

echo "=== Rust Accelerator Integration Test ==="
echo ""

# Build the accelerator
echo "Building accelerator..."
source $HOME/.cargo/env
cd "$(dirname "$0")"
cargo build --release 2>&1 | tail -n 1

ACCELERATOR="./target/release/queryscape-accelerator"

if [ ! -f "$ACCELERATOR" ]; then
    echo "Error: Accelerator binary not found at $ACCELERATOR"
    exit 1
fi

echo "✓ Accelerator built successfully"
echo ""

# Test 1: Protocol version
echo "Test 1: Protocol Version"
RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"protocol.version","params":{}}' | $ACCELERATOR | head -n 1)
echo "$RESULT"
if echo "$RESULT" | grep -q '"version":"1.0.0"'; then
    echo "✓ Protocol version test passed"
else
    echo "✗ Protocol version test failed"
    exit 1
fi
echo ""

# Test 2: Random sample
echo "Test 2: Random Sample"
RESULT=$(cat << 'EOF' | $ACCELERATOR | head -n 1
{"jsonrpc":"2.0","id":2,"method":"sample.random","params":{"nodes":[{"id":"n1","labels":["Person"],"properties":{"name":"Alice"}},{"id":"n2","labels":["Person"],"properties":{"name":"Bob"}},{"id":"n3","labels":["Person"],"properties":{"name":"Charlie"}}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"KNOWS","properties":{}},{"id":"e2","source":"n2","target":"n3","type":"KNOWS","properties":{}}],"count":2}}
EOF
)
echo "$RESULT"
if echo "$RESULT" | grep -q '"sampledNodes"'; then
    echo "✓ Random sample test passed"
else
    echo "✗ Random sample test failed"
    exit 1
fi
echo ""

# Test 3: Random walk
echo "Test 3: Random Walk Sample"
RESULT=$(cat << 'EOF' | $ACCELERATOR | head -n 1
{"jsonrpc":"2.0","id":3,"method":"sample.randomWalk","params":{"nodes":[{"id":"n1","labels":["Person"],"properties":{}},{"id":"n2","labels":["Person"],"properties":{}},{"id":"n3","labels":["Person"],"properties":{}}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"KNOWS","properties":{}},{"id":"e2","source":"n2","target":"n3","type":"KNOWS","properties":{}}],"startNodeId":"n1","walkLength":3,"numWalks":2}}
EOF
)
echo "$RESULT"
if echo "$RESULT" | grep -q '"sampledNodes"'; then
    echo "✓ Random walk test passed"
else
    echo "✗ Random walk test failed"
    exit 1
fi
echo ""

# Test 4: Frontier sample
echo "Test 4: Frontier Sample (BFS)"
RESULT=$(cat << 'EOF' | $ACCELERATOR | head -n 1
{"jsonrpc":"2.0","id":4,"method":"sample.frontier","params":{"nodes":[{"id":"n1","labels":["Person"],"properties":{}},{"id":"n2","labels":["Person"],"properties":{}},{"id":"n3","labels":["Person"],"properties":{}},{"id":"n4","labels":["Person"],"properties":{}}],"edges":[{"id":"e1","source":"n1","target":"n2","type":"KNOWS","properties":{}},{"id":"e2","source":"n2","target":"n3","type":"KNOWS","properties":{}},{"id":"e3","source":"n3","target":"n4","type":"KNOWS","properties":{}}],"startNodeIds":["n1"],"maxNodes":3}}
EOF
)
echo "$RESULT"
if echo "$RESULT" | grep -q '"sampledNodes"'; then
    echo "✓ Frontier sample test passed"
else
    echo "✗ Frontier sample test failed"
    exit 1
fi
echo ""

# Test 5: Invalid method (should return error)
echo "Test 5: Invalid Method (Error Handling)"
RESULT=$(echo '{"jsonrpc":"2.0","id":5,"method":"invalid.method","params":{}}' | $ACCELERATOR | head -n 1)
echo "$RESULT"
if echo "$RESULT" | grep -q '"error"'; then
    echo "✓ Error handling test passed"
else
    echo "✗ Error handling test failed"
    exit 1
fi
echo ""

echo "=== ✓ All 5 Integration Tests Passed ==="
