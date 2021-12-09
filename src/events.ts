import { timeStamp } from "console"
import { Middleware, MiddlewareResponse, MiddlewareResponseType } from "./middleware"

interface Message {
    channel: string
    method: string
    [index: string]: any
}

export interface CoreRequest extends Message {}

export interface CoreNotification extends Message {}

export type CoreResponse = any

export type RequestHandlerFunc = (request: CoreRequest) => Promise<CoreResponse>
export type NotificationHandlerFunc = (notification: CoreNotification) => void

export class EventSystem {
    private logger: Logger

    private requestHandler: RequestHandler
    public listenForRequests: RequestHandler["add"]

    private notificationHandler: NotificationHandler
    public listenForNotifications: NotificationHandler["add"]
    public listenForAllNotifications: NotificationHandler["addGeneric"]
    public notify: NotificationHandler["handle"]

    private middlewareHandler: MiddlewareHandler
    public addMiddleware: MiddlewareHandler["add"]

    constructor(debugging: boolean = false) {
        this.logger = new Logger(debugging)
        this.requestHandler = new RequestHandler(this, this.logger)
        this.notificationHandler = new NotificationHandler(this, this.logger)
        this.middlewareHandler = new MiddlewareHandler(this, this.logger)

        // delegate to handlers
        this.listenForNotifications = this.notificationHandler.add.bind(this.notificationHandler)
        this.listenForAllNotifications = this.notificationHandler.addGeneric.bind(
            this.notificationHandler
        )
        this.notify = this.notificationHandler.handle.bind(this.notificationHandler)

        this.listenForRequests = this.requestHandler.add.bind(this.requestHandler)

        this.addMiddleware = this.middlewareHandler.add.bind(this.middlewareHandler)
    }

    public async request(request: CoreRequest): Promise<CoreResponse> {
        this.logger.log("request", request)
        let { type, payload } = await this.middlewareHandler.handle(request)

        if (type === MiddlewareResponseType.Resolve) {
            return Promise.resolve(payload)
        } else if (type === MiddlewareResponseType.Reject) {
            return Promise.reject(payload)
        } else {
            return this.requestHandler.handle(payload)
        }
    }
}

class RequestHandler {
    private handlers: Record<string, Record<string, RequestHandlerFunc>>

    constructor(private events: EventSystem, private logger: Logger) {
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

        this.logger.log("added request listener for", channel, method)
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

    public handle(request: CoreRequest): Promise<CoreResponse> {
        return this.get(request.channel, request.method)(request)
    }
}

class NotificationHandler {
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

    private hasGenericNotificationHandler() {
        return this.genericHandlers.length != 0
    }

    private hasNotificationHandler(channel: string, method: string) {
        return this.handlers[channel] && this.handlers[channel][method]
    }
}

class MiddlewareHandler {
    private middlewares: Middleware[]

    constructor(private events: EventSystem, private logger: Logger) {
        this.middlewares = []
    }

    public get(): Middleware[] {
        return this.middlewares
    }

    public add(middleWare: Middleware) {
        this.middlewares.push(middleWare)
        this.logger.log("middleware added")
    }

    public async handle(request: CoreRequest): Promise<MiddlewareResponse> {
        for (let middleware of this.middlewares) {
            let response = await middleware(request)

            // if it's not pass it is either resolved or rejected
            if (response.type !== MiddlewareResponseType.Pass) {
                return response
            }

            // if the middleware changed the request
            if (response.payload) {
                request = response.payload
            }
        }

        return { type: MiddlewareResponseType.Pass, payload: request }
    }
}

// this should be replaced with logging plugin
class Logger {
    constructor(private debugging: boolean = false) {}

    public log(...args: any[]) {
        if (this.debugging) {
            console.log(...args)
        }
    }
}
