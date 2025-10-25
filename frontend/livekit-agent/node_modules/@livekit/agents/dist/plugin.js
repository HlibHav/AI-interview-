import { EventEmitter } from "events";
var PluginEventTypes = /* @__PURE__ */ ((PluginEventTypes2) => {
  PluginEventTypes2["PluginRegistered"] = "plugin_registered";
  return PluginEventTypes2;
})(PluginEventTypes || {});
class Plugin {
  static registeredPlugins = [];
  static emitter = new EventEmitter();
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
export {
  Plugin,
  PluginEventTypes
};
//# sourceMappingURL=plugin.js.map