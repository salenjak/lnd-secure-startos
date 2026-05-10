FROM lightninglabs/lnd:v0.20.1-beta
RUN apk add --no-cache inotify-tools jq rclone mutt bind-tools