import { EventSystem, Message } from "./events"
import { Logger } from "./utils"

export interface CoreRequest extends Message {}
export type CoreResponse = any

export type RequestHandlerFunc = (request: CoreRequest) => Promise<CoreResponse>

export class RequestHandler {
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
