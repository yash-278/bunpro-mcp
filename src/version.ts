// The .mcpb ships no package.json, so the built server can't read its version
// from there. The wire-to-tool suite fails if this differs from package.json.
export const SERVER_VERSION = "0.5.0";
