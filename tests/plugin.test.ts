import {EventSystem, CoreNotification} from "../src/events"
import {PluginHandle, loadPlugins, Plugin} from "../src/plugins"

import path from "path"

import fs from "fs"

const TEST_PLUGIN_PATH = "tests/testPlugins/"

let events = new EventSystem()

interface packageJson {
    name: string,
    version: string
}

function makeIndexFile(channelName: string, functionName = "init", listener = "greeting"): string {
    return `module.exports = { 
        ${functionName}: function (plugin) {
            plugin.listenForRequests(\"${channelName}\").on(\"${listener}\", request => { 
                return Promise.resolve({ message: \"Hello from the first plugin\" })
            }) 
        }, 
    }`
}

function createPackageJson(name: string, version: string): packageJson {
    return {name: `${name}`, version: `${version}`}
}

async function createPlugin(name: string, indexContent: string, createPackage = true, pluginFolder = TEST_PLUGIN_PATH) {
    await fs.promises.mkdir(pluginFolder + name, {recursive: true})
    if (createPackage) {
        await fs.promises.writeFile(pluginFolder + name + '/package.json', JSON.stringify(createPackageJson(name, "0.1.0")))
    }
    await fs.promises.writeFile(pluginFolder + name + '/index.js', indexContent)
}

async function deletePlugins() {
    await fs.promises.rm(TEST_PLUGIN_PATH, {recursive: true, force: true})
}

beforeEach(async () => {
    await deletePlugins()
})

afterEach(async () => {
    await deletePlugins()
})

describe("loading of plugins", () => {
    test("plugins are loaded from a folder", async () => {
        await createPlugin("testPlugin1", makeIndexFile("channel1"))
        await createPlugin("testPlugin2", makeIndexFile("channel2"))

        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        expect(pluginHandle.plugins.map(p => p.info.name)).toEqual(["testPlugin1", "testPlugin2"])
    })

    test("invalid folders are not loaded", async () => {
        /* This includes folders that:
         * dont have a package.json
         * cannot be loaded by require
         * dont have an init function in the entrypoint of the module
         */
        await createPlugin("missingPackageJson", makeIndexFile("channel1"), false)
        await createPlugin("noInitFile", makeIndexFile("channel1", "definitelyNotInit"))


        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        expect(pluginHandle.plugins).toHaveLength(0)
    })

    test("discovered plugins are loaded as node modules", async () => {
        let pluginName: string = "testPlugin123"
        await createPlugin(pluginName, makeIndexFile("channel1"))
        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        let firstPlugin = pluginHandle.plugins[0]

        expect(firstPlugin.module).toEqual(
            require(path.join(__dirname,"../" + TEST_PLUGIN_PATH + pluginName))
        )
    })

    test("plugins can be loaded from multiple folders", async () => {
        await createPlugin("firstplugin", makeIndexFile("channel1"), true, "tests/testOtherPlugins/")
        await createPlugin("secondplugin", makeIndexFile("channel2"))
        let pluginHandle: PluginHandle = await loadPlugins(
            ["tests/testOtherPlugins/*", TEST_PLUGIN_PATH + "*"],
            events
        )

        expect(pluginHandle.plugins.map(p => p.info.name)).toEqual(["firstplugin", "secondplugin"])

        await fs.promises.rm("tests/testOtherPlugins/", {recursive: true, force: true})
    })
})

describe("communication of plugins", () => {
    test("plugins can answer requests on the event bus ", async () => {
        await createPlugin("testPlugin1", makeIndexFile("testPlugin1"))
        await loadPlugins([TEST_PLUGIN_PATH + "*"], events)
        const response = await events.request({channel: "testPlugin1", method: "greeting"})

        expect(response).toEqual({message: "Hello from the first plugin"})
    })
})
