We define each schema/migration once and try to make this work for both sqlite and mysql.

## IDs

For 8-byte autoincrementing primary keys we need special treatment for each database:

- sqlite: integer primary key not null
- mysql: bigint primary key auto_increment

In other cases we can use a single data type compatibly across mysql and sqlite:

## numeric

- integer, max 4 bytes
- bigint, max 8 bytes
- double precision
- boolean

## dates and times

- varchar(10), for dates or partial dates (2020, 2020-01, 2020-01-01)
- integer, for timestamps (seconds since unix epoch)
- double precision, for durations in seconds

## text

- varchar(15) for service ids
- varchar(50) for external entity ids
- varchar(255), for titles and names
- varchar(2000), for URLs
- char(N), for fixed strings

## TODO

- think about collation settings
