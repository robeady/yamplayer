import { table, t } from "./definitions"
import { TABLE_NAME, TABLE_ALIAS, MULTIPLE_TABLES, TYPE, EntityTypes } from "./symbols"
import { SelectStage, TableStage, JoinedStage, JoinedAfterOnStage } from "./stages"
import { ColumnIn, ColIn2 } from "./selectionTypes"

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

function foo(x: ColumnIn<{ cars: typeof cars; makers: typeof makers }>) {
    //
}

function bar(x: ColIn2<{ cars: typeof cars; makers: typeof makers }>) {
    //
}

const something = foo({
    [TYPE]: EntityTypes.COLUMN,
    tableName: "cars",
    tableAlias: "cars",
    columnName: "make",
    columnType: t.string,
})
const something2 = bar()

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
