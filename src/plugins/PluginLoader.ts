import { EventSystem, RequestHandler } from "../events"

export class PluginLoader {
    events: EventSystem

    // These functions are just wrapper around their conterpart in EventSystem.
    // By doing it this way there is no boilerplate/ duplication involved
    listenForNotifications: EventSystem["listenForNotifications"]
    addMiddleware: EventSystem["addMiddleware"]
    request: EventSystem["request"]
    notify: EventSystem["notify"]

    constructor(events: EventSystem) {
        this.events = events

        this.listenForNotifications = events.listenForNotifications.bind(events)
        this.addMiddleware = events.addMiddleware.bind(events)
        this.notify = events.notify.bind(events)
        this.request = events.request.bind(events)
    }

    public listenForRequests(channel: string) {
        // This is necessary for chaining:
        // listenForRequests(...).on(...).on(...)
        const methodRegisterInterface = {
            on: (method: string, handler: RequestHandler) => {
                this.events.listenForRequests(channel, method, handler)
                return methodRegisterInterface
            },
        }
        return methodRegisterInterface
    }
}
