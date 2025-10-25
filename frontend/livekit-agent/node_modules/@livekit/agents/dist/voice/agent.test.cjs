"use strict";
var import_vitest = require("vitest");
var import_zod = require("zod");
var import_llm = require("../llm/index.cjs");
var import_agent = require("./agent.cjs");
(0, import_vitest.describe)("Agent", () => {
  (0, import_vitest.it)("should create agent with basic instructions", () => {
    const instructions = "You are a helpful assistant";
    const agent = new import_agent.Agent({ instructions });
    (0, import_vitest.expect)(agent).toBeDefined();
    (0, import_vitest.expect)(agent.instructions).toBe(instructions);
  });
  (0, import_vitest.it)("should create agent with instructions and tools", () => {
    var _a, _b;
    const instructions = "You are a helpful assistant with tools";
    const mockTool1 = (0, import_llm.tool)({
      description: "First test tool",
      parameters: import_zod.z.object({}),
      execute: async () => "tool1 result"
    });
    const mockTool2 = (0, import_llm.tool)({
      description: "Second test tool",
      parameters: import_zod.z.object({
        input: import_zod.z.string().describe("Input parameter")
      }),
      execute: async ({ input }) => `tool2: ${input}`
    });
    const agent = new import_agent.Agent({
      instructions,
      tools: {
        getTool1: mockTool1,
        getTool2: mockTool2
      }
    });
    (0, import_vitest.expect)(agent).toBeDefined();
    (0, import_vitest.expect)(agent.instructions).toBe(instructions);
    const agentTools = agent.toolCtx;
    (0, import_vitest.expect)(Object.keys(agentTools)).toHaveLength(2);
    (0, import_vitest.expect)(agentTools).toHaveProperty("getTool1");
    (0, import_vitest.expect)(agentTools).toHaveProperty("getTool2");
    (0, import_vitest.expect)((_a = agentTools.getTool1) == null ? void 0 : _a.description).toBe("First test tool");
    (0, import_vitest.expect)((_b = agentTools.getTool2) == null ? void 0 : _b.description).toBe("Second test tool");
  });
  (0, import_vitest.it)("should return a copy of tools, not the original reference", () => {
    const instructions = "You are a helpful assistant";
    const mockTool = (0, import_llm.tool)({
      description: "Test tool",
      parameters: import_zod.z.object({}),
      execute: async () => "result"
    });
    const tools = { testTool: mockTool };
    const agent = new import_agent.Agent({ instructions, tools });
    const tools1 = agent.toolCtx;
    const tools2 = agent.toolCtx;
    (0, import_vitest.expect)(tools1).not.toBe(tools2);
    (0, import_vitest.expect)(tools1).not.toBe(tools);
    (0, import_vitest.expect)(tools1).toEqual(tools2);
    (0, import_vitest.expect)(tools1).toEqual(tools);
  });
});
//# sourceMappingURL=agent.test.cjs.map