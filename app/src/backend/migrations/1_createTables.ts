import { sql } from "./sqltypes"

const up = sql`
use yamplayer;

create table track (
    trackId bigint primary key auto_increment,
    albumId integer not null references albums (albumId),
    artistId integer not null references artists (artistId),
    title varchar(255) not null,
    isrc char(12),
    durationSecs double precision not null
);

create table album (
    albumId bigint primary key auto_increment,
    title varchar(255) not null,
    coverImageUrl varchar(2000),
    releaseDate varchar(10)
);

create table artist (
    artistId bigint primary key auto_increment,
    name varchar(255) not null,
    imageUrl varchar(2000)
);

create table playlist (
    playlistId bigint primary key auto_increment,
    name varchar(255) not null
);

create table playlistTrack (
    playlistEntryId bigint primary key auto_increment,
    playlistId integer not null references playlists (playlistId),
    trackId integer not null references tracks (trackId)
);
`

const down = sql`
use yamplayer;
drop table if exists track, album, artist, playlist, playlistTrack;
`
