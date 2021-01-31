import { DatabaseMigration } from "./migrations"
import { sql } from "./sqltypes"

const migration0: DatabaseMigration = {
    sqlForwards: sql`
    USE yamplayer;

    DROP TABLE IF EXISTS track, album, artist, playlist, playlistEntry;

    ALTER DATABASE yamplayer
        CHARACTER SET = 'utf8mb4'
        COLLATE = 'utf8mb4_unicode_520_ci';

    CREATE TABLE track (
        id BINARY(16) PRIMARY KEY,
        externalId VARCHAR(50) NOT NULL,
        albumId BINARY(16) NOT NULL REFERENCES album (id),
        artistId BINARY(16) NOT NULL REFERENCES artist (id),
        title VARCHAR(255) NOT NULL,
        trackNumber INTEGER NOT NULL,
        discNumber INTEGER NOT NULL,
        isrc CHAR(12),
        durationSecs DOUBLE PRECISION NOT NULL,
        savedTimestamp BIGINT NOT NULL,
        playCount INTEGER NOT NULL,
        rating DOUBLE PRECISION
    );

    CREATE TABLE album (
        id BINARY(16) PRIMARY KEY,
        externalId VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        coverImageUrl VARCHAR(2000),
        releaseDate VARCHAR(10)
    );

    CREATE TABLE artist (
        id BINARY(16) PRIMARY KEY,
        externalId VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        imageUrl VARCHAR(2000)
    );

    CREATE TABLE playlist (
        playlistId BINARY(16) PRIMARY KEY,
        name VARCHAR(255) NOT NULL
    );

    CREATE TABLE playlistEntry (
        playlistId BINARY(16) NOT NULL REFERENCES playlist (playlistId),
        trackId BINARY(16) NOT NULL REFERENCES track (id)
    );
    `,

    sqlBackwards: sql`
    DROP TABLE IF EXISTS track, album, artist, playlist, playlistEntry;
    `,
}

export const yamplayerMigrations = [migration0]
