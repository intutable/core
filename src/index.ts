import path from "path"
import { EventSystem } from "./events"
import { loadPlugins, PluginHandle } from "./plugins"

const DEFAULT_PLUGIN_PATH = path.join(__dirname, "../node_modules/@intutable")

export class IntuTable {
    events: EventSystem
    plugins: PluginHandle

    private constructor(events: EventSystem, plugins: PluginHandle) {
        this.events = events
        this.plugins = plugins
    }

    public static async create(): Promise<IntuTable> {
        let events = new EventSystem()
        let plugins = await loadPlugins(DEFAULT_PLUGIN_PATH, events)

        return Promise.resolve(new this(events, plugins))
    }
}
