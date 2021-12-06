import { timeStamp } from "console"
import { Middleware, MiddlewareResponse, MiddlewareResponseType } from "./middleware"

interface Message {
    channel: string
    method: string
    [index: string]: any
}

export interface CoreRequest extends Message { }

export interface CoreNotification extends Message { }

export type CoreResponse = object

export type RequestHandler = (request: CoreRequest) => Promise<CoreResponse>
export type NotificationHandler = (notification: CoreNotification) => void

export class EventSystem {
    private notificationHandlers: { [index: string]: { [index: string]: NotificationHandler[] } }
    private notificationHandlersAll: NotificationHandler[]

    private requestHandlers: { [index: string]: { [index: string]: RequestHandler } }
    private middlewares: Middleware[]
    private debugging: boolean

    constructor(debugging: boolean = false) {
        this.notificationHandlers = {}
        this.notificationHandlersAll = []
        this.requestHandlers = {}
        this.middlewares = []
        this.debugging = debugging
    }

    public listenForNotifications(channel: string, method: string, handler: NotificationHandler) {
        if (!this.notificationHandlers[channel]) {
            this.notificationHandlers[channel] = {}
        }

        if (!this.notificationHandlers[channel][method]) {
            this.notificationHandlers[channel][method] = []
        }

        this.notificationHandlers[channel][method].push(handler)

        this.log("added notification listener for", channel)
    }

    public listenForAllNotifications(handler: NotificationHandler) {
        this.notificationHandlersAll.push(handler)

        this.log("added notification listener for all channels")
    }

    public listenForRequests(channel: string, method: string, handler: RequestHandler) {
        if (!this.requestHandlers[channel]) {
            this.requestHandlers[channel] = {}
        }

        if (this.requestHandlers[channel][method]) {
            this.notify({
                channel: "core",
                method: "handler-overwrite",
                message: `overwriting request handler for method ${method} in channel ${channel}`,
            })
        }

        this.requestHandlers[channel][method] = handler

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

        if (
            !this.hasNotificationHandler(channel, method) &&
            !this.hasGenericNotificationHandler()
        ) {
            if (method !== "undefinded-notification-handler") {
                this.notify({
                    channel: "core",
                    method: "undefinded-notification-handler",
                    message: "notification could not be delivered to anything",
                    notification,
                })
            }

            return
        }

        for (let subscriber of this.getNotificationHandlers(channel, method)) {
            subscriber(notification)
        }
    }

    private getNotificationHandlers(channel: string, method: string): NotificationHandler[] {
        if (this.hasNotificationHandler(channel, method)) {
            return this.notificationHandlers[channel][method].concat(this.notificationHandlersAll)
        } else {
            return this.notificationHandlersAll
        }
    }

    private hasGenericNotificationHandler() {
        return this.notificationHandlersAll.length != 0
    }

    private hasNotificationHandler(channel: string, method: string) {
        return this.notificationHandlers[channel] && this.notificationHandlers[channel][method]
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
        if (!this.requestHandlers[channel]) {
            return Promise.reject({ message: `no such channel ${channel}` })
        }

        if (!this.requestHandlers[channel][method]) {
            return Promise.reject({ message: `no such method ${method}` })
        }

        return this.requestHandlers[channel][method]({ channel, method, ...request })
    }
}
