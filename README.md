<h1 align="center">Wiki Stats</h1>

## About

Wiki Stats is based on the original [Wiki-Fi](https://web.archive.org/web/20160802192949/http://stats.wiki.tf/).

It currently only supports the [Official Team Fortress Wiki](https://wiki.tf); the [Dota 2 Wiki](https://dota2.gamepedia.com) and its brazilian offshoot; and the [Portal Wiki](https://theportalwiki.com) but may support other wikis at some point in the future.

## Running

Wiki Stats is built using [Node.js](https://nodejs.org/en/). 

Due to a limitation in the worker-nodes library, Wiki Stats currently only runs on Linux. To run it on Windows, [install WSL with your Linux distribution of choice](https://docs.microsoft.com/en-us/windows/wsl/install-win10) (if you don't have one, it's probably Debian), make sure you [install Node on this subsystem](https://nodejs.org/en/download/package-manager/), and run node/NPM through bash in the Windows command line.