import { readFile } from "fs/promises"
import { EventSystem } from "../events"
import { join as joinPath } from "path"
import { PluginLoader } from "./PluginLoader"
import { Plugin, PluginInfo, PluginModule } from "./Plugin"
import { PluginHandle } from "./PluginHandle"

import glob from "glob"

/**
 * @param paths List of glob patterns
 */
export async function loadPlugins(patterns: string[], events: EventSystem): Promise<PluginHandle> {
    let plugins: Plugin[] = []

    const pluginLoader = new PluginLoader(events)

    const pluginFolders = patterns.flatMap(pattern =>
        glob.sync(pattern, { cwd: joinPath(__dirname, "../.."), absolute: true })
    )

    for (const pluginFolder of pluginFolders) {
        await loadPlugin(pluginFolder, pluginLoader)
            .then(plugin => plugins.push(plugin))
            .catch(err => {
                onPluginLoadError(events, pluginFolder, err)
            })
    }

    return new PluginHandle(plugins)
}

function onPluginLoadError(
    events: EventSystem,
    pluginPath: string,
    err: { code: string; message: string }
) {
    switch (err.code) {
        case "NO_INIT":
            events.notify({ channel: "core", method: "plugin-load-error", ...err })
            break
        case "ENOENT":
            events.notify({
                channel: "core",
                method: "plugin-load-error",
                message: `the folder ${pluginPath} does not contain a correct package.json and is ignored`,
            })
            break
        default:
            events.notify({
                channel: "core-plugin",
                method: "plugin-load-error",
                ...err,
                message: `an unexpected error occured while trying to load the plugin at ${pluginPath}: ${err.message}`,
            })
    }
}

async function loadPlugin(pluginFolderPath: string, pluginLoader: PluginLoader): Promise<Plugin> {
    const packageJson = joinPath(pluginFolderPath, "package.json")

    return readFile(packageJson)
        .then(content => content.toString())
        .then(JSON.parse)
        .then(async (content: any) => ({
            info: {
                name: content.name,
            },
            module: await initializePlugin(pluginFolderPath, pluginLoader),
        }))
        .then(pluginInfo => ({ ...pluginInfo, path: pluginFolderPath }))
}

function initializePlugin(pluginPath: string, pluginLoader: PluginLoader): Promise<PluginModule> {
    return new Promise((resolve, reject) => {
        const module = require(pluginPath)

        if (!module.init) {
            reject({
                code: "NO_INIT",
                message: `the module at ${pluginPath} has no init function`,
            })
        }

        module.init(pluginLoader)
        resolve(module)
    })
}
