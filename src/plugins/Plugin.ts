export interface PluginModule {
    init: Function
    close?: Function
}

export interface Plugin {
    module: PluginModule
    info: {
        name: string
    }
    path: string
}
