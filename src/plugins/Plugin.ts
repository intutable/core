export interface PluginModule {
    init: Function
    close?: Function
}

export interface PluginInfo {
    name: string
}

export interface Plugin {
    module: PluginModule
    info: PluginInfo
    path: string
}
