import { DatabaseMigration } from "./migrations"
import { sql } from "./sqltypes"

const migration0: DatabaseMigration = {
    sqlForwards: sql`
    DROP TABLE IF EXISTS track, album, artist, playlist, playlistEntry;

    CREATE TABLE track (
        id BINARY(16) PRIMARY KEY,
        externalId VARCHAR(50) NOT NULL,
        albumId BINARY(16) NOT NULL REFERENCES album (id),
        title VARCHAR(255) NOT NULL,
        trackNumber SMALLINT NOT NULL,
        discNumber TINYINT NOT NULL,
        isrc CHAR(12),
        durationSecs FLOAT NOT NULL,
        savedTimestamp BIGINT NOT NULL,
        playCount INTEGER NOT NULL,
        rating FLOAT
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE trackArtist (
        trackId BINARY(16) NOT NULL REFERENCES track (id),
        artistId BINARY(16) NOT NULL REFERENCES artist (id),
        priority TINYINT NOT NULL -- 0 is the primary artist on a track
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE album (
        id BINARY(16) PRIMARY KEY,
        artistId BINARY(16) NOT NULL REFERENCES artist(id),
        externalId VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        coverImageUrl VARCHAR(2000),
        releaseDate VARCHAR(10),
        numTracks SMALLINT
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE artist (
        id BINARY(16) PRIMARY KEY,
        externalId VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        imageUrl VARCHAR(2000)
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE playlist (
        id BINARY(16) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE playlistEntry (
        playlistId BINARY(16) NOT NULL REFERENCES playlist (id),
        trackId BINARY(16) NOT NULL REFERENCES track (id)
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;
    `,

    sqlBackwards: sql`
    DROP TABLE IF EXISTS track, trackArtist, album, artist, playlist, playlistEntry;
    `,
}

const migration1: DatabaseMigration = {
    sqlForwards: sql`
    CREATE TABLE trackReference (
        trackId BINARY(16) NOT NULL REFERENCES track (id),
        externalService VARCHAR(20) NOT NULL,
        externalId VARCHAR(50) NOT NULL
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE albumReference (
        albumId BINARY(16) NOT NULL REFERENCES album (id),
        externalService VARCHAR(20) NOT NULL,
        externalId VARCHAR(50) NOT NULL
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    CREATE TABLE artistReference (
        artistId BINARY(16) NOT NULL REFERENCES artist (id),
        externalService VARCHAR(20) NOT NULL,
        externalId VARCHAR(50) NOT NULL
    ) DEFAULT
        CHARSET=utf8mb4
        COLLATE=utf8mb4_unicode_520_ci;

    INSERT INTO trackReference SELECT id, SUBSTRING_INDEX(externalId, ':', 1), SUBSTRING_INDEX(externalId, ':', -1) FROM track;
    INSERT INTO albumReference SELECT id, SUBSTRING_INDEX(externalId, ':', 1), SUBSTRING_INDEX(externalId, ':', -1) FROM album;
    INSERT INTO artistReference SELECT id, SUBSTRING_INDEX(externalId, ':', 1), SUBSTRING_INDEX(externalId, ':', -1) FROM artist;

    ALTER TABLE track DROP COLUMN externalId;
    ALTER TABLE album DROP COLUMN externalId;
    ALTER TABLE artist DROP COLUMN externalId;
    `,
    sqlBackwards: sql``,
}

export const yamplayerMigrations = [migration0, migration1]
