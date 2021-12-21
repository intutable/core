import { CoreRequest, EventSystem } from "./events"
import { Logger } from "./utils"

export enum MiddlewareResponseType {
    Pass,
    Resolve,
    Reject,
}

export interface MiddlewareResponse {
    type: MiddlewareResponseType
    payload: any
}
export type Middleware = (request: CoreRequest) => Promise<MiddlewareResponse>

export class MiddlewareHandler {
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
