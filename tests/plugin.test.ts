import { EventSystem } from "../src/events"
import { PluginHandle, loadPlugins, Plugin } from "../src/plugins"

import path from "path"

const PLUGIN_PATH = path.join(__dirname, "assets/validPlugins")
const INVALID_PLUGIN_PATH = path.join(__dirname, "assets/invalidPlugins")

let eventBus = new EventSystem()

describe("loading of plugins", () => {
    test("plugins are loaded from a folder", async () => {
        let pluginHandler: PluginHandle = await loadPlugins(PLUGIN_PATH, eventBus)

        expect(pluginHandler.plugins.map(p => p.info.name)).toEqual(["firstPlugin", "secondPlugin"])
    })

    test("invalid folders are not loaded", async () => {
        /* This includes folders that:
         * dont have a package.json
         * dont have a pluginInfo entry in the package.json
         * cannot be loaded by require
         * dont have an init function in the entrypoint of the module
         */

        let pluginHandle: PluginHandle = await loadPlugins(INVALID_PLUGIN_PATH, eventBus)

        expect(pluginHandle.plugins).toHaveLength(0)
    })

    test("discovered plugins are loaded as node modules", async () => {
        let pluginHandle: PluginHandle = await loadPlugins(PLUGIN_PATH, eventBus)

        let firstPlugin = pluginHandle.plugins[0]

        expect(firstPlugin.module).toEqual(require(`${PLUGIN_PATH}/firstPlugin`))
    })
})

describe("communication of plugins", () => {
    test("plugins can answer requests on the event bus ", async () => {
        await loadPlugins(PLUGIN_PATH, eventBus)
        const response = await eventBus.request("firstPlugin", { method: "greeting" })

        expect(response).toEqual({ message: "Hello from the first plugin" })
    })

    test("plugins create listeners when trying to use an uninitialized event bus ", async () => {})
})
