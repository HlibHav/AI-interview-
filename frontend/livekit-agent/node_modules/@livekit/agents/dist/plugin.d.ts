/// <reference types="node" resolution-mode="require"/>
import { EventEmitter } from 'events';
export declare enum PluginEventTypes {
    PluginRegistered = "plugin_registered"
}
export type PluginEventMap = {
    [PluginEventTypes.PluginRegistered]: [Plugin];
};
export declare abstract class Plugin {
    #private;
    static registeredPlugins: Plugin[];
    static emitter: EventEmitter<PluginEventMap>;
    constructor(opts: {
        title: string;
        version: string;
        package: string;
    });
    static registerPlugin(plugin: Plugin): void;
    downloadFiles(): void;
    get package(): string;
    get title(): string;
    get version(): string;
}
//# sourceMappingURL=plugin.d.ts.map