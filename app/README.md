# Electron typescript app

## Structure

The src directory is split into backend, and frontend which depends on backend.
We rely on tree shaking to elimate unneeded backend dependencies from the frontend bundle.

All the code is part of one typescript project for convenience.
Tree shaking and the use of ts-node-dev for the backend avoids any unnecessary reloading when only one module is changed.

## Run application

`npm run develop`

This starts 3 things concurrently:

1. backend, using ts-node-dev for automatic reloading
2. electron app, with hot-reloading enabled, which pulls from:
3. electron server, which compiles the bundle in hot-reload mode, using babel and forking typescript compilation into a separate processs

Press ctrl-c to exit and it should cleanup all the subprocesses.

## Run tests

`npm run test` or `npm run test:watch`
