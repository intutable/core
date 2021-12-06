import { NotificationHandler } from ".."
import { EventSystem, RequestHandler } from "../events"

export class PluginLoader {
    events: EventSystem

    // These functions are just wrapper around their conterpart in EventSystem.
    // By doing it this way there is no boilerplate/ duplication involved
    addMiddleware: EventSystem["addMiddleware"]
    request: EventSystem["request"]
    notify: EventSystem["notify"]
    listenForAllNotifications: EventSystem["listenForAllNotifications"]

    constructor(events: EventSystem) {
        this.events = events

        this.addMiddleware = events.addMiddleware.bind(events)
        this.notify = events.notify.bind(events)
        this.request = events.request.bind(events)
        this.listenForAllNotifications = events.listenForAllNotifications.bind(events)
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

    public listenForNotifications(channel: string) {
        const methodRegisterInterface = {
            // This is necessary for chaining:
            // listenForRequests(...).on(...).on(...)
            on: (method: string, handler: NotificationHandler) => {
                this.events.listenForNotifications(channel, method, handler)
                return methodRegisterInterface
            },
        }
        return methodRegisterInterface
    }
}
