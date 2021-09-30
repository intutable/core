import path from "path"
import { EventSystem } from "./events"
import { loadPlugins, PluginHandle } from "./plugins"

const DEFAULT_PLUGIN_PATH = path.join(__dirname, "../node_modules/@intutable/*")

export class IntuTable {
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
    ): Promise<IntuTable> {
        let plugins = await loadPlugins(pluginPaths, events)

        return Promise.resolve(new this(events, plugins))
    }
}
