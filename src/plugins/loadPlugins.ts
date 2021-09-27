import { readdir, readFile } from "fs/promises"
import { EventSystem } from "../events"
import { join as joinPath } from "path"
import { PluginLoader } from "./PluginLoader"
import { Plugin, PluginModule } from "./Plugin"
import { PluginHandle } from "./PluginHandle"

// TODO: default load path?
export async function loadPlugins(
    paths: string | string[],
    events: EventSystem
): Promise<PluginHandle> {
    if (typeof paths === "string") {
        paths = [paths]
    }

    let plugins: Plugin[] = []

    for (const path of paths) {
        const pluginsFolders = await readdir(path)
        const pluginLoader = new PluginLoader(events)

        for (let pluginFolder of pluginsFolders) {
            const pluginFolderPath = joinPath(path, pluginFolder)
            const packageJson = joinPath(pluginFolderPath, "package.json")

            await readFile(packageJson)
                .then(content => content.toString())
                .then(JSON.parse)
                .then(content => content.pluginInfo)
                .then(async pluginInfo => ({
                    info: pluginInfo,
                    module: await initializePlugin(pluginFolderPath, pluginLoader),
                }))
                .then(pluginInfo => plugins.push({ ...pluginInfo, path: pluginFolderPath }))
                .catch(err => {
                    switch (err.code) {
                        case "NO_INIT":
                            console.log(err.message)
                            break
                        case "ENOENT":
                            console.log(
                                `the folder ${pluginFolder} does not contain a correct package.json and is ignored`
                            )
                            break
                        default:
                            console.log(
                                "an unexpected error occured while trying to load the module at "
                            )
                    }
                })
        }
    }

    return new PluginHandle(plugins)
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
