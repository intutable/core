import { EventSystem, Message } from "."
import { Logger } from "./utils"

export interface CoreNotification extends Message {}
export type NotificationHandlerFunc = (notification: CoreNotification) => void

export class NotificationHandler {
    private handlers: Record<string, Record<string, NotificationHandlerFunc[]>>
    private genericHandlers: NotificationHandlerFunc[]

    constructor(private events: EventSystem, private logger: Logger) {
        this.handlers = {}
        this.genericHandlers = []
    }

    public handle(notification: CoreNotification) {
        this.logger.log("notification", notification)

        for (let subscriber of this.get(notification.channel, notification.method)) {
            subscriber(notification)
        }
    }

    public add(channel: string, method: string, handler: NotificationHandlerFunc) {
        if (!this.handlers[channel]) {
            this.handlers[channel] = {}
        }

        if (!this.handlers[channel][method]) {
            this.handlers[channel][method] = []
        }

        this.handlers[channel][method].push(handler)

        this.logger.log("added notification listener for", channel)
    }

    public addGeneric(handler: NotificationHandlerFunc) {
        this.genericHandlers.push(handler)
        this.logger.log("added notification listener for all channels")
    }

    public get(channel: string, method: string): NotificationHandlerFunc[] {
        const handlers = this.getHandlers(channel, method).concat(this.genericHandlers)

        if (handlers.length === 0 && method !== "undefinded-notification-handler") {
            this.events.notify({
                channel: "core",
                method: "undefinded-notification-handler",
                message: `could not find any handler for ${channel}/${method}`,
            })
        }

        return handlers
    }

    private getHandlers(channel: string, method: string): NotificationHandlerFunc[] {
        if (this.hasNotificationHandler(channel, method)) {
            return this.handlers[channel][method]
        } else {
            return []
        }
    }

    private hasNotificationHandler(channel: string, method: string) {
        return this.handlers[channel] && this.handlers[channel][method]
    }
}
