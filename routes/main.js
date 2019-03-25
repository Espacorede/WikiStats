/** * (c) Espacorede Project * **/

const db = require("../scripts/mongooseConnect");
const express = require("express");
const fs = require("fs");
const logger = require("../scripts/logger");
const moment = require("moment");
const updateUser = require("../scripts/updateUser");
const userModel = require("../models/userModel");
const wikiModel = require("../models/wikiModel");
const wikis = require("../configs/wikis/wikis.json");
const utils = require("../scripts/utils");
const router = express.Router();

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

// Homepage

router.get("/", (req, res) => {
    if (wikis["enabled"].length === 1) {
        res.redirect(`${wikis["enabled"][0]}/wiki`);
        return;
    }

    userModel.find({}, "u_name u_edits", function (err, data) {
        if (err) {
            logger.mongooseerror(`Failed to retrieve users from database (/): ${err}`);
            utils.renderInternalErrorPage(res);
            return;
        }

        let availableWikis = [];

        wikis["enabled"].forEach(wiki => {
            let newWiki = {
                path: wiki,
                name: wikis.name[wiki],
                logo: wikis.files.logo[wiki]
            };
            availableWikis.push(newWiki);
        });

        availableWikis.sort((a, b) => a.name.localeCompare(b.name));

        res.render("homepage.html", {
            pWikis: availableWikis,
            mUsers: data ? data.length : "Unknown",
            mWikis: wikis["enabled"].length,
            partials: {
                header: "common/header"
            }
        });
    });
});

// "Custom" main page

router.get("/:wiki/wiki", (req, res) => {
    let currentWiki = req.params.wiki;

    if (wikis["enabled"].includes(currentWiki)) {
        wikiModel.find({
            alias: currentWiki
        }).cache(0, `${currentWiki}-wikidata`).exec((err, data) => {
            if (err) {
                logger.mongooseerror(`${currentWiki}: Failed to retrieve wiki data from database (/): ${err}`);
                utils.renderInternalErrorPage(res);
                return;
            }

            let wikiData = data[0];

            if (!wikiData) {
                utils.renderInternalErrorPage(res);
                return;
            }

            res.render("wiki.html", {
                wName: wikis["name"][currentWiki],
                wPages: utils.formatNumber(wikiData.w_pages),
                wArticles: utils.formatNumber(wikiData.w_articles),
                wEdits: utils.formatNumber(wikiData.w_edits),
                wEditsAvg: utils.formatNumber(wikiData.w_edits / moment().diff(moment(wikis["creation"][currentWiki], "YYYY-MM-DD"), "days")),
                wImages: utils.formatNumber(wikiData.w_images),
                wUsers: utils.formatNumber(wikiData.w_users),
                wActiveUsers: utils.formatNumber(wikiData.w_activeusers),
                wEditsLast7: utils.formatNumber(wikiData.w_last7),
                wEdits7Avg: utils.roundAndFormatNumber(wikiData.w_last7 / 7),
                wEditsLast30: utils.formatNumber(wikiData.w_last30),
                wEdits30Avg: utils.roundAndFormatNumber(wikiData.w_last30 / 30),
                wCreated: moment(wikis["creation"][currentWiki], "YYYY-MM-DD").format("MMMM Do, YYYY"),
                wCreatedAgo: wikiData.w_age,
                wIsDefault: currentWiki === "tf" ? true : false,
                wAlias: currentWiki,
                wCSS: wikis["files"]["css"][currentWiki],
                wLogo: wikis["files"]["logo"][currentWiki],
                wFavicon: wikis["files"]["favicon"][currentWiki],
                partials: {
                    header: "common/header"
                }
            });
        });
    } else {
        utils.renderNotFoundPage(res);
        return;
    }
});

// User pages

router.get("/:wiki/user/:user", (req, res) => {
    let currentWiki = req.params.wiki;

    if (!wikis["enabled"].includes(currentWiki)) {
        utils.renderNotFoundPage(res);
        return;
    }

    let user = utils.returnCleanUsername(req.params.user);

    userModel.find({
        u_sourcewiki: currentWiki,
        u_name: user
    }).cache(0, `${currentWiki}user-${user}`).exec((err, data) => {
        if (err) {
            logger.mongooseerror(`Failed to search for "${user}" in the database (/user): ${err}`);
            utils.renderInternalErrorPage(res);
            return;
        }

        if (!data || !data[0] || !data[0].u_edits) {
            logger.verbose(`No data for "${user}" was found in the database, calling updateUser.`);
            updateUser.getUserInfo(user, 2, currentWiki);
            res.render("user.html", {
                user: user,
                wName: wikis["name"][currentWiki],
                wAlias: currentWiki,
                wIsDefault: currentWiki === "tf" ? true : false,
                wCSS: wikis["files"]["css"][currentWiki],
                wLogo: wikis["files"]["logo"][currentWiki],
                wFavicon: wikis["files"]["favicon"][currentWiki],
                partials: {
                    header: "common/header"
                }
            });
            return;
        }
        updateUser.getUserInfo(user, 0, currentWiki);

        let registrationInDays = moment().diff(moment(data[0].u_registration, "YYYYMMDD"), "days");
        let average = registrationInDays <= 0 ? utils.formatNumber(data[0].u_edits) : (data[0].u_edits / registrationInDays).toFixed(2);

        res.render("user.html", {
            user: user,
            mEdits: utils.formatNumber(data[0].u_contribs.length),
            mEditsAvg: average,
            wName: wikis["name"][currentWiki],
            wAlias: currentWiki,
            wIsDefault: currentWiki === "tf" ? true : false,
            wCSS: wikis["files"]["css"][currentWiki],
            wLogo: wikis["files"]["logo"][currentWiki],
            wFavicon: wikis["files"]["favicon"][currentWiki],
            partials: {
                header: "common/header"
            }
        });
    });
});

router.get("/:wiki/user/:user/compare", async (req, res) => {
    let currentWiki = req.params.wiki;

    if (!wikis["enabled"].includes(currentWiki)) {
        utils.renderNotFoundPage(res);
        return;
    }

    let mainUser = req.params.user;
    let comparedUser = req.query.user;
    let main; // Dados do primeiro usuário
    let target; // Dados do segundo usuário

    getUser(mainUser);

    function getUser(name, isMain = true) {
        userModel.find({
            u_name: name
        }).exec((err, data) => {
            if (err) {
                logger.mongooseerror(`Failed to search for "${name}" in the database (/user/compare): ${err}`);
                utils.renderInternalErrorPage(res);
                return;
            }

            if (!data || !data[0]) {
                res.status(404).render("error.html", {
                    errorCode: "404",
                    errorTitle: `User "${name}" was not found`,
                    errorReturnToMain: true,
                    partials: {
                        header: "common/header"
                    }
                });
                return;
            }

            if (!data[0].u_contribs[0]) {
                res.status(404).render("error.html", {
                    errorCode: "404",
                    errorTitle: `User "${name}" has no edits`,
                    errorReturnToMain: true,
                    partials: {
                        header: "common/header"
                    }
                });
                return;
            }

            if (isMain) {
                processUser(data, true, false);
            } else {
                processUser(data, false, true);
            }
        });
    }

    function processUser(data, isMain = true, shouldCreate = false) {
        if (isMain) {
            main = data;
        } else {
            target = data;
        }

        if (shouldCreate) {
            createPage();
        } else {
            getUser(comparedUser, false);
        }
    }

    function createPage() {
        res.render("compare.html", {
            main: main[0].u_name,
            target: target[0].u_name,
            wName: wikis["name"][currentWiki],
            wAlias: currentWiki,
            wIsDefault: currentWiki === "tf" ? true : false,
            wCSS: wikis["files"]["css"][currentWiki],
            wLogo: wikis["files"]["logo"][currentWiki],
            wFavicon: wikis["files"]["favicon"][currentWiki],
            partials: {
                header: "common/header"
            }
        });
    }
});

// Lists

router.get("/:wiki/lists", (req, res) => {
    let currentWiki = req.params.wiki;
    let dataFiles = fs.readdirSync("./data/lists");

    if (!wikis["enabled"].includes(currentWiki)) {
        utils.renderNotFoundPage(res);
        return;
    }

    let lists = [];

    dataFiles.forEach((file) => {
        if (file.includes(currentWiki)) {
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

});

router.get("/:wiki/list/:list", (req, res) => {
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
            lName: require(`../data/lists/${currentWiki}-${selectedList}.json`)["name"],
            lDescription: require(`../data/lists/${currentWiki}-${selectedList}.json`)["description"],
            partials: {
                header: "common/header"
            }
        });
    }
});

// Other

router.get("/about", (req, res) => {
    userModel.find({}, "u_name u_edits", (err, data) => {
        if (err) {
            logger.mongooseerror(`Failed to retrieve users from database (/about): ${err}`);
            utils.renderInternalErrorPage(res);
            return;
        }

        let availableWikis = [];

        wikis["enabled"].forEach(wiki => {
            let newWiki = {
                path: wiki,
                name: wikis.name[wiki],
                url: wikis.url[wiki]
            };
            availableWikis.push(newWiki);
        });

        availableWikis.sort((a, b) => a.name.localeCompare(b.name));

        res.render("about.html", {
            userstotal: data ? data.length : "Unknown",
            pWikis: availableWikis,
            partials: {
                header: "common/header"
            }
        });
    });
});

module.exports = router;