import { sql } from "./sqltypes"
import { DatabaseMigration } from "./migrations"

const migration0: DatabaseMigration = {
    sqlForwards: sql`
    use yamplayer;

    drop table if exists track, album, artist, playlist, playlistEntry;

    alter database yamplayer
        character set = 'utf8mb4'
        collate = 'utf8mb4_unicode_520_ci';

    create table track (
        trackId bigint primary key auto_increment,
        externalId varchar(50) not null,
        albumId bigint not null references album (albumId),
        artistId bigint not null references artist (artistId),
        title varchar(255) not null,
        trackNumber integer not null,
        discNumber integer not null,
        isrc char(12),
        durationSecs double precision not null,
        savedTimestamp bigint not null,
        rating double precision,
        cataloguedTimestamp bigint not null
    );

    create table album (
        albumId bigint primary key auto_increment,
        cataloguedTimestamp bigint not null,
        externalId varchar(50) not null,
        title varchar(255) not null,
        coverImageUrl varchar(2000),
        coverImageId varchar(100),
        releaseDate varchar(10)
    );

    create table artist (
        artistId bigint primary key auto_increment,
        cataloguedTimestamp bigint not null,
        externalId varchar(50) not null,
        name varchar(255) not null,
        imageUrl varchar(2000)
    );

    create table playlist (
        playlistId bigint primary key auto_increment,
        name varchar(255) not null
    );

    create table playlistEntry (
        playlistEntryId bigint primary key auto_increment,
        playlistId bigint not null references playlist (playlistId),
        trackId bigint not null references track (trackId)
    );
    `,

    sqlBackwards: sql`
    drop table if exists track, album, artist, playlist, playlistEntry;
    `,
}

export const yamplayerMigrations = [migration0]
