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
export type Middleware = (request: CoreRequest) => Promise<MiddlewareResponse>
