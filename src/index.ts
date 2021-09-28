import path from "path"
import { EventSystem } from "./events"
import { loadPlugins, PluginHandle } from "./plugins"

const DEFAULT_PLUGIN_PATH = path.join(__dirname, "../node_modules/@intutable")

interface PluginPathArgs {
    pluginPath?: string
    additionalPluginPaths?: string[]
}

const DEFAULT_PLUGIN_PATH_ARGS = {
    pluginPath: DEFAULT_PLUGIN_PATH,
    additionalPluginPaths: [],
}

export class IntuTable {
    events: EventSystem
    plugins: PluginHandle

    private constructor(events: EventSystem, plugins: PluginHandle) {
        this.events = events
        this.plugins = plugins
    }

    public static async create(pluginPathArgs: PluginPathArgs): Promise<IntuTable> {
        let events = new EventSystem()

        let { pluginPath, additionalPluginPaths } = {
            ...DEFAULT_PLUGIN_PATH_ARGS,
            ...pluginPathArgs,
        }
        let plugins = await loadPlugins([pluginPath, ...additionalPluginPaths], events)

        return Promise.resolve(new this(events, plugins))
    }
}
