import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { tool } from "./index.js";
describe("tool type inference", () => {
  it("should infer argument type from zod schema", () => {
    const toolType = tool({
      description: "test",
      parameters: z.object({ number: z.number() }),
      execute: async () => "test"
    });
    expectTypeOf(toolType).toEqualTypeOf();
  });
  it("should infer provider defined tool type", () => {
    const toolType = tool({
      id: "code-interpreter",
      config: {
        language: "python"
      }
    });
    expectTypeOf(toolType).toEqualTypeOf();
  });
  it("should infer run context type", () => {
    const toolType = tool({
      description: "test",
      parameters: z.object({ number: z.number() }),
      execute: async ({ number }, { ctx }) => {
        return `The number is ${number}, ${ctx.userData.name}`;
      }
    });
    expectTypeOf(toolType).toEqualTypeOf();
  });
  it("should not accept primitive zod schemas", () => {
    expect(() => {
      tool({
        name: "test",
        description: "test",
        parameters: z.string(),
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema (z.object(...))");
  });
  it("should not accept array schemas", () => {
    expect(() => {
      tool({
        name: "test",
        description: "test",
        parameters: z.array(z.string()),
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema (z.object(...))");
  });
  it("should not accept union schemas", () => {
    expect(() => {
      tool({
        name: "test",
        description: "test",
        parameters: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]),
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema (z.object(...))");
  });
  it("should not accept non-Zod values as parameters", () => {
    expect(() => {
      tool({
        name: "test",
        description: "test",
        parameters: "invalid schema",
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema or a raw JSON schema");
  });
  it("should infer empty object type when parameters are omitted", () => {
    const toolType = tool({
      description: "Simple action without parameters",
      execute: async () => "done"
    });
    expectTypeOf(toolType).toEqualTypeOf();
  });
  it("should infer correct types with context but no parameters", () => {
    const toolType = tool({
      description: "Action with context",
      execute: async (args, { ctx }) => {
        expectTypeOf(args).toEqualTypeOf();
        expectTypeOf(ctx.userData.userId).toEqualTypeOf();
        return ctx.userData.userId;
      }
    });
    expectTypeOf(toolType).toEqualTypeOf();
  });
});
//# sourceMappingURL=tool_context.type.test.js.map