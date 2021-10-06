import { Middleware, MiddlewareResponse, MiddlewareResponseType } from "./middleware"

interface Message {
    channel: string
    [index: string]: any
}

export interface CoreRequest extends Message {
    method: string
}
export interface CoreNotification extends Message {}

export type CoreResponse = object

export type RequestHandler = (request: CoreRequest) => Promise<CoreResponse>
export type NotificationHandler = (notification: CoreNotification) => void

export class EventSystem {
    private notificationHandlers: { [index: string]: NotificationHandler[] }
    private requestHandlers: { [index: string]: { [index: string]: RequestHandler } }
    private middlewares: Middleware[]

    constructor() {
        this.notificationHandlers = {}
        this.requestHandlers = {}
        this.middlewares = []
    }

    public listenForNotification(channel: string, callback: NotificationHandler) {
        if (this.notificationHandlers[channel]) {
            this.notificationHandlers[channel].push(callback)
        } else {
            this.notificationHandlers[channel] = [callback]
        }
    }

    public listenForRequest(channel: string, method: string, handler: RequestHandler) {
        if (!this.requestHandlers[channel]) {
            this.requestHandlers[channel] = {}
        }

        if (this.requestHandlers[channel][method]) {
            this.notify({
                channel: "core",
                message: `overwriting request handler for method ${method} in channel ${channel}`,
            })
        }

        this.requestHandlers[channel][method] = handler
    }

    public addMiddleware(middleware: Middleware) {
        this.middlewares.push(middleware)
    }

    public async request(request: CoreRequest): Promise<CoreResponse> {
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
        if (this.notificationHandlers[notification.channel]) {
            for (let subscriber of this.notificationHandlers[notification.channel]) {
                subscriber(notification)
            }
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
