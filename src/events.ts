import { timeStamp } from "console"
import { Middleware, MiddlewareResponse, MiddlewareResponseType } from "./middleware"

interface Message {
    channel: string
    method: string
    [index: string]: any
}

export interface CoreRequest extends Message {}

export interface CoreNotification extends Message {}

export type CoreResponse = object

export type RequestHandlerFunc = (request: CoreRequest) => Promise<CoreResponse>
export type NotificationHandlerFunc = (notification: CoreNotification) => void

class RequestHandler {
    private handlers: Record<string, Record<string, RequestHandlerFunc>>

    constructor(private events: EventSystem) {
        this.handlers = {}
    }

    public add(channel: string, method: string, handler: RequestHandlerFunc) {
        if (!this.handlers[channel]) {
            this.handlers[channel] = {}
        }

        if (this.handlers[channel][method]) {
            this.events.notify({
                channel: "core",
                method: "handler-overwrite",
                message: `overwriting request handler for method ${method} in channel ${channel}`,
            })
        }

        this.handlers[channel][method] = handler
    }

    public get(channel: string, method: string): RequestHandlerFunc {
        if (!this.handlers[channel]) {
            throw new Error(`no such channel ${channel}`)
        }

        if (!this.handlers[channel][method]) {
            throw new Error(`no such method ${method}`)
        }

        return this.handlers[channel][method]
    }
}

class NotificationHandler {
    private handlers: Record<string, Record<string, NotificationHandlerFunc[]>>
    private genericHandlers: NotificationHandlerFunc[]

    constructor(private events: EventSystem) {
        this.handlers = {}
        this.genericHandlers = []
    }

    public add(channel: string, method: string, handler: NotificationHandlerFunc) {
        if (!this.handlers[channel]) {
            this.handlers[channel] = {}
        }

        if (!this.handlers[channel][method]) {
            this.handlers[channel][method] = []
        }

        this.handlers[channel][method].push(handler)
    }

    public addGeneric(handler: NotificationHandlerFunc) {
        this.genericHandlers.push(handler)
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

    private hasGenericNotificationHandler() {
        return this.genericHandlers.length != 0
    }

    private hasNotificationHandler(channel: string, method: string) {
        return this.handlers[channel] && this.handlers[channel][method]
    }
}

export class EventSystem {
    private requestHandler: RequestHandler
    private notificationHandler: NotificationHandler
    private middlewares: Middleware[]
    private debugging: boolean

    constructor(debugging: boolean = false) {
        this.requestHandler = new RequestHandler(this)
        this.notificationHandler = new NotificationHandler(this)
        this.middlewares = []
        this.debugging = debugging
    }

    public listenForNotifications(
        channel: string,
        method: string,
        handler: NotificationHandlerFunc
    ) {
        this.notificationHandler.add(channel, method, handler)
        this.log("added notification listener for", channel)
    }

    public listenForAllNotifications(handler: NotificationHandlerFunc) {
        this.notificationHandler.addGeneric(handler)
        this.log("added notification listener for all channels")
    }

    public listenForRequests(channel: string, method: string, handler: RequestHandlerFunc) {
        this.requestHandler.add(channel, method, handler)
        this.log("added request listener for", channel, method)
    }

    public addMiddleware(middleware: Middleware) {
        this.middlewares.push(middleware)
        this.log("middleware added")
    }

    public async request(request: CoreRequest): Promise<CoreResponse> {
        this.log("request", request)
        let { type, payload } = await this.handleMiddleware(request)

        if (type === MiddlewareResponseType.Resolve) {
            return Promise.resolve(payload)
        } else if (type === MiddlewareResponseType.Reject) {
            return Promise.reject(payload)
        } else {
            return this.handleRequest(payload)
        }
    }

    public notify(notification: CoreNotification) {
        this.log("notification", notification)

        let { channel, method } = notification

        for (let subscriber of this.notificationHandler.get(channel, method)) {
            subscriber(notification)
        }
    }

    private log(...args: any[]) {
        if (this.debugging) {
            console.log(...args)
        }
    }

    private async handleMiddleware(request: CoreRequest): Promise<MiddlewareResponse> {
        for (let middleWare of this.middlewares) {
            let response = await middleWare(request)

            if (response.type !== MiddlewareResponseType.Pass) {
                return Promise.resolve(response)
            }

            if (response.payload) {
                request = response.payload
            }
        }

        return Promise.resolve({ type: MiddlewareResponseType.Pass, payload: request })
    }

    private async handleRequest({
        channel,
        method,
        ...request
    }: CoreRequest): Promise<CoreResponse> {
        const handler = this.requestHandler.get(channel, method)
        return handler({ channel, method, ...request })
    }
}
