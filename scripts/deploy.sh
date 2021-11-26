#!/usr/bin/env bash
set -euo pipefail

function fileman_op {
    # destination is relative to parent directory of source
    curl -H "Authorization: cpanel $USER:$TOKEN" \
    "$HOST:2083/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=fileop&op=$1&sourcefiles=$2&destfiles=$3"
}

function fileman_upload {
    curl -H "Authorization: cpanel $USER:$TOKEN" \
    "$HOST:2083/json-api/cpanel?cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=uploadfiles" -F "file-=@$1" -F "dir=$2"
}

DATE=$(date --iso-8601 --utc)

echo "reinstall non-dev dependencies"
mv node_modules node_modules_dev
yarn install --frozen-lockfile --prod

echo "zip backend code and dependencies"
zip -qr "$DATE.zip" dist node_modules -x "dist/frontend/*"

echo "upload zip file"
fileman_upload "$DATE.zip" yamplayer2

echo "extract zip file to new directory"
fileman_op extract "yamplayer2/$DATE.zip" "$DATE"

echo "swap old directory for new directory"
fileman_op move yamplayer2/live "pre-$DATE"
fileman_op move "yamplayer2/$DATE" live

echo "restart app"
touch restart.txt
fileman_upload restart.txt yamplayer2/tmp

echo "TODO: delete old directory"
