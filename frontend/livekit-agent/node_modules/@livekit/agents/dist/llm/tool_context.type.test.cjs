"use strict";
var import_vitest = require("vitest");
var import_zod = require("zod");
var import_index = require("./index.cjs");
(0, import_vitest.describe)("tool type inference", () => {
  (0, import_vitest.it)("should infer argument type from zod schema", () => {
    const toolType = (0, import_index.tool)({
      description: "test",
      parameters: import_zod.z.object({ number: import_zod.z.number() }),
      execute: async () => "test"
    });
    (0, import_vitest.expectTypeOf)(toolType).toEqualTypeOf();
  });
  (0, import_vitest.it)("should infer provider defined tool type", () => {
    const toolType = (0, import_index.tool)({
      id: "code-interpreter",
      config: {
        language: "python"
      }
    });
    (0, import_vitest.expectTypeOf)(toolType).toEqualTypeOf();
  });
  (0, import_vitest.it)("should infer run context type", () => {
    const toolType = (0, import_index.tool)({
      description: "test",
      parameters: import_zod.z.object({ number: import_zod.z.number() }),
      execute: async ({ number }, { ctx }) => {
        return `The number is ${number}, ${ctx.userData.name}`;
      }
    });
    (0, import_vitest.expectTypeOf)(toolType).toEqualTypeOf();
  });
  (0, import_vitest.it)("should not accept primitive zod schemas", () => {
    (0, import_vitest.expect)(() => {
      (0, import_index.tool)({
        name: "test",
        description: "test",
        parameters: import_zod.z.string(),
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema (z.object(...))");
  });
  (0, import_vitest.it)("should not accept array schemas", () => {
    (0, import_vitest.expect)(() => {
      (0, import_index.tool)({
        name: "test",
        description: "test",
        parameters: import_zod.z.array(import_zod.z.string()),
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema (z.object(...))");
  });
  (0, import_vitest.it)("should not accept union schemas", () => {
    (0, import_vitest.expect)(() => {
      (0, import_index.tool)({
        name: "test",
        description: "test",
        parameters: import_zod.z.union([import_zod.z.object({ a: import_zod.z.string() }), import_zod.z.object({ b: import_zod.z.number() })]),
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema (z.object(...))");
  });
  (0, import_vitest.it)("should not accept non-Zod values as parameters", () => {
    (0, import_vitest.expect)(() => {
      (0, import_index.tool)({
        name: "test",
        description: "test",
        parameters: "invalid schema",
        execute: async () => "test"
      });
    }).toThrowError("Tool parameters must be a Zod object schema or a raw JSON schema");
  });
  (0, import_vitest.it)("should infer empty object type when parameters are omitted", () => {
    const toolType = (0, import_index.tool)({
      description: "Simple action without parameters",
      execute: async () => "done"
    });
    (0, import_vitest.expectTypeOf)(toolType).toEqualTypeOf();
  });
  (0, import_vitest.it)("should infer correct types with context but no parameters", () => {
    const toolType = (0, import_index.tool)({
      description: "Action with context",
      execute: async (args, { ctx }) => {
        (0, import_vitest.expectTypeOf)(args).toEqualTypeOf();
        (0, import_vitest.expectTypeOf)(ctx.userData.userId).toEqualTypeOf();
        return ctx.userData.userId;
      }
    });
    (0, import_vitest.expectTypeOf)(toolType).toEqualTypeOf();
  });
});
//# sourceMappingURL=tool_context.type.test.cjs.map