import { table, t } from "./definitions"
import { TABLE_NAME, TABLE_ALIAS } from "./symbols"

const cars = table("cars", {
    make: t.string,
    model: t.string,
    numberManufactured: t.number,
})

const makers = table("makers", {
    name: t.string,
    yearsOld: t.number,
})

const x = ((5 as any) as Selectable<{
    table1: { [TABLE_NAME]: string; [TABLE_ALIAS]: "table1"; foo: string; bar: string }
    table2: { [TABLE_NAME]: string; [TABLE_ALIAS]: "table2"; baz: number }
}>)
    .select(
        {
            tableAlias: "table1",
            tableName: "table1",
            columnName: "foo",
            alias: "fooo",
        } as const,
        {
            tableAlias: "table2",
            tableName: "table2",
            columnName: "baz",
            alias: "abc",
        } as const,
        { [TABLE_NAME]: "table1", [TABLE_ALIAS]: "table1", foo: "", bar: "" } as const,
    )
    .fetch()[0]
const yyy = x.table1.bar
