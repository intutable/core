import { EventSystem, RequestHandler } from "../events"

export class PluginLoader {
    events: EventSystem

    // These functions are just wrapper around their conterpart in EventSystem.
    // By doing it this way there is no boilerplate/ duplication involved
    listenForNotification: EventSystem["listenForNotification"]
    addMiddleware: EventSystem["addMiddleware"]
    request: EventSystem["request"]
    notify: EventSystem["notify"]

    constructor(events: EventSystem) {
        this.events = events

        this.listenForNotification = events.listenForNotification
        this.addMiddleware = events.addMiddleware
        this.notify = events.notify
        this.request = events.request
    }

    public listenForRequest(channel: string) {
        // This is necessary for chaining:
        // listenForRequests(...).on(...).on(...)
        const methodRegisterInterface = {
            on: (method: string, handler: RequestHandler) => {
                this.events.listenForRequest(channel, method, handler)
                return methodRegisterInterface
            },
        }
        return methodRegisterInterface
    }
}
