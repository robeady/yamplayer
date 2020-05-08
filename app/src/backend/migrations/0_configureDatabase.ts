import { sql } from "./sqltypes"

const up = sql`
alter database yamplayer
    character set = 'utf8mb4'
    collate = 'utf8mb4_unicode_520_ci';
`
