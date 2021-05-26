docker run -d ^
    --name yamplayerdb ^
    -v yamplayerdb:/var/lib/mysql ^
    -e MYSQL_ROOT_PASSWORD=hunter2 ^
    -e MYSQL_DATABASE=yamplayer ^
    -e MYSQL_USER=yamplayer_user ^
    -e MYSQL_PASSWORD=hunter2 ^
    -p 3306:3306 ^
    mariadb:10.2.31
