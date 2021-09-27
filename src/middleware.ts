import { CoreRequest, EventSystem } from "./events"

export enum MiddlewareResponseType {
    Pass,
    Resolve,
    Reject,
}

export interface MiddlewareResponse {
    type: MiddlewareResponseType
    payload: any
}
export type Middleware = (channel: string, request: CoreRequest) => Promise<MiddlewareResponse>
export type MiddlewareLoader = (events: EventSystem) => Middleware
