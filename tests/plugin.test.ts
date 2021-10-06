import { EventSystem, CoreNotification } from "../src/events"
import { PluginHandle, loadPlugins, Plugin } from "../src/plugins"

import path from "path"

const PLUGIN_PATH = "tests/assets/validPlugins/*"
const INVALID_PLUGIN_PATH = "tests/assets/invalidPlugins/*"

let events = new EventSystem()

describe("loading of plugins", () => {
    test("plugins are loaded from a folder", async () => {
        let pluginHandle: PluginHandle = await loadPlugins([PLUGIN_PATH], events)

        expect(pluginHandle.plugins.map(p => p.info.name)).toEqual(["firstplugin", "secondplugin"])
    })

    test("invalid folders are not loaded", async () => {
        /* This includes folders that:
         * dont have a package.json
         * cannot be loaded by require
         * dont have an init function in the entrypoint of the module
         */

        let pluginHandle: PluginHandle = await loadPlugins([INVALID_PLUGIN_PATH], events)

        expect(pluginHandle.plugins).toHaveLength(0)
    })

    test("discovered plugins are loaded as node modules", async () => {
        let pluginHandle: PluginHandle = await loadPlugins([PLUGIN_PATH], events)

        let firstPlugin = pluginHandle.plugins[0]

        expect(firstPlugin.module).toEqual(
            require(path.join(__dirname, "assets/validPlugins/firstPlugin"))
        )
    })

    test("plugins can be loaded from multiple folders", async () => {
        let pluginHandle: PluginHandle = await loadPlugins(
            [PLUGIN_PATH, INVALID_PLUGIN_PATH],
            events
        )

        expect(pluginHandle.plugins.map(p => p.info.name)).toEqual(["firstplugin", "secondplugin"])
    })
})

describe("communication of plugins", () => {
    test("plugins can answer requests on the event bus ", async () => {
        await loadPlugins([PLUGIN_PATH], events)
        const response = await events.request({ channel: "firstPlugin", method: "greeting" })

        expect(response).toEqual({ message: "Hello from the first plugin" })
    })

    test("plugins create listeners when trying to use an uninitialized event bus ", async () => {})
})
