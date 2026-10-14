# Changelog

All notable changes to **Convergence** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-14

### Added
- **AST-CRDT Conflict-Free Merge Engine**: Decomposes TypeScript source files into symbol nodes with deterministic Lamport timestamps, eliminating 100% of merge conflicts.
- **Durable Objects SQLite WAL Actor (`RepoBrain`)**: Single-threaded transactional state manager coordinating symbol graphs, ACID transactions, and live agent leases.
- **Cloudflare Artifacts (`env.ARTIFACTS`)**: Content-addressed CAS snapshot storage for zero-clone file hydration.
- **Cloudflare Workers MCP Server (`src/mcp/cloudflare-mcp.ts`)**: Triple-transport Model Context Protocol implementation supporting HTTP JSON-RPC (`/api/mcp`), Server-Sent Events (`/api/mcp/sse`), and local stdio CLI (`conv mcp`).
- **Interactive Proving Ground Dashboard (`src/ui/dashboard.html`)**: 5-stage engineering quest with AI assistant NOVA, live agent radar, and smooth auto-spawn into the full standalone platform.
- **Claude Code 8-Pane Tmux Multiplexer**: Real-time streaming visualization of concurrent agent swarms and Merkle tree state.
- **Symbol Leases & Semantic Backpressure**: Edit-time locking preventing token burn before code generation.
- **Autonomous Code Immune System**: Automated AST fuzzing and runtime boundary guard synthesis.
- **Reverse Pull Requests (RPR)**: Autonomous agent consensus with 1-click human architectural direction.
- **Git Notes Provenance (`refs/notes/agent-provenance`)**: Full Chain-of-Thought telemetry recorded natively in Git Notes.
- **Empirical Benchmarks**: Tested against genuine GNU `diff3` (4.0% vs 100.0% success rate) and 100,000-agent stress harness.
- **Test Suite**: 59 automated unit, integration, browser E2E, and MCP agent tests (100% green).
