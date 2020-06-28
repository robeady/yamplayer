import { table, t, TableDefinition, ColumnDefinition, SqlType } from "./definitions"
import { TableStage, ReferencesIn, ProjectTypesIn, RecSelection, SelectionFrom, RowTypeFrom } from "./stages"

const makers = table("makers", {
    id: t.string,
    name: t.string,
    yearsOld: t.number,
})

const a = table("a", {
    id: t.string.whichReferences(makers.id),
}) // :( not specific about the reference

const cars = table("cars", {
    make: t.string,
    model: t.string,
    numberManufactured: t.number,
    yearsOld: t.number,
    makerId: t.string.whichReferences(makers.id),
})

type CarRefs = ReferencesIn<{ cars: typeof cars }>

const trucks = table("trucks", {
    wheels: t.number,
})

function foo2<
    T extends TableDefinition<
        string,
        string,
        {
            [ColumnName in string]: ColumnDefinition<string, SqlType, string, ColumnName>
        }
    >
>(table: T) {
    return (undefined as any) as TableStage<T>
}

const u = foo2(makers).join(cars)

const unjoined = foo2(cars)

const joined = unjoined.join(makers)
const joinedAgain = joined.join(makers)
const fetched = joinedAgain.where(cars.numberManufactured, "==", 42).select({ makers: { id2: makers.id } })

const x = foo2(cars).join(trucks)

const rows = foo2(makers)
    .where(makers.name, "==", "abc")
    .or(makers.yearsOld, "==", 3)
    .orderBy(makers.name)
    .thenBy(makers.yearsOld)
    .limit(2)
    .offset(2)
    .fetch()
const first: string = rows[0].name

const rowsWithSelect = foo2(makers)
    .where(makers.name, "==", "abc")
    .or(makers.yearsOld, "==", 3)
    .select(makers)
    .orderBy(makers.name)
    .thenBy(makers.yearsOld)
    .limit(2)
    .offset(2)
    .fetch()
const firstWithSelect: string = rowsWithSelect[0].name

declare function selectytest<Selectiona extends SelectionFrom<{ makers: typeof makers; cars: typeof cars }>>(
    _: Selectiona,
): RowTypeFrom<Selectiona>

const _y: number = selectytest({ makers, a: { b: { c: { cars } } } }).a.b.c.cars.yearsOld

const _z = foo2(makers).select({ y: makers.yearsOld }).orderBy("y").asTable("b").y.sqlType
