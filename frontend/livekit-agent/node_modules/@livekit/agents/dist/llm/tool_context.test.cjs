"use strict";
var import_vitest = require("vitest");
var import_zod = require("zod");
var import_tool_context = require("./tool_context.cjs");
var import_utils = require("./utils.cjs");
(0, import_vitest.describe)("Tool Context", () => {
  (0, import_vitest.describe)("oaiParams", () => {
    (0, import_vitest.it)("should handle basic object schema", () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string().describe("The user name"),
        age: import_zod.z.number().describe("The user age")
      });
      const result = (0, import_utils.oaiParams)(schema);
      (0, import_vitest.expect)(result).toMatchSnapshot();
    });
    (0, import_vitest.it)("should handle enum fields", () => {
      const schema = import_zod.z.object({
        color: import_zod.z.enum(["red", "blue", "green"]).describe("Choose a color")
      });
      const result = (0, import_utils.oaiParams)(schema);
      (0, import_vitest.expect)(result).toMatchSnapshot();
    });
    (0, import_vitest.it)("should handle array fields", () => {
      const schema = import_zod.z.object({
        tags: import_zod.z.array(import_zod.z.string()).describe("List of tags")
      });
      const result = (0, import_utils.oaiParams)(schema);
      (0, import_vitest.expect)(result).toMatchSnapshot();
    });
    (0, import_vitest.it)("should handle array of enums", () => {
      const schema = import_zod.z.object({
        colors: import_zod.z.array(import_zod.z.enum(["red", "blue", "green"])).describe("List of colors")
      });
      const result = (0, import_utils.oaiParams)(schema);
      (0, import_vitest.expect)(result).toMatchSnapshot();
    });
    (0, import_vitest.it)("should handle optional fields", () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string().describe("The user name"),
        age: import_zod.z.number().optional().describe("The user age")
      });
      const result = (0, import_utils.oaiParams)(schema);
      (0, import_vitest.expect)(result).toMatchSnapshot();
    });
    (0, import_vitest.it)("should handle fields without descriptions", () => {
      const schema = import_zod.z.object({
        name: import_zod.z.string(),
        age: import_zod.z.number()
      });
      const result = (0, import_utils.oaiParams)(schema);
      (0, import_vitest.expect)(result).toMatchSnapshot();
    });
  });
  (0, import_vitest.describe)("tool", () => {
    (0, import_vitest.it)("should create and execute a basic core tool", async () => {
      const getWeather = (0, import_tool_context.tool)({
        description: "Get the weather for a given location",
        parameters: import_zod.z.object({
          location: import_zod.z.string()
        }),
        execute: async ({ location }, { ctx }) => {
          return `The weather in ${location} is sunny, ${ctx.userData.name}`;
        }
      });
      const result = await getWeather.execute(
        { location: "San Francisco" },
        (0, import_utils.createToolOptions)("123", { name: "John" })
      );
      (0, import_vitest.expect)(result).toBe("The weather in San Francisco is sunny, John");
    });
    (0, import_vitest.it)("should properly type a callable function", async () => {
      const testFunction = (0, import_tool_context.tool)({
        description: "Test function",
        parameters: import_zod.z.object({
          name: import_zod.z.string().describe("The user name"),
          age: import_zod.z.number().describe("The user age")
        }),
        execute: async (args) => {
          return `${args.name} is ${args.age} years old`;
        }
      });
      const result = await testFunction.execute(
        { name: "John", age: 30 },
        (0, import_utils.createToolOptions)("123")
      );
      (0, import_vitest.expect)(result).toBe("John is 30 years old");
    });
    (0, import_vitest.it)("should handle async execution", async () => {
      const testFunction = (0, import_tool_context.tool)({
        description: "Async test function",
        parameters: import_zod.z.object({
          delay: import_zod.z.number().describe("Delay in milliseconds")
        }),
        execute: async (args) => {
          await new Promise((resolve) => setTimeout(resolve, args.delay));
          return args.delay;
        }
      });
      const start = Date.now();
      const result = await testFunction.execute({ delay: 100 }, (0, import_utils.createToolOptions)("123"));
      const duration = Date.now() - start;
      (0, import_vitest.expect)(result).toBe(100);
      (0, import_vitest.expect)(duration).toBeGreaterThanOrEqual(95);
    });
    (0, import_vitest.describe)("nested array support", () => {
      (0, import_vitest.it)("should handle nested array fields", () => {
        const schema = import_zod.z.object({
          items: import_zod.z.array(
            import_zod.z.object({
              name: import_zod.z.string().describe("the item name"),
              modifiers: import_zod.z.array(
                import_zod.z.object({
                  modifier_name: import_zod.z.string(),
                  modifier_value: import_zod.z.string()
                })
              ).describe("list of the modifiers applied on this item, such as size")
            })
          )
        });
        const result = (0, import_utils.oaiParams)(schema);
        (0, import_vitest.expect)(result).toMatchSnapshot();
      });
    });
    (0, import_vitest.describe)("optional parameters", () => {
      (0, import_vitest.it)("should create a tool without parameters", async () => {
        const simpleAction = (0, import_tool_context.tool)({
          description: "Perform a simple action",
          execute: async () => {
            return "Action performed";
          }
        });
        (0, import_vitest.expect)(simpleAction.type).toBe("function");
        (0, import_vitest.expect)(simpleAction.description).toBe("Perform a simple action");
        (0, import_vitest.expect)(simpleAction.parameters).toBeDefined();
        (0, import_vitest.expect)(simpleAction.parameters._def.typeName).toBe("ZodObject");
        const result = await simpleAction.execute({}, (0, import_utils.createToolOptions)("123"));
        (0, import_vitest.expect)(result).toBe("Action performed");
      });
      (0, import_vitest.it)("should handle tools with context but no parameters", async () => {
        const greetUser = (0, import_tool_context.tool)({
          description: "Greet the current user",
          execute: async (_, { ctx }) => {
            return `Hello, ${ctx.userData.username}!`;
          }
        });
        const result = await greetUser.execute({}, (0, import_utils.createToolOptions)("123", { username: "Alice" }));
        (0, import_vitest.expect)(result).toBe("Hello, Alice!");
      });
      (0, import_vitest.it)("should create a tool that accesses tool call id without parameters", async () => {
        const getCallId = (0, import_tool_context.tool)({
          description: "Get the current tool call ID",
          execute: async (_, { toolCallId }) => {
            return `Tool call ID: ${toolCallId}`;
          }
        });
        const result = await getCallId.execute({}, (0, import_utils.createToolOptions)("test-id-456"));
        (0, import_vitest.expect)(result).toBe("Tool call ID: test-id-456");
      });
    });
  });
});
//# sourceMappingURL=tool_context.test.cjs.map