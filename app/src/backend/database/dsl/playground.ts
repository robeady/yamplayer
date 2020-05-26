import { table, t, TableDefinition, ColumnDefinition, SqlType } from "./definitions"
import { TableStage } from "./stages"

const cars = table("cars", {
    make: t.string,
    model: t.string,
    numberManufactured: t.number,
    yearsOld: t.number,
})

const makers = table("makers", {
    name: t.string,
    yearsOld: t.number,
})

function foo<Name extends string, Columns extends Record<string, ColumnDefinition<Name, SqlType, Name, string>>>(
    table: TableDefinition<Name, Name, Columns>,
) {
    return (undefined as any) as TableStage<Name, TableDefinition<Name, Name, Columns>, {}>
}

function foo2<
    Name extends string,
    T extends TableDefinition<Name, Name, Record<string, ColumnDefinition<Name, SqlType, Name, string>>>
>(table: T) {
    return (undefined as any) as TableStage<Name, T, {}>
}

const unjoined = foo2(makers)
const joined = unjoined
    .innerJoin(cars)
    .on(cars.model, "==", "a")
    //.and(cars.yearsOld, "==", "b")
    .where(cars.numberManufactured, "==", 42)
    .fetch()[0]

const rows = foo(makers)
    .where(makers.name, "==", "abc")
    .or(makers.yearsOld, "==", 3)
    .orderBy(makers.name)
    .thenBy(makers.yearsOld)
    .limit(2)
    .offset(2)
    .fetch()
const first: string = rows[0].name

const rowsWithSelect = foo(makers)
    .where(makers.name, "==", "abc")
    .or(makers.yearsOld, "==", 3)
    .select(makers)
    .orderBy(makers.name)
    .thenBy(makers.yearsOld)
    .limit(2)
    .offset(2)
    .fetch()
const firstWithSelect: string = rowsWithSelect[0].name
