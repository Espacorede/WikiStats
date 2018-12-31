/**** (c) Espacorede Project ****/

const bot = require("nodemw");
const db = require("./mongooseConnect");
const fs = require("fs");
const logger = require("./logger");
const tabletojson = require("tabletojson");

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

let usernameSubs = {
    "darkid": "Darkid",
    "i-ghost": "I-ghost"
};

module.exports.updateLists = (currentWiki = "tf") => {
    let MWClient = new bot(`./configs/wikis/${currentWiki}-config.json`);

    function getLists() {
        function updateTop100() {
            logger.verbose(`${currentWiki}: Updating list of editors by edit count (Top 100).`);

            tabletojson.convertUrl(
                "https://wiki.teamfortress.com/wiki/Team_Fortress_Wiki:Reports/Users_by_edit_count",
                (table) => {
                    let topList = [];

                    Object.keys(table[2]).forEach(user => {
                        let name = table[2][user]["User"];
                        let position = table[2][user]["#"];

                        if (name in usernameSubs) {
                            name = usernameSubs[name];
                        }

                        if (position === "BOT") {
                            return;
                        }

                        let userObj = {
                            "name": name,
                            "position": position
                        };

                        topList.push(userObj);
                    });

                    fs.readFile(`./data/lists/${currentWiki}-top100.json`, (err, data) => {
                        if (err) {
                            logger.verbose(`${currentWiki}: Failed to read ${currentWiki}-top100.json (updateTop100): ${err}`);
                            return;
                        }

                        let json = JSON.parse(data);
                        json["users"] = topList;

                        fs.writeFile(`./data/lists/${currentWiki}-top100.json`, JSON.stringify(json, null, 2), (err) => {
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
                    let capes = [];

                    Object.keys(table[0]).forEach(cap => {
                        let user = table[0][cap]["Recipient"];
                        let date = table[0][cap]["Date awarded"].substring(/[a-z]/i.exec(table[0][cap]["Date awarded"]).index);
                        let timestamp = new Date(date).getTime();
                        let steamid = table[0][cap]["Backpack"];
                        let number = cap;

                        if (user in usernameSubs) {
                            user = usernameSubs[user];
                        }

                        let capObj = {
                            "name": user,
                            "number": number,
                            "date": date,
                            "timestamp": timestamp,
                            "steamid": steamid
                        };

                        capes.push(capObj);
                    });

                    fs.readFile(`./data/lists/${currentWiki}-wikicap.json`, (err, data) => {
                        if (err) {
                            logger.verbose(`${currentWiki}: Failed to read ${currentWiki}-wikicap.json (updateCapes): ${err}`);
                            return;
                        }

                        let json = JSON.parse(data);
                        json["users"] = capes;

                        fs.writeFile(`./data/lists/${currentWiki}-wikicap.json`, JSON.stringify(json, null, 2), (err) => {
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

            let activeList = [];

            MWClient.api.call({
                "action": "query",
                "list": "allusers",
                "auactiveusers": "1",
                "aulimit": "500",
                "auwitheditsonly": "1"
            }, (err, data) => {
                if (err) {
                    logger.apierror(`${currentWiki}: allusers returned "${err}" (updateActiveUsers)`);
                    return;
                }

                data["allusers"].forEach(user => {
                    activeList.push({
                        "name": user["name"]
                    });
                });

                fs.readFile(`./data/lists/${currentWiki}-active.json`, (err, data) => {
                    if (err) {
                        logger.error(`${currentWiki}: Failed to read ${currentWiki}-active.json (updateActiveUsers): ${err}`);
                        return;
                    }

                    let json = JSON.parse(data);
                    json["users"] = activeList;

                    fs.writeFile(`./data/lists/${currentWiki}-active.json`, JSON.stringify(json, null, 2), (err) => {
                        if (err) {
                            logger.error(`${currentWiki}: Failed to save ${currentWiki}-active.json (updateActiveUsers): ${err}`);
                            return;
                        }

                        logger.verbose(`${currentWiki}: List of active editors successfully updated!`);
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