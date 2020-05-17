import { sql } from "./sqltypes"

export default sql`
use yamplayer;

drop table if exists track, album, artist, playlist, playlistTrack;

alter database yamplayer
    character set = 'utf8mb4'
    collate = 'utf8mb4_unicode_520_ci';

create table track (
    trackId bigint primary key auto_increment,
    albumId integer not null references album (albumId),
    artistId integer not null references artist (artistId),
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

create table playlistEntry (
    playlistEntryId bigint primary key auto_increment,
    playlistId integer not null references playlist (playlistId),
    trackId integer not null references track (trackId)
);

create table externalTrack (
    trackId integer not null references track (trackId),
    serviceId varchar(15) not null,
    externalId varchar(50) not null
);

create table externalAlbum (
    albumId integer not null references album (albumId),
    serviceId varchar(15) not null,
    externalId varchar(50) not null
);

create table externalArtist (
    artistId integer not null references artist (artistId),
    serviceId varchar(15) not null,
    externalId varchar(50) not null
);
`
