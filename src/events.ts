/*
    The event bus contains two different systems
        1. Notifications:
            A component can notify others. This is a one way communication and does not/ cannot need an answer
        2. Request & Responses:
            A component can listen for requests on a channel and returns a response over the same

            Listening for requests is exclusive per channel. Only one component can do it at a time

        For consideration:
            - are 1 and 2 exclusive per channel? 
                Does a component listening for requests on a channel mean that notifications cannot be send 
*/

import {
    Middleware,
    MiddlewareResponse,
    MiddlewareResponseType,
    MiddlewareLoader,
} from "./middleware"

export type CoreRequest = object
type CoreResponse = object | object[] | string

type RequestHandler = (request: CoreRequest, resolve: Function, reject: Function) => void

export class EventSystem {
    private notificationListener: { [index: string]: Function[] }
    private requestListener: { [index: string]: RequestHandler }
    private middlewares: Middleware[]

    constructor() {
        this.notificationListener = {}
        this.requestListener = {}
        this.middlewares = []
    }

    public listenForNotification(channel: string, callback: Function) {
        if (this.notificationListener[channel]) {
            this.notificationListener[channel].push(callback)
        } else {
            this.notificationListener[channel] = [callback]
        }
    }

    public notify(channel: string, message: object) {
        if (this.notificationListener[channel]) {
            for (let subscriber of this.notificationListener[channel]) {
                subscriber()
            }
        }
    }

    public listenForRequest(channel: string, callback: RequestHandler): boolean {
        if (this.requestListener[channel]) {
            return false
        }

        this.requestListener[channel] = callback
        return true
    }

    private async handleMiddleware(
        channel: string,
        request: CoreRequest
    ): Promise<MiddlewareResponse> {
        for (let middleWare of this.middlewares) {
            let response = await middleWare(channel, request)

            if (response.type !== MiddlewareResponseType.Pass) {
                return new Promise((resolve, reject) => resolve(response))
            }

            if (response.payload) {
                request = response.payload
            }
        }

        return new Promise((resolve, reject) => {
            resolve({ type: MiddlewareResponseType.Pass, payload: request })
        })
    }

    private async handleRequest(channel: string, request: CoreRequest): Promise<CoreResponse> {
        return new Promise((resolve, reject) => {
            const handler = this.requestListener[channel]

            if (!handler) {
                return Promise.reject({ message: `no handler found for ${channel}` })
            }

            handler(request, resolve, reject)
        })
    }

    public async request(channel: string, request: CoreRequest): Promise<CoreResponse> {
        let { type, payload } = await this.handleMiddleware(channel, request)

        if (type === MiddlewareResponseType.Resolve) {
            return new Promise((resolve, reject) => resolve(payload))
        } else if (type === MiddlewareResponseType.Reject) {
            return new Promise((resolve, reject) => reject(payload))
        } else {
            return this.handleRequest(channel, payload)
        }
    }

    public addMiddleware(loader: MiddlewareLoader) {
        this.middlewares.push(loader(this))
    }
}
