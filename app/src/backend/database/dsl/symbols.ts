export const TABLE_NAME = Symbol()
export const TABLE_ALIAS = Symbol()
export const COLUMNS = Symbol()
export const MULTIPLE_TABLES = Symbol()
export const TYPE = Symbol()

export enum EntityTypes {
    TABLE,
    COLUMN,
    ALIASED_COLUMN,
}

export interface Entity<Type extends EntityTypes> {
    [TYPE]: Type
}
