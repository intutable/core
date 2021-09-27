import path from "path"
import { EventSystem } from "../src/events"
import { PluginHandle, loadPlugins } from "../src/plugins"

const DB_CHANNEL = "database"

const PLUGIN_PATH = path.join(__dirname, "../node_modules/@intutable/")
let events = new EventSystem()
let pluginHandle: PluginHandle

const MAX = { first_name: "Max", last_name: "Messer", age: 42 }
const MARIA = { first_name: "Maria", last_name: "Gabel", age: 23 }
const MARKUS = { first_name: "Markus", last_name: "Löffel", age: 23 }

beforeAll(async () => {
    pluginHandle = await loadPlugins(PLUGIN_PATH, events)
})

afterAll(async () => {
    await events.request(DB_CHANNEL, {
        method: "deleteTable",
        name: "students",
    })

    pluginHandle.closeAll()
})

describe("can manage tables", () => {
    test("can create table", async () => {
        await events.request(DB_CHANNEL, {
            method: "createTable",
            name: "students",
            schema: (table: any) => {
                table.increments("id")
                table.string("first_name")
                table.string("last_name")
                table.integer("age")
            },
        })

        const tables = await events.request(DB_CHANNEL, { method: "listTables" })
        expect(tables).toContain("students")
    })

    test("can delete table", async () => {
        await events.request(DB_CHANNEL, {
            method: "deleteTable",
            name: "students",
        })

        const tables = await events.request(DB_CHANNEL, { method: "listTables" })
        expect(tables).not.toContain("students")
    })
})

describe("can insert data", () => {
    beforeEach(async () => {
        await clearStudentTable()
    })

    test("can insert data a single row", async () => {
        const insertedRows = await events.request(DB_CHANNEL, {
            method: "insert",
            table: "students",
            values: { first_name: "Max", last_name: "Muster", age: 42 },
        })

        expect(insertedRows).toEqual([1])
    })

    test("can insert data a multiple rows", async () => {
        const insertedRows = await events.request(DB_CHANNEL, {
            method: "insert",
            table: "students",
            values: [
                { first_name: "Max", last_name: "Messer", age: 42 },
                { first_name: "Maria", last_name: "Gabel", age: 23 },
                { first_name: "Markus", last_name: "Löffel", age: 23 },
            ],
        })

        expect(insertedRows).toEqual([3])
    })
})

describe("can select data", () => {
    beforeAll(async () => {
        await clearStudentTable()
        await events.request(DB_CHANNEL, {
            method: "insert",
            table: "students",
            values: [MAX, MARIA, MARKUS],
        })
    })

    test("can select everything from table", async () => {
        const result: any = await events.request(DB_CHANNEL, {
            method: "select",
            table: "students",
        })

        expect(result.map(({ id, ...row }: { id: any }) => row)).toEqual([MAX, MARIA, MARKUS])
    })

    test("can select some columns with optional select", async () => {
        const result: any = await events.request(DB_CHANNEL, {
            method: "select",
            table: "students",
            select: ["first_name", "age"],
        })

        const expected = [MAX, MARIA, MARKUS].map(({ age, first_name, ...student }) => ({
            age,
            first_name,
        }))

        expect(result).toEqual(expected)
    })

    test("can select a single row by id with optional where", async () => {
        const result = await events.request(DB_CHANNEL, {
            method: "select",
            table: "students",
            where: { id: 1 },
        })

        expect(result).toEqual([{ ...MAX, id: 1 }])
    })

    test("can select multiple rows by attribute with optional where", async () => {
        const result = await events.request(DB_CHANNEL, {
            method: "select",
            table: "students",
            where: { age: 23 },
        })

        expect(result).toEqual([
            { ...MARIA, id: 2 },
            { ...MARKUS, id: 3 },
        ])
    })
})

describe("can update data", () => {
    beforeAll(async () => {
        await clearStudentTable()
        await events.request(DB_CHANNEL, {
            method: "insert",
            table: "students",
            values: [MAX, MARIA, MARKUS],
        })
    })

    test("can update by id", async () => {
        await events.request(DB_CHANNEL, {
            table: "students",
            method: "update",
            where: { id: 1 },
            update: { first_name: "first" },
        })

        const response = await events.request(DB_CHANNEL, {
            table: "students",
            method: "select",
            select: ["first_name"],
            where: { id: 1 },
        })

        expect(response).toEqual([{ first_name: "first" }])
    })

    test("can update by attribute", async () => {
        await events.request(DB_CHANNEL, {
            table: "students",
            method: "update",
            where: { age: 23 },
            update: { first_name: "young" },
        })

        const response = await events.request(DB_CHANNEL, {
            table: "students",
            method: "select",
            select: ["first_name"],
            where: { age: 23 },
        })

        expect(response).toEqual([{ first_name: "young" }, { first_name: "young" }])
    })
})

describe("can delete data", () => {
    beforeAll(async () => {
        await clearStudentTable()
        await events.request(DB_CHANNEL, {
            method: "insert",
            table: "students",
            values: [MAX, MARIA, MARKUS],
        })
    })

    test("can delete by id", async () => {
        await events.request(DB_CHANNEL, {
            table: "students",
            method: "delete",
            where: { id: 1 },
        })

        const response = await events.request(DB_CHANNEL, {
            table: "students",
            method: "select",
            select: [],
            where: { id: 1 },
        })

        expect(response).toEqual([])
    })

    test("can delete by attribute", async () => {
        await events.request(DB_CHANNEL, {
            table: "students",
            method: "delete",
            where: { age: 23 },
        })

        const response = await events.request(DB_CHANNEL, {
            table: "students",
            method: "select",
            select: [],
            where: { age: 23 },
        })

        expect(response).toEqual([])
    })
})

async function clearStudentTable() {
    await events.request(DB_CHANNEL, {
        method: "deleteTable",
        name: "students",
    })

    await events.request(DB_CHANNEL, {
        method: "createTable",
        name: "students",
        schema: (table: any) => {
            table.increments("id")
            table.string("first_name")
            table.string("last_name")
            table.integer("age")
        },
    })
}
