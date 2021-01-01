# Wiki Stats

A website for viewing data about wiki editors.

## About

Wiki Stats is based on the original Wiki-Fi made by Moussekateer, but unlike its spiritual predecessor, it currently only tracks data about users.

This was initially created to mainly support the [Official Team Fortress Wiki](https://wiki.tf) and only later in development it was eventually hastily patched to support more wikis.

Make sure you have [Node.js](https://nodejs.org) and [npm](https://www.npmjs.com/get-npm) installed and 
[MongoDB](https://www.mongodb.com/) database at your disposal.

### Running

1. Edit and generate the configuration files
    - Open ```configs/wikistats-config.json``` and edit it with your settings.
    - Run ```npm run add-wiki``` to generate the wiki files.
    - Run ```npm run generate-css``` to generate the CSS.
    - Additionally, any logos and/or favicons should reside on ```public/images/wikis```
        - favicon-$alias.ico for the favicon
        - logo-$alias.png for the logo

2. Run!
    - Run ```npm start``` to start running Wiki Stats.