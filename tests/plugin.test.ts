import { EventSystem, CoreNotification } from "../src/events"
import { PluginHandle, loadPlugins, Plugin } from "../src/plugins"

import path from "path"
import fs from "fs"

const TEST_PLUGIN_PATH = "tests/testPlugins/"

let events = new EventSystem()

interface packageJson {
    name: string
    version: string
}

// make sure to delete every test plugin before the test starts in case of test errors
beforeEach(async () => {
    await deleteTestPlugins()
})

afterEach(async () => {
    await deleteTestPlugins()
})

describe("loading of plugins", () => {
    test("plugins are loaded from a folder", async () => {
        await createPlugin("testPlugin1", createIndexFile("channel1"))
        await createPlugin("testPlugin2", createIndexFile("channel2"))

        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        expect(pluginHandle.plugins.map(p => p.info.name)).toEqual(["testPlugin1", "testPlugin2"])
    })

    test("invalid folders are not loaded", async () => {
        /* This includes folders that:
         * dont have a package.json
         * cannot be loaded by require
         * dont have an init function in the entrypoint of the module
         */
        await createPlugin("missingPackageJson", createIndexFile("channel1"), false)
        await createPlugin("noInitFile", createIndexFile("channel1", "definitelyNotInit"))

        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        expect(pluginHandle.plugins).toHaveLength(0)
    })

    test("discovered plugins are loaded as node modules", async () => {
        let pluginName: string = "testPlugin123"
        await createPlugin(pluginName, createIndexFile("channel1"))
        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        let firstPlugin = pluginHandle.plugins[0]

        expect(firstPlugin.module).toEqual(
            require(path.join(__dirname, "../" + TEST_PLUGIN_PATH + pluginName))
        )
    })

    test("plugins can be loaded from multiple folders", async () => {
        await createPlugin(
            "firstplugin",
            createIndexFile("channel1"),
            true,
            "tests/testOtherPlugins/"
        )
        await createPlugin("secondplugin", createIndexFile("channel2"))
        let pluginHandle: PluginHandle = await loadPlugins(
            ["tests/testOtherPlugins/*", TEST_PLUGIN_PATH + "*"],
            events
        )

        expect(pluginHandle.plugins.map(p => p.info.name)).toEqual(["firstplugin", "secondplugin"])

        await fs.promises.rm("tests/testOtherPlugins/", { recursive: true, force: true })
    })
})

describe("communication of plugins", () => {
    test("plugins can answer requests on the event bus ", async () => {
        await createPlugin("testPlugin1", createIndexFile("testPlugin1"))
        await loadPlugins([TEST_PLUGIN_PATH + "*"], events)
        const response = await events.request({ channel: "testPlugin1", method: "greeting" })

        expect(response).toEqual({ message: "Hello from the first plugin" })
    })
})

async function createPlugin(
    pluginName: string,
    indexContent: string,
    createPackage = true,
    pluginFolder = TEST_PLUGIN_PATH
) {
    await fs.promises.mkdir(pluginFolder + pluginName, { recursive: true })
    if (createPackage) {
        await fs.promises.writeFile(
            pluginFolder + pluginName + "/package.json",
            JSON.stringify(createPackageJson(pluginName, "0.1.0"))
        )
    }
    await fs.promises.writeFile(pluginFolder + pluginName + "/index.js", indexContent)
}

function createPackageJson(name: string, version: string): packageJson {
    return { name: `${name}`, version: `${version}` }
}

function createIndexFile(
    channelName: string,
    functionName = "init",
    listener = "greeting"
): string {
    return `module.exports = { 
        ${functionName}: function (plugin) {
            plugin.listenForRequests(\"${channelName}\").on(\"${listener}\", request => { 
                return Promise.resolve({ message: \"Hello from the first plugin\" })
            }) 
        }, 
    }`
}

async function deleteTestPlugins() {
    await fs.promises.rm(TEST_PLUGIN_PATH, { recursive: true, force: true })
}
