import { table, t } from "./definitions"
import { TABLE_NAME, TABLE_ALIAS, MULTIPLE_TABLES } from "./symbols"
import { SelectStage, TableStage, JoinedStage, JoinedAfterOnStage } from "./stages"

const cars = table("cars", {
    make: t.string,
    model: t.string,
    numberManufactured: t.number,
})

const makers = table("makers", {
    name: t.string,
    yearsOld: t.number,
})

const y = makers.yearsOld

const x: SelectStage<{ makers: typeof makers; cars: typeof cars }> = ((5 as any) as TableStage<"cars", typeof cars, {}>)
    .innerJoin(makers)
    .on({})

const readyToSelect = (5 as any) as SelectStage<{ makers: typeof makers; cars: typeof cars; [MULTIPLE_TABLES]: true }>

const selected = readyToSelect.select(cars, makers).fetch()[0].cars

// .select(
//     {
//         tableAlias: "table1",
//         tableName: "table1",
//         columnName: "foo",
//         alias: "fooo",
//     } as const,
//     {
//         tableAlias: "table2",
//         tableName: "table2",
//         columnName: "baz",
//         alias: "abc",
//     } as const,
//     { [TABLE_NAME]: "table1", [TABLE_ALIAS]: "table1", foo: "", bar: "" } as const,
// )
// .fetch()[0]
const yyy = x.table1.bar
