#!/bin/sh
set -e

echo "Waiting for dependencies..."
sleep 3

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
fi

echo "Starting application..."
exec node dist/main.js
