#!/bin/bash

# Debug script to show what's in the CI environment
echo "=== CI Environment Debug Information ==="
echo "Current working directory:"
pwd
echo ""

echo "=== Directory Structure of src/ ==="
find ./src -type d | sort
echo ""

echo "=== Prisma Generated Files ==="
find ./src/generated -type f 2>/dev/null || echo "No generated directory found"
echo ""

echo "=== tsconfig.json contents ==="
cat tsconfig.json
echo ""

echo "=== tsconfig.spec.json contents ==="
cat tsconfig.spec.json
echo ""

echo "=== jest.config.js contents ==="
cat jest.config.js
echo ""

echo "=== Package.json scripts ==="
grep -A 10 \"scripts\" package.json
echo ""

echo "=== NodeJS version ==="
node --version
echo ""

echo "=== End of Debug Information ==="
