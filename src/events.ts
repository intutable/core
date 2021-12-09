import { MiddlewareHandler, MiddlewareResponseType } from "./middleware"
import { CoreNotification, NotificationHandler } from "./notifications"
import { CoreRequest, CoreResponse, RequestHandler } from "./requests"
import { Logger } from "./utils"

export { CoreRequest, CoreResponse, CoreNotification }

export interface Message {
    channel: string
    method: string
    [index: string]: any
}

export class EventSystem {
    private logger: Logger
    private requests: RequestHandler
    private notifications: NotificationHandler
    private middleware: MiddlewareHandler

    public listenForRequests: RequestHandler["add"]
    public listenForNotifications: NotificationHandler["add"]
    public listenForAllNotifications: NotificationHandler["addGeneric"]
    public notify: NotificationHandler["handle"]

    public addMiddleware: MiddlewareHandler["add"]

    constructor(debugging: boolean = false) {
        this.logger = new Logger(debugging)
        this.requests = new RequestHandler(this, this.logger)
        this.notifications = new NotificationHandler(this, this.logger)
        this.middleware = new MiddlewareHandler(this, this.logger)

        // delegate to handlers
        this.listenForNotifications = this.notifications.add.bind(this.notifications)
        this.listenForAllNotifications = this.notifications.addGeneric.bind(this.notifications)
        this.notify = this.notifications.handle.bind(this.notifications)

        this.listenForRequests = this.requests.add.bind(this.requests)

        this.addMiddleware = this.middleware.add.bind(this.middleware)
    }

    public async request(request: CoreRequest): Promise<CoreResponse> {
        this.logger.log("request", request)
        let { type, payload } = await this.middleware.handle(request)

        if (type === MiddlewareResponseType.Resolve) {
            return Promise.resolve(payload)
        } else if (type === MiddlewareResponseType.Reject) {
            return Promise.reject(payload)
        } else {
            return this.requests.handle(payload)
        }
    }
}
