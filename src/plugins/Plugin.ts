export interface PluginModule {
    init: Function
    close?: Function
}

export interface PluginInfo {
    path: string
    name: string
    dependencies?: object
}

export interface Plugin {
    module: PluginModule
    info: PluginInfo
}
