import { CoreRequest, CoreResponse, EventSystem, CoreNotification } from "../src/events"
import { MiddlewareResponseType } from "../src/middleware"

let events: EventSystem
let notificationHandler1: jest.Mock
let notificationHandler2: jest.Mock

let requestHandler1: jest.Mock
let requestHandler2: jest.Mock
let middleware: jest.Mock
let rejectingMiddleware: jest.Mock
let resolvingMiddleware: jest.Mock

const channel = "channel"
const otherChannel = "otherChannel"

const method = "method"
const otherMethod = "otherMethod"

const notification: CoreNotification = { channel, method, message: "this is a message" }
const request: CoreRequest = { channel, method, message: "this is a request" }

beforeEach(async () => {
    //needs to be reset every time
    // don't use any of the reset functions for this
    // it does not work https://github.com/facebook/jest/issues/7136
    notificationHandler1 = jest.fn((notification: CoreNotification) => { })
    notificationHandler2 = jest.fn((notification: CoreNotification) => { })

    requestHandler1 = jest.fn(request => Promise.resolve({}))
    requestHandler2 = jest.fn(request => Promise.resolve({}))

    middleware = jest.fn(request =>
        Promise.resolve({ type: MiddlewareResponseType.Pass, payload: request })
    )
    rejectingMiddleware = jest.fn(request => ({
        type: MiddlewareResponseType.Reject,
        payload: {},
    }))

    resolvingMiddleware = jest.fn(request => ({
        type: MiddlewareResponseType.Resolve,
        payload: {},
    }))

    events = new EventSystem() // set before each to avoid state from previous tests
})

describe("notification events", () => {
    test("subscribers are notified about events", () => {
        events.listenForNotifications(channel, method, notificationHandler1)
        events.notify(notification)

        expect(notificationHandler1).toHaveBeenCalled()
        expect(notificationHandler1.mock.calls[0]).toEqual([notification])
    })

    test("the event handler is only called when the event is triggered", () => {
        events.listenForNotifications(channel, method, notificationHandler1)

        expect(notificationHandler1).not.toHaveBeenCalled()
    })

    test("subscribers are notified about mutliple events", () => {
        events.listenForNotifications(channel, method, notificationHandler1)

        events.notify(notification)
        events.notify(notification)

        expect(notificationHandler1.mock.calls.length).toBe(2)
    })

    test("multiple components can listen to the same channel", () => {
        events.listenForNotifications(channel, method, notificationHandler1)
        events.listenForNotifications(channel, method, notificationHandler2)

        events.notify(notification)

        expect(notificationHandler1).toHaveBeenCalled()
        expect(notificationHandler2).toHaveBeenCalled()
    })

    test("multiple components can listen to different channels", () => {
        events.listenForNotifications(channel, method, notificationHandler1)
        events.listenForNotifications(otherChannel, method, notificationHandler2)
        events.notify(notification)
        events.notify({ channel: otherChannel, method })

        expect(notificationHandler1).toHaveBeenCalled()
        expect(notificationHandler2).toHaveBeenCalled()
    })

    test("method does not exist", async () => {
        events.listenForNotifications(channel, method, notificationHandler1)
        events.notify({ channel, method: otherMethod })

        expect(notificationHandler1).not.toHaveBeenCalled()
    })

    test("same channel different method", async () => {
        events.listenForNotifications(channel, method, notificationHandler1)
        events.listenForNotifications(channel, otherMethod, notificationHandler2)
        events.notify(notification)
        events.notify({ channel, method: otherMethod })

        expect(notificationHandler1).toHaveBeenCalled()
        expect(notificationHandler2).toHaveBeenCalled()
    })

    test("listen for all notifications", async () => {
        events.listenForNotifications(channel, method, notificationHandler1)
        events.listenForNotifications(channel, otherMethod, notificationHandler1)
        events.listenForAllNotifications(notificationHandler2)

        events.notify(notification)
        expect(notificationHandler2.mock.calls.length).toBe(1)

        events.notify({ channel, method: otherMethod })
        expect(notificationHandler2.mock.calls.length).toBe(2)
    })

    test("when a listener for all notifications is registered, no undefined-notification-error is thrown", async () => {
        events.listenForAllNotifications(notificationHandler1)
        events.notify(notification)
        expect(notificationHandler1.mock.calls.length).toBe(1)
    })
})

describe("requests and responds via the event bus", () => {
    test("components can listen on channels and methods for requests", async () => {
        events.listenForRequests(channel, method, requestHandler1)

        await events.request(request)

        expect(requestHandler1).toHaveBeenCalled()
    })

    test("requests are answered by responses", async () => {
        const response = { message: "this is a response" }
        events.listenForRequests(channel, method, request => Promise.resolve(response))

        let recieved = await events.request(request)
        expect(recieved).toBe(response)
    })

    test("requests can be rejected", async () => {
        const error = { message: "this is an error" }
        events.listenForRequests(channel, method, request => Promise.reject(error))

        await events.request(request).catch(recieved => {
            expect(recieved).toBe(error)
        })
    })

    test("registering the same method again results in the first handler to be overwritten", async () => {
        events.listenForRequests(channel, method, requestHandler1)
        events.listenForRequests(channel, method, requestHandler2)

        await events.request(request)

        expect(requestHandler1).not.toHaveBeenCalled()
        expect(requestHandler2).toHaveBeenCalled()
    })

    //TODO: is this behaviour desireable?
    test("different modules can listen on the same channel but different methods", async () => {
        events.listenForRequests(channel, method, requestHandler1)
        events.listenForRequests(channel, otherMethod, requestHandler2)

        await events.request(request)
        await events.request({ channel, method: otherMethod })

        expect(requestHandler1).toHaveBeenCalled()
        expect(requestHandler2).toHaveBeenCalled()
    })
})

describe("middleware", () => {
    test("middleware is subscribed to all channels", async () => {
        events.listenForRequests(channel, method, requestHandler1)
        events.addMiddleware(middleware)

        await events.request(request)

        expect(requestHandler1).toHaveBeenCalled()
        expect(middleware).toHaveBeenCalled()
    })

    test("middleware receives events on channels that are registered after itself", async () => {
        events.addMiddleware(middleware)
        events.listenForRequests(channel, method, requestHandler1)

        await events.request(request)

        expect(requestHandler1).toHaveBeenCalled()
        expect(middleware).toHaveBeenCalled()
    })

    test("middleware can reject requests and plugins don't recieve them", async () => {
        events.addMiddleware(rejectingMiddleware)
        events.listenForRequests(channel, method, requestHandler1)

        await events.request(request).catch(() => { })

        expect(requestHandler1).not.toHaveBeenCalled()
        expect(rejectingMiddleware).toHaveBeenCalled()
    })

    test("middleware can resolve requests and plugins don't recieve them", async () => {
        events.addMiddleware(resolvingMiddleware)
        events.listenForRequests(channel, method, requestHandler1)

        await events.request(request).catch(() => { })

        expect(requestHandler1).not.toHaveBeenCalled()
        expect(resolvingMiddleware).toHaveBeenCalled()
    })
})
