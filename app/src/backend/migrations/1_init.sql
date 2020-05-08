create table track (
    trackId integer primary key not null,
    albumId integer not null references albums (albumId),
    artistId integer not null references artists (artistId),
    title varchar(255) not null,
    isrc char(12),
    durationSecs double precision not null
);

CREATE TABLE album (
    albumId integer primary key not null,
    title varchar(255) not null,
    coverImageUrl varchar(2000),
    releaseDate varchar(10)
);

CREATE TABLE artist (
    artistId integer primary key not null,
    name varchar(255) not null,
    imageUrl varchar(2000)
);

CREATE TABLE playlist (
    playlistId integer primary key not null,
    name varchar(255) not null
);

CREATE TABLE playlistTrack (
    entryId integer primary key not null,
    playlistId integer not null references playlists (playlistId),
    trackId integer not null references tracks (trackId)
);

