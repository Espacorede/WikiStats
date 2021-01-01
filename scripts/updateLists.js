/** ** (c) Espacorede Project ** **/

const Bot = require("nodemw");
const db = require("./mongooseConnect");
const fs = require("fs");
const logger = require("./logger");
const tabletojson = require("tabletojson").Tabletojson;
const utils = require("./utils");

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

module.exports.updateLists = (currentWiki = "tf") => {
    const MWClient = new Bot(`./configs/wikis/${currentWiki}-config.json`);

    function getLists() {
        const botList = [];

        function updateTop100() {
            logger.verbose(`${currentWiki}: Updating list of editors by edit count (Top 100).`);

            tabletojson.convertUrl(
                "https://wiki.teamfortress.com/wiki/Team_Fortress_Wiki:Reports/Users_by_edit_count",
                (table) => {
                    const topList = [];

                    Object.keys(table[2]).forEach(user => {
                        const name = table[2][user].User;
                        const position = table[2][user]["#"];

                        if (position === "BOT") {
                            return;
                        }

                        const userObj = {
                            name: utils.returnCleanUsername(name),
                            position: position
                        };

                        topList.push(userObj);
                    });

                    fs.readFile(`./data/lists/${currentWiki}-top100.json`, (err, data) => {
                        if (err) {
                            logger.verbose(`${currentWiki}: Failed to read ${currentWiki}-top100.json (updateTop100): ${err}`);
                            return;
                        }

                        const json = JSON.parse(data);
                        json.users = topList;
                        json.updatedat = utils.formatDateLocaleDateString();

                        fs.writeFile(`./data/lists/${currentWiki}-top100.json`, JSON.stringify(json), (err) => {
                            if (err) {
                                logger.verbose(`${currentWiki}: Failed to save ${currentWiki}-top100.json (updateTop100): ${err}`);
                                return;
                            }

                            logger.verbose(`${currentWiki}: List of editors by edit count successfully updated!`);
                            updateCapes();
                        });
                    });
                });
        }

        function updateCapes() {
            logger.verbose(`${currentWiki}: Updating list of Wiki Cap owners.`);

            tabletojson.convertUrl(
                "https://wiki.teamfortress.com/wiki/List_of_Wiki_Cap_owners",
                (table) => {
                    const capes = [];

                    Object.keys(table[0]).forEach(cap => {
                        const user = table[0][cap].Recipient;
                        const date = table[0][cap]["Date awarded"].substring((/[a-z]/i).exec(table[0][cap]["Date awarded"]).index);
                        const timestamp = utils.formatDateTimestamp(date);
                        const steamid = table[0][cap].Backpack;
                        const number = cap;

                        const capObj = {
                            name: utils.returnCleanUsername(user),
                            number: number,
                            date: date,
                            timestamp: timestamp,
                            steamid: steamid
                        };

                        capes.push(capObj);
                    });

                    fs.readFile(`./data/lists/${currentWiki}-wikicap.json`, (err, data) => {
                        if (err) {
                            logger.verbose(`${currentWiki}: Failed to read ${currentWiki}-wikicap.json (updateCapes): ${err}`);
                            return;
                        }

                        const json = JSON.parse(data);
                        json.users = capes;
                        json.updatedat = utils.formatDateLocaleDateString();

                        fs.writeFile(`./data/lists/${currentWiki}-wikicap.json`, JSON.stringify(json), (err) => {
                            if (err) {
                                logger.verbose(`${currentWiki}: Failed to save ${currentWiki}-wikicap.json (updateCapes): ${err}`);
                                return;
                            }

                            logger.verbose(`${currentWiki}: List of Wiki Cap owners successfully updated!`);
                            updateActiveUsers();
                        });
                    });
                });
        }

        function updateActiveUsers() {
            logger.verbose(`${currentWiki}: Updating list of active editors.`);

            const activeList = [];

            MWClient.api.call({
                action: "query",
                list: "allusers",
                auactiveusers: "1",
                aulimit: "500",
                auwitheditsonly: "1"
            }, (err, data) => {
                if (err) {
                    logger.apierror(`${currentWiki}: allusers returned "${err}" (updateActiveUsers)`);
                    return;
                }

                data.allusers.forEach(user => {
                    activeList.push({
                        name: user.name
                    });
                });

                fs.readFile(`./data/lists/${currentWiki}-active.json`, (err, data) => {
                    if (err) {
                        logger.error(`${currentWiki}: Failed to read ${currentWiki}-active.json (updateActiveUsers): ${err}`);
                        return;
                    }

                    const json = JSON.parse(data);
                    json.users = activeList;
                    json.updatedat = utils.formatDateLocaleDateString();

                    fs.writeFile(`./data/lists/${currentWiki}-active.json`, JSON.stringify(json), (err) => {
                        if (err) {
                            logger.error(`${currentWiki}: Failed to save ${currentWiki}-active.json (updateActiveUsers): ${err}`);
                            return;
                        }

                        logger.verbose(`${currentWiki}: List of active editors successfully updated!`);
                        updateBots();
                    });
                });
            });
        }

        function updateBots() {
            logger.verbose(`${currentWiki}: Updating list of bots.`);

            if (currentWiki === "ac") {
                return;
            } else if (currentWiki === "tf") {
                updateStaffMembers();
                return;
            }

            // Bot list
            // Groups: bot (generic), bot-global (wikia)
            // Last updated: 14/07/2020
            // MediaWiki won't let us use group and excludegroup together, so we'll need to do everything at once
            MWClient.api.call({
                action: "query",
                list: "allusers",
                aulimit: "500",
                augroup: "bot|bot-global"
            }, (err, data) => {
                if (err) {
                    logger.apierror(`${currentWiki}: allusers returned "${err}" (updateBots)`);
                    return;
                }

                data.allusers.forEach(user => {
                    if (!utils.isUserBlacklisted(user.name)) {
                        botList.push({
                            name: user.name
                        });
                    }
                });

                fs.readFile(`./data/lists/${currentWiki}-bots.json`, (err, data) => {
                    if (err) {
                        logger.error(`${currentWiki}: Failed to read ${currentWiki}-bots.json (updateBots): ${err}`);
                        return;
                    }

                    const json = JSON.parse(data);
                    json.users = botList;
                    json.updatedat = utils.formatDateLocaleDateString();

                    fs.writeFile(`./data/lists/${currentWiki}-bots.json`, JSON.stringify(json, null, 4), (err) => {
                        if (err) {
                            logger.error(`${currentWiki}: Failed to save ${currentWiki}-bots.json (updateBots): ${err}`);
                            return;
                        }

                        logger.verbose(`${currentWiki}: List of bots successfully updated!`);
                        updateStaffMembers();
                    });
                });
            });
        }

        function updateStaffMembers() {
            logger.verbose(`${currentWiki}: Updating list of staff members.`);

            if (currentWiki === "ac") {
                return;
            }

            const staffList = [];

            // Staff list
            // Groups: moderator (tf), Moderators (portal), sysop (generic), bureaucrat (generic), wiki_guardian (gamepedia), staff (wikia)
            // Last updated: 13/07/2020
            MWClient.api.call({
                action: "query",
                list: "allusers",
                aulimit: "500",
                augroup: "moderator|Moderators|sysop|bureaucrat|wiki_guardian|staff"
            }, (err, data) => {
                if (err) {
                    logger.apierror(`${currentWiki}: allusers returned "${err}" (updateStaffMembers)`);
                    return;
                }

                data.allusers.forEach(user => {
                    if (currentWiki === "tf") {
                        if (!utils.isUserValve(user.name) && !utils.isUserBlacklisted(user.name) && !utils.isUserABot("tf", user.name)) {
                            staffList.push({
                                name: user.name
                            });
                        }
                    } else {
                        if (!utils.isUserBlacklisted(user.name) && !botList.some(u => u.name === user.name)) {
                            staffList.push({
                                name: user.name
                            });
                        }
                    };
                });

                fs.readFile(`./data/lists/${currentWiki}-staff.json`, (err, data) => {
                    if (err) {
                        logger.error(`${currentWiki}: Failed to read ${currentWiki}-staff.json (updateStaffMembers): ${err}`);
                        return;
                    }

                    const json = JSON.parse(data);
                    json.users = staffList;
                    json.updatedat = utils.formatDateLocaleDateString();

                    fs.writeFile(`./data/lists/${currentWiki}-staff.json`, JSON.stringify(json, null, 4), (err) => {
                        if (err) {
                            logger.error(`${currentWiki}: Failed to save ${currentWiki}-staffv2.json (updateStaffMembers): ${err}`);
                            return;
                        }

                        logger.verbose(`${currentWiki}: List of staff members successfully updated!`);
                        logger.debug(`${currentWiki}: Lists successfully updated!`);
                    });
                });
            });
        }

        // Top 100 e Lista de Quepes é por webscrapping
        // Obviamente só funciona na Wiki do TF
        if (currentWiki === "tf") {
            updateTop100();
        } else {
            updateActiveUsers();
        }
    }

    getLists();
};
