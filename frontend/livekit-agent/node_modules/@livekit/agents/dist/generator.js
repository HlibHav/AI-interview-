function isAgent(obj) {
  return typeof obj === "object" && obj !== null && "entry" in obj && typeof obj.entry === "function" && ("prewarm" in obj && typeof obj.prewarm === "function" || !("prewarm" in obj));
}
function defineAgent(agent) {
  return agent;
}
export {
  defineAgent,
  isAgent
};
//# sourceMappingURL=generator.js.map