import { Plugin } from "./Plugin"

export class PluginHandle {
    private _plugins: Plugin[]

    constructor(plugins: Plugin[]) {
        this._plugins = plugins
    }

    public closeAll() {
        for (let plugin of this._plugins) {
            if (plugin.module.close) {
                plugin.module.close()
            }
        }
    }

    public get plugins(): Plugin[] {
        return this._plugins
    }
}
