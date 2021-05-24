# Yamplayer

A music player written in Typescript.


## Architecture

Yamplayer consists of:

1. a React frontend
2. a Node backend, which manages integration with streaming services and stores the music library in MariaDB.

The intention is to provide flexibility around where the backend functionality runs depending on the environment.

For example, when installed locally on a desktop, the frontend and most of the backend can run inside an electron app, making remote calls only to access the music library. Or the library could also run locally using SQLite for storage.

Alternatively, the frontend could be run in a web browser with the entire backend hosted remotely, in an install-less or mobile use case.


## Design

See https://www.figma.com/file/UL3IcZhYuqSxL31gvCydxl/Yamplayer-app


## Development

### Prerequisites

1. Docker to run MariaDB, or MariaDB itself
2. Node 14
3. Yarn

### Installation

1. Clone the repo with its submodules: `git clone --recurse-submodules https://github.com/robeady/yamplayer.git`  
2. Change to the app directory: `cd app`
3. Install dependencies: `yarn install --frozen-lockfile`
4. Create a database: `create_db.cmd` will use the mariadb docker image to do this.

### Running locally

1. Ensure docker is running
2. Start the database: `docker start yamplayerdb`
3. `yarn start`

    This starts 3 things concurrently:

    1. The backend, using ts-node-dev for automatic reloading
    2. An electron app, which pulls from:
    3. A webpack server, which compiles the frontend bundle in hot-reload mode. Typescript compilation occurs in the background.

    Press ctrl-c or close the electron window to exit and it should clean up all the processes.

### Running tests

`yarn test`

add `--silent` to supress stdout, `--verbose` to see a detailed breakdown of every test, `--watch` for interactive mode.

### Project structure

The codebase is a single typescript module. We intend to rely on webpack tree shaking to eliminate unnecessary dependencies from the frontend and backend. Running the backend with ts-node-dev avoids any unnecessary reloads.

### Git submodules

The following git config is recommended to make working with submodules easier (note that these changes apply only to this repo, not globally)

	git config diff.submodule log
	git config submodule.recurse true
	git config push.recurseSubmodules on-demand

you can also add

	git config status.submodulesummary 1

but this makes git status slow.

Otherwise, you need to remember to:

	git pull --recurse-submodules
	git push --recurse-submodules=on-demand