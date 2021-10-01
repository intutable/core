import path from "path"
import { EventSystem } from "./events"
import { loadPlugins, PluginHandle } from "./plugins"

export * from "./plugins"
export * from "./events"
export * from "./middleware"

const DEFAULT_PLUGIN_PATH = path.join(__dirname, "../node_modules/@intutable/*")

export class Core {
    events: EventSystem
    plugins: PluginHandle

    private constructor(events: EventSystem, plugins: PluginHandle) {
        this.events = events
        this.plugins = plugins
    }

    /**
     * @param pluginPaths defaults to node_modules/@intutable
     */
    public static async create(
        pluginPaths: string[] = [DEFAULT_PLUGIN_PATH],
        events: EventSystem = new EventSystem()
    ): Promise<Core> {
        let plugins = await loadPlugins(pluginPaths, events)

        return Promise.resolve(new this(events, plugins))
    }
}
