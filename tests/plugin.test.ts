import { EventSystem } from "../src/events"
import { PluginHandle, loadPlugins } from "../src/plugins"

import path from "path"
import fs from "fs"

const TEST_PLUGIN_PATH = "tests/testPlugins/"

let events = new EventSystem()

// make sure to delete every test plugin before the test starts in case of test errors
beforeEach(async () => {
    await deleteTestPlugins()
})

afterEach(async () => {
    await deleteTestPlugins()
})

describe("loading of plugins", () => {
    test("plugins are loaded from a folder", async () => {
        await createPlugin({ name: "testPlugin1", channel: "channel1" })
        await createPlugin({ name: "testPlugin2", channel: "channel2" })

        let pluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        expect(loadedPluginNames(pluginHandle)).toEqual(["testPlugin1", "testPlugin2"])
    })

    test("invalid folders are not loaded", async () => {
        /* This includes folders that:
         * dont have a package.json
         * cannot be loaded by require
         * dont have an init function in the entrypoint of the module
         */
        await createPlugin({
            name: "missingPackageJson",
            channel: "channel1",
            createPackage: false,
        })
        await createPlugin({
            name: "noInitFile",
            channel: "channel1",
            initFunctionName: "definitelyNotInit",
        })

        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        expect(pluginHandle.plugins).toHaveLength(0)
    })

    test("discovered plugins are loaded as node modules", async () => {
        let pluginName: string = "testPlugin123"
        await createPlugin({ name: pluginName, channel: "channel1" })
        let pluginHandle: PluginHandle = await loadPlugins([TEST_PLUGIN_PATH + "*"], events)

        let firstPlugin = pluginHandle.plugins[0]

        expect(firstPlugin.module).toEqual(
            require(path.join(__dirname, "../" + TEST_PLUGIN_PATH + pluginName))
        )
    })

    test("plugins can be loaded from multiple folders", async () => {
        await createPlugin({
            name: "firstplugin",
            channel: "channel1",
            createPackage: true,
            folder: "tests/testOtherPlugins/",
        })
        await createPlugin({
            name: "secondplugin",
            channel: "channel2",
        })
        let pluginHandle = await loadPlugins(
            ["tests/testOtherPlugins/*", TEST_PLUGIN_PATH + "*"],
            events
        )

        expect(loadedPluginNames(pluginHandle)).toEqual(["firstplugin", "secondplugin"])

        await fs.promises.rm("tests/testOtherPlugins/", { recursive: true, force: true })
    })

    test("plugins are loaded after their dependencies", async () => {
        await createPlugin({
            name: "firstplugin",
            channel: "channel1",
            dependencies: {
                secondplugin: "1.0.0",
            },
        })

        await createPlugin({
            name: "secondplugin",
            channel: "channel2",
        })

        let pluginHandle = await loadPlugins(
            [
                path.join(TEST_PLUGIN_PATH, "firstplugin"),
                path.join(TEST_PLUGIN_PATH, "secondplugin"),
            ],
            events
        )

        // second is loaded first because first depends on it
        expect(loadedPluginNames(pluginHandle)).toEqual(["secondplugin", "firstplugin"])
    })
})

describe("communication of plugins", () => {
    test("plugins can answer requests on the event bus ", async () => {
        const PLUGIN_NAME = "testPluginForRequestAnswers"

        await createPlugin({ name: PLUGIN_NAME, channel: PLUGIN_NAME })
        await loadPlugins([TEST_PLUGIN_PATH + "*"], events)
        const response = await events.request({ channel: PLUGIN_NAME, method: "greeting" })

        expect(response).toEqual({ message: "Hello from the first plugin" })
    })
})

interface PluginOptions {
    name: string
    channel: string
    initFunctionName?: string
    createPackage?: boolean
    folder?: string
    [key: string]: any
}

async function createPlugin({
    name,
    channel,
    folder = TEST_PLUGIN_PATH,
    createPackage = true,
    initFunctionName,
    ...packageJsonContent
}: PluginOptions) {
    await fs.promises.mkdir(folder + name, { recursive: true })
    if (createPackage) {
        await fs.promises.writeFile(
            folder + name + "/package.json",
            createPackageJson(name, packageJsonContent)
        )
    }
    await fs.promises.writeFile(
        folder + name + "/index.js",
        createIndexFile(channel, initFunctionName)
    )
}

function createPackageJson(name: string, otherContent: object): string {
    return JSON.stringify({ name: `${name}`, version: "0.1.0", ...otherContent })
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

function loadedPluginNames(pluginHandle: PluginHandle): string[] {
    return pluginHandle.plugins.map(p => p.info.name)
}
