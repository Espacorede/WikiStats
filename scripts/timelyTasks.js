/** * (c) Espacorede Project * **/
const fs = require("fs");
const logger = require("./logger");
const populateData = require("./populateData");
const updateLists = require("./updateLists");
const updateUser = require("./updateUser");
const updateWiki = require("./updateWiki");
const wikis = require("../configs/wikis/wikis.json");

module.exports.updateLists = () => {
    wikis["enabled"].forEach(function (wiki) {
        logger.debug(`${wiki}: Updating lists.`);
        updateLists.updateLists(wiki);

        logger.debug(`${wiki}: Updating wiki data.`);
        updateWiki.updateWiki(wiki);
    });
};

module.exports.updateUsers = () => {
    logger.debug("Updating user data.");
    populateData.updateUsers();
};

module.exports.checkQueue = () => {
    logger.debug("Checking update queue.");

    if (!fs.existsSync("./data/userqueue.json")) {
        logger.info("Update queue not found; Creating userqueue.json.");

        fs.writeFileSync("./data/userqueue.json", JSON.stringify({ "users": [] }, null, 2));
    } else {
        let list = require("../data/userqueue.json");

        logger.debug(`Users in the update queue: ${list["users"].length}`);

        list["users"].forEach(user => {
            updateUser.getUserInfo(user["name"], true, user["wiki"]);
        });
    }
};

let WSConfig = require("../configs/wikistats-config.json");
let port = process.env.PORT || WSConfig["port"];
let socket = require("socket.io-client")(`http://localhost:${port}`);

module.exports.processBots = () => {
    wikis["enabled"].forEach(function (wiki) {
        require(`../data/lists/${wiki}-bots.json`)["users"].forEach(bot => {
            socket.emit("load", bot);
        });
    });
};