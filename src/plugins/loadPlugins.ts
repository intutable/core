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

    const pluginInfos = await loadPluginInfos(pluginFolders, events)

    for (const pluginInfo of pluginInfos) {
        await loadPlugin(pluginInfo, pluginLoader)
            .then(plugin => plugins.push(plugin))
            .catch(err => onPluginLoadError(events, pluginInfo, err))
    }

    return new PluginHandle(plugins)
}

async function loadPluginInfos(pluginPaths: string[], events: EventSystem): Promise<PluginInfo[]> {
    let results: PluginInfo[] = []

    for (const path of pluginPaths) {
        const packageJson = joinPath(path, "package.json")

        await readFile(packageJson)
            .then(content => content.toString())
            .then(JSON.parse)
            .then(packageJson => ({
                name: packageJson.name,
                dependencies: packageJson.dependencies,
                path,
            }))
            .then(info => results.push(info))
            .catch(err => {
                onPluginLoadError(events, { path } as PluginInfo, err)
            })
    }

    return results
}

function onPluginLoadError(
    events: EventSystem,
    pluginInfo: PluginInfo,
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
                message: `the folder ${pluginInfo.path} does not contain a correct package.json and is ignored`,
            })
            break
        default:
            events.notify({
                channel: "core-plugin",
                method: "plugin-load-error",
                ...err,
                message: `an unexpected error occured while trying to load the plugin at ${pluginInfo.path}: ${err.message}`,
            })
    }
}

async function loadPlugin(pluginInfo: PluginInfo, pluginLoader: PluginLoader): Promise<Plugin> {
    const module = await initializePlugin(pluginInfo.path, pluginLoader)

    return {
        info: pluginInfo,
        module,
    }
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
