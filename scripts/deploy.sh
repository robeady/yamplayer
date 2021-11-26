#!/usr/bin/env bash
set -euo pipefail

function fileman_op {
    # destination is relative to parent directory of source
    curl -s -H "Authorization: cpanel $USER:$TOKEN" \
    "$HOST:2083/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop&op=$1&sourcefiles=$2${3:+&destfiles=$3}" \
    | ( ! jq -e ".cpanelresult.error" )
}

function fileman_upload {
    curl -s -H "Authorization: cpanel $USER:$TOKEN" \
    "$HOST:2083/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=uploadfiles" -F "file-=@$1" -F "dir=$2" \
    | ( ! jq -e ".cpanelresult.error" )
}

DATE=$(date -u +%FT%TZ)

echo "> reinstalling non-dev dependencies"
mv node_modules node_modules_dev
yarn install --frozen-lockfile --prod

echo "> zipping backend code and dependencies"
zip -qr "$DATE.zip" dist node_modules -x "dist/frontend/*"

echo "> uploading zip file"
fileman_upload "$DATE.zip" yamplayer2

echo "> extracting zip file to new directory"
fileman_op extract "yamplayer2/$DATE.zip" "live-$DATE"
fileman_op unlink "yamplayer2/$DATE.zip"

echo "> replacing old app directory with new directory"
fileman_op move "yamplayer2/live-$DATE" live

echo "> restarting app"
touch "restart_$DATE.txt"
# upload cannot overwrite files
fileman_upload "restart_$DATE.txt" yamplayer2/tmp
fileman_op move "yamplayer2/tmp/restart_$DATE.txt" restart.txt
