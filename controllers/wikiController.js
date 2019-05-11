const fs = require("fs");
const logger = require("../scripts/logger");
const moment = require("moment");
const userModel = require("../models/userModel");
const wikiModel = require("../models/wikiModel");
const wikis = require("../configs/wikis/wikis.json");
const utils = require("../scripts/utils");

const userController = require("./userController");

// "Custom" wiki homepage
exports.homepage = async function (req, res) {
    let currentWiki = req.params.wiki;

    if (wikis["enabled"].includes(currentWiki)) {
        try {
            let wikiData;
            let wikiTop10;
            let wikiTop10Uploaders;

            wikiData = await wikiModel.find({
                alias: currentWiki
            }).cache(0, `${currentWiki}-wikidata`);

            wikiTop10 = await userController.top10(currentWiki);
            wikiTop10Uploaders = await userController.top10uploaders(currentWiki);

            res.render("wiki.html", {
                wName: wikis["name"][currentWiki],
                wPages: utils.formatNumber(wikiData[0].w_pages),
                wArticles: utils.formatNumber(wikiData[0].w_articles),
                wEdits: utils.formatNumber(wikiData[0].w_edits),
                wEditsAvg: utils.formatNumber(wikiData[0].w_edits / moment().diff(moment(wikis["creation"][currentWiki], "YYYY-MM-DD"), "days")),
                wImages: utils.formatNumber(wikiData[0].w_images),
                wUsers: utils.formatNumber(wikiData[0].w_users),
                wActiveUsers: utils.formatNumber(wikiData[0].w_activeusers),
                wEditsLast7: utils.formatNumber(wikiData[0].w_last7),
                wEdits7Avg: utils.roundAndFormatNumber(wikiData[0].w_last7 / 7),
                wEditsLast30: utils.formatNumber(wikiData[0].w_last30),
                wEdits30Avg: utils.roundAndFormatNumber(wikiData[0].w_last30 / 30),
                wCreated: moment(wikis["creation"][currentWiki], "YYYY-MM-DD").format("MMMM Do, YYYY"),
                wCreatedAgo: wikiData[0].w_age,
                wIsDefault: currentWiki === "tf" ? true : false,
                wAlias: currentWiki,
                wCSS: wikis["files"]["css"][currentWiki],
                wLogo: wikis["files"]["logo"][currentWiki],
                wFavicon: wikis["files"]["favicon"][currentWiki],
                wTop10: wikiTop10,
                wTop10Uploaders: wikiTop10Uploaders,
                partials: {
                    header: "common/header"
                }
            });

        } catch (err) {
            return utils.renderInternalErrorPage(res);
        }
    } else {
        return utils.renderNotFoundPage(res);
    }
};

// Lists directory
exports.lists = function (req, res) {
    let currentWiki = req.params.wiki;
    let dataFiles = fs.readdirSync("./data/lists");

    if (!wikis["enabled"].includes(currentWiki)) {
        utils.renderNotFoundPage(res);
        return;
    }

    let lists = [];

    dataFiles.forEach((file) => {
        if (file.includes(`${currentWiki}-`)) {
            if (require(`../data/lists/${file}`)["users"][0]) {
                lists.push({
                    name: require(`../data/lists/${file}`)["name"],
                    url: file.split("-")[1].split(".json")[0]
                });
            }
        }
    });

    res.render("lists.html", {
        wAlias: currentWiki,
        wName: wikis["name"][currentWiki],
        wLists: lists,
        wCSS: wikis["files"]["css"][currentWiki],
        wLogo: wikis["files"]["logo"][currentWiki],
        wFavicon: wikis["files"]["favicon"][currentWiki],
        partials: {
            header: "common/header"
        }
    });
};

// Get detailed list
// Brace yourselves, we need to rewrite this mess
exports.list = function (req, res) {
    let currentWiki = req.params.wiki;
    let selectedList = req.params.list;
    let wikiCap = currentWiki === "tf";

    if (!wikis["enabled"].includes(currentWiki)) {
        utils.renderNotFoundPage(res);
        return;
    }

    if (!fs.existsSync(`./data/lists/${currentWiki}-${selectedList}.json`)) {
        utils.renderNotFoundPage(res);
        return;
    }

    function isUserActive(wiki, user) {
        let active = require(`../data/lists/${wiki}-active.json`);
        return active["users"].some(u => u.name === user) ? true : false;
    }

    function isUserStaff(wiki, user) {
        let active = require(`../data/lists/${wiki}-staff.json`);
        return active["users"].some(u => u.name === user) ? true : false;
    }

    function isUserWikiCapOwner(user) {
        let active = require("../data/lists/tf-wikicap.json");
        return active["users"].some(u => u.name === user) ? true : false;
    }

    function isUserValveE(user) {
        let active = require("../data/lists/tf-valve.json");
        return active["users"].some(u => u.name === user) ? true : false;
    }

    function isUserABot(wiki, user) {
        let active = require(`../data/lists/${wiki}-bots.json`);
        return active["users"].some(u => u.name === user) ? true : false;
    }

    let listFileSelected = require(`../data/lists/${currentWiki}-${selectedList}.json`);
    let listFileStaff = require(`../data/lists/${currentWiki}-staff.json`);

    userModel.find({
        "u_sourcewiki": currentWiki
    }, "u_name u_edits u_registration", (err, data) => {
        if (err) {
            logger.mongooseerror(`${currentWiki} Failed to retrieve users from database (list/${selectedList}): ${err}`);
            utils.renderInternalErrorPage(res);
            return;
        }

        let users = [];

        data.forEach((entry) => {
            listFileSelected["users"].forEach(user => {
                if (user["name"] === entry["u_name"]) {
                    let userClass;

                    if (isUserStaff(currentWiki, entry["u_name"])) {
                        listFileStaff["users"].filter(function (u) {
                            if (u.name === entry["u_name"]) {
                                userClass = `user-${u.note === "current" ? "staff" : u.note}`;
                            }
                        });
                    }

                    if (isUserValveE(entry["u_name"])) {
                        userClass = "user-valve";
                    }

                    if (wikiCap && !userClass) {
                        if (isUserWikiCapOwner(entry["u_name"])) {
                            userClass = "user-wikicap";
                        }
                    }

                    let userActive = isUserActive(currentWiki, entry["u_name"]);

                    users.push({
                        name: entry["u_name"],
                        class: isUserABot(currentWiki, entry["u_name"]) ? "user-bot" : (userClass ? userClass : "user-normal"),
                        editsperday: (entry["u_edits"] / moment().diff(moment(entry["u_registration"], "YYYYMMDD"), "days")).toFixed(2),
                        registration: moment(entry["u_registration"]).format("MMM Do YYYY HH:mm"),
                        registrationUnix: moment(entry["u_registration"]).format("x"),
                        active: userActive ? "Yes" : "No",
                        activeClass: userActive ? "active" : "inactive",
                        edits: new Intl.NumberFormat().format(entry["u_edits"]),
                        wikicap_number: user["number"] ? user["number"] : null,
                        wikicap_received: user["date"] ? moment(user["date"], "MMM Do YYYY").format("MMM Do YYYY") : null,
                        wikicap_receivedUnix: user["timestamp"] ? user["timestamp"] : null,
                        staff_note: user["note"] ? user["note"].charAt(0).toUpperCase() + user["note"].slice(1) : null,
                        top100_position: user["position"] ? user["position"] : null
                    });
                }
            });
        });

        createPage(users);
    });

    function createPage(users) {
        res.render("listpage.html", {
            rUsers: users,
            wAlias: currentWiki,
            wName: wikis["name"][currentWiki],
            wCSS: wikis["files"]["css"][currentWiki],
            wLogo: wikis["files"]["logo"][currentWiki],
            wFavicon: wikis["files"]["favicon"][currentWiki],
            wWikiCap: wikiCap,
            wWikiCapList: selectedList === "wikicap",
            wTop100List: selectedList === "top100",
            wStaffList: selectedList === "staff",
            wGamepedia: require(`../configs/wikis/${currentWiki}-config.json`)["server"].includes("gamepedia"),
            lName: require(`../data/lists/${currentWiki}-${selectedList}.json`)["name"],
            lDescription: require(`../data/lists/${currentWiki}-${selectedList}.json`)["description"],
            partials: {
                header: "common/header"
            }
        });
    }
};