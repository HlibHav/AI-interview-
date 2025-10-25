"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var plugin_exports = {};
__export(plugin_exports, {
  Plugin: () => Plugin,
  PluginEventTypes: () => PluginEventTypes
});
module.exports = __toCommonJS(plugin_exports);
var import_events = require("events");
var PluginEventTypes = /* @__PURE__ */ ((PluginEventTypes2) => {
  PluginEventTypes2["PluginRegistered"] = "plugin_registered";
  return PluginEventTypes2;
})(PluginEventTypes || {});
class Plugin {
  static registeredPlugins = [];
  static emitter = new import_events.EventEmitter();
  #title;
  #version;
  #package;
  constructor(opts) {
    this.#title = opts.title;
    this.#version = opts.version;
    this.#package = opts.package;
  }
  static registerPlugin(plugin) {
    Plugin.registeredPlugins.push(plugin);
    Plugin.emitter.emit("plugin_registered" /* PluginRegistered */, plugin);
  }
  downloadFiles() {
  }
  get package() {
    return this.#package;
  }
  get title() {
    return this.#title;
  }
  get version() {
    return this.#version;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Plugin,
  PluginEventTypes
});
//# sourceMappingURL=plugin.cjs.map