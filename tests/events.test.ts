import { EventSystem } from "../src/events"
import { MiddlewareResponseType } from "../src/middleware"

let events: EventSystem
let callback1: jest.Mock
let callback2: jest.Mock

let promiseCallback1: jest.Mock
let promiseCallback2: jest.Mock
let middleWare: jest.Mock
let rejectingMiddleWare: jest.Mock
let resolvingMiddleware: jest.Mock

const channel = "channel"
const otherChannel = "otherChannel"

beforeEach(async () => {
    //needs to be reset every time
    // don't use any of the reset functions for this
    // it does not work https://github.com/facebook/jest/issues/7136
    callback1 = jest.fn(() => {})
    callback2 = jest.fn(() => {})

    promiseCallback1 = jest.fn((request, resolve, reject) => resolve({}))
    promiseCallback2 = jest.fn((request, resolve, reject) => resolve({}))

    middleWare = jest.fn((channel, request) =>
        Promise.resolve({ type: MiddlewareResponseType.Pass, payload: request })
    )
    rejectingMiddleWare = jest.fn((channel, request) => ({
        type: MiddlewareResponseType.Reject,
        payload: {},
    }))

    resolvingMiddleware = jest.fn((channel, request) => ({
        type: MiddlewareResponseType.Resolve,
        payload: {},
    }))

    events = new EventSystem() // set before each to not avoid state from previous tests
})

describe("notifying via the event bus", () => {
    test("subscribers are notified about events", () => {
        events.listenForNotification(channel, callback1)
        events.notify(channel, {})

        expect(callback1.mock.calls.length).toBe(1)
    })

    test("the callback function is only called when the event is triggered", () => {
        events.listenForNotification(channel, callback1)

        expect(callback1.mock.calls.length).toBe(0)
    })

    test("subscribers are notified about mutliple events", () => {
        events.listenForNotification(channel, callback1)

        events.notify(channel, {})
        events.notify(channel, {})

        expect(callback1.mock.calls.length).toBe(2)
    })

    test("multiple components can listen to the same channel", () => {
        events.listenForNotification(channel, callback1)

        events.listenForNotification(channel, callback2)

        events.notify(channel, {})

        expect(callback1.mock.calls.length).toBe(1)
        expect(callback2.mock.calls.length).toBe(1)
    })

    test("multiple components can listen to different channels", () => {
        events.listenForNotification(channel, callback1)
        events.listenForNotification(otherChannel, callback2)

        events.notify(channel, {})
        events.notify(otherChannel, {})

        expect(callback1.mock.calls.length).toBe(1)
        expect(callback2.mock.calls.length).toBe(1)
    })
})

describe("requests and responds via the event bus", () => {
    test("components can listen on channels for requests", async () => {
        events.listenForRequest(channel, promiseCallback1)

        await events.request(channel, {})

        expect(promiseCallback1.mock.calls.length).toBe(1)
    })

    test("requests are answered by responses", async () => {
        const response = { message: "this is a response" }
        events.listenForRequest(channel, (request, resolve, reject) => {
            resolve(response)
        })

        let recieved = await events.request(channel, {
            message: "this is a request",
        })
        expect(recieved).toBe(response)
    })

    test("requests can be rejected", async () => {
        const error = { message: "this is an error" }
        events.listenForRequest(channel, (request, resolve, reject) => {
            reject(error)
        })

        await events.request(channel, { message: "this is a request" }).catch(recieved => {
            expect(recieved).toBe(error)
        })
    })

    test("only one component can listen for request on a channel", async () => {
        events.listenForRequest(channel, promiseCallback1)
        events.listenForRequest(channel, promiseCallback2)

        await events.request(channel, {})

        expect(promiseCallback1.mock.calls.length).toBe(1)
        expect(promiseCallback2.mock.calls.length).toBe(0)
    })
})

describe("middleware", () => {
    test("middleware is subscribed to all channels", async () => {
        events.listenForRequest(channel, promiseCallback1)
        events.addMiddleware(middleWare)

        await events.request(channel, {})

        expect(promiseCallback1.mock.calls.length).toBe(1)
        expect(middleWare.mock.calls.length).toBe(1)
    })

    test("middleware receives events on channels that are registered after itself", async () => {
        events.addMiddleware(middleWare)
        events.listenForRequest(channel, promiseCallback1)

        await events.request(channel, {})

        expect(promiseCallback1.mock.calls.length).toBe(1)
        expect(middleWare.mock.calls.length).toBe(1)
    })

    test("middleware can reject requests and plugins don't recieve them", async () => {
        events.addMiddleware(rejectingMiddleWare)
        events.listenForRequest(channel, promiseCallback1)

        await events.request(channel, {}).catch(() => {})

        expect(promiseCallback1.mock.calls.length).toBe(0)
        expect(rejectingMiddleWare.mock.calls.length).toBe(1)
    })

    test("middleware can resolve requests and plugins don't recieve them", async () => {
        events.addMiddleware(resolvingMiddleware)
        events.listenForRequest(channel, promiseCallback1)

        await events.request(channel, {}).catch(() => {})

        expect(promiseCallback1.mock.calls.length).toBe(0)
        expect(resolvingMiddleware.mock.calls.length).toBe(1)
    })
})
