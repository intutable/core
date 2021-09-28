import { EventSystem } from "../events"
import { Middleware } from "../middleware"

export class PluginLoader {
    events: EventSystem
    requestHandlers: { [index: string]: { [index: string]: Function } }

    constructor(events: EventSystem) {
        this.events = events
        this.requestHandlers = {}
    }

    private registerMethod(channel: string, method: string, handler: Function) {
        //NOTE: if a handler was registered already it is overwritten
        //TODO: warn the user that this is happening and include in documentation
        this.requestHandlers[channel][method] = handler
    }

    public listenForNotification(channel: string, callback: Function) {
        return this.events.listenForNotification(channel, callback)
    }

    public notify(channel: string, message: object) {
        return this.events.notify(channel, message)
    }

    private handleRequest(channel: string, request: any, resolve: any, reject: any) {
        const handler = this.getRequestHandler(request, reject, channel)

        try {
            handler(request, resolve, reject)
        } catch (err) {
            reject({ message: "error occured", err })
        }
    }

    private getRequestHandler(request: any, reject: any, channel: string) {
        if (!request.method) {
            reject({ message: "need to specify a method" })
        }

        const handlers = this.requestHandlers[channel]

        if (!handlers.hasOwnProperty(request.method)) {
            reject({ message: `unknown method ${request.method}` })
        }

        return handlers[request.method]
    }

    private hasBeenRegistered(channel: string): boolean {
        return channel in this.requestHandlers
    }

    public listenForRequest(channel: string) {
        if (!this.hasBeenRegistered(channel)) {
            this.registerChannel(channel)
        }

        // This is necessary for chaining:
        // listenForRequests(...).on(...).on(...)
        const methodRegisterInterface = {
            on: (method: string, callback: Function) => {
                this.registerMethod(channel, method, callback)
                return methodRegisterInterface
            },
        }
        return methodRegisterInterface
    }

    private registerChannel(channel: string) {
        this.events.listenForRequest(channel, (...args) => this.handleRequest(channel, ...args))
        this.requestHandlers[channel] = {}
    }

    public request(channel: string, request: any): Promise<any> {
        return this.events.request(channel, request)
    }

    public addMiddleware(middleware: Middleware) {
        return this.events.addMiddleware(middleware)
    }
}
