/** ** (c) Espacorede Project ** **/

const logger = require("./logger");
const populateData = require("./populateData");
const updateLists = require("./updateLists");
const updateUser = require("./updateUser");
const updateWiki = require("./updateWiki");
const updateMonthly = require("./updateMonthlyStats");
const wikis = require("../configs/wikis/wikis.json");

const WSConfig = require("../configs/wikistats-config.json");
const port = process.env.PORT || WSConfig.port;
const socket = require("socket.io-client")(`http://localhost:${port}`);

module.exports.updateMonthly = () => {
    let month = new Date().getUTCMonth();

    let year = new Date().getUTCFullYear();

    if (month === 0) {
        month = 12;
        year -= 1;
    }

    wikis.enabled.forEach(function (wiki) {
        logger.debug(`${wiki}: Updating monthly contributions`);
        updateMonthly.updateMonthly(year, month, wiki);
    });
};

module.exports.updateLists = () => {
    wikis.enabled.forEach(function (wiki) {
        logger.debug(`${wiki}: Updating lists.`);
        updateLists.updateLists(wiki);

        logger.debug(`${wiki}: Updating wiki data.`);
        updateWiki.updateWiki(wiki);
    });
};

module.exports.updateListUsers = () => {
    logger.debug("Updating list user data.");
    populateData.updateListUsers();
};

// module.exports.updateDbUsers = () => {
//    logger.debug("Updating db user data.");
//    populateData.updateDbUsers();
// };

module.exports.checkQueue = () => {
    logger.debug("Checking update queue.");

    const list = require("../data/userqueue.json");

    logger.debug(`Users in the update queue: ${list.users.length}`);

    list.users.forEach(user => {
        updateUser.getUserInfo(user.name, 0, user.wiki);
    });
};

module.exports.processBots = () => {
    wikis.enabled.forEach(function (wiki) {
        require(`../data/lists/${wiki}-bots.json`).users.forEach(bot => {
            socket.emit("load", bot);
        });
    });
};
