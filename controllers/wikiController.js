/** ** (c) Espacorede Project ** **/

const fs = require("fs");
const logger = require("../scripts/logger");
const moment = require("moment");
const userModel = require("../models/userModel");
const wikiModel = require("../models/wikiModel");
const topModel = require("../models/topModel");
const wikis = require("../configs/wikis/wikis.json");
const utils = require("../scripts/utils");

const updateWiki = require("../scripts/updateWiki");

// "Custom" wiki homepage
exports.homepage = async function (req, res) {
    const currentWiki = req.params.wiki;

    try {
        const wikiData = await wikiModel.find({
            alias: currentWiki
        }).cache(0, `${currentWiki}-wikidata`);

        res.render("pages/wiki.html", {
            wiki: {
                wPages: utils.formatNumber(wikiData[0].w_pages),
                wArticles: utils.formatNumber(wikiData[0].w_articles),
                wEdits: utils.formatNumber(wikiData[0].w_edits),
                wEditsAvg: utils.formatNumber(wikiData[0].w_edits / moment().diff(moment(wikis.creation[currentWiki], "YYYY-MM-DD"), "days")),
                wImages: utils.formatNumber(wikiData[0].w_images),
                wUsers: utils.formatNumber(wikiData[0].w_users),
                wActiveUsers: utils.formatNumber(wikiData[0].w_activeusers),
                wEditsLast7: utils.formatNumber(wikiData[0].w_last7),
                wEdits7Avg: utils.roundAndFormatNumber(wikiData[0].w_last7 / 7),
                wEditsLast30: utils.formatNumber(wikiData[0].w_last30),
                wEdits30Avg: utils.roundAndFormatNumber(wikiData[0].w_last30 / 30),
                wCreated: utils.formatDate(wikis.creation[currentWiki], "MMMM YYYY"),
                wCreatedAgo: wikiData[0].w_age
            },
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost",
                wName: wikis.name[currentWiki],
                wIsDefault: currentWiki === "tf",
                wAlias: currentWiki,
                wTheme: wikis.files.theme[currentWiki]
            },
            partials: {
                header: "../common/header",
                footer: "../common/footer"
            }
        });
    } catch (err) {
        updateWiki.updateWiki(currentWiki);

        utils.renderInternalErrorPage(res);
    }
};

// Lists directory
exports.lists = function (req, res) {
    const currentWiki = req.params.wiki;
    const dataFiles = fs.readdirSync("./data/lists");
    const lists = [];

    dataFiles.forEach((file) => {
        if (file.includes(`${currentWiki}-`)) {
            // FIXME: Quando isso falha a página fica com mensagem de Server Error padrão
            // Favor reescrever isso e usar utils.renderInternalErrorPage
            const list = require(`../data/lists/${file}`);

            if (list.users[0]) {
                lists.push({
                    name: list.name,
                    url: file.split("-")[1].split(".json")[0],
                    generated: list.auto === false
                });
            }
        }
    });

    res.render("lists/lists-homepage.html", {
        wLists: lists,
        helpers: {
            webHost: `${req.protocol}://${req.get("Host")}`,
            webHostCanonical: "http://wikistats.localhost",
            wName: wikis.name[currentWiki],
            wIsDefault: currentWiki === "tf",
            wAlias: currentWiki,
            wTheme: wikis.files.theme[currentWiki]
        },
        partials: {
            header: "../common/header",
            footer: "../common/footer"
        }
    });
};

// Get detailed list
// Brace yourselves, we need to rewrite this mess
exports.list = function (req, res) {
    const currentWiki = req.params.wiki;
    const selectedList = req.params.list;
    const wikiCap = currentWiki === "tf";
    let listFileSelected = {};

    fs.readFile(`./data/lists/${currentWiki}-${selectedList}.json`, function (err, data) {
        if (err) {
            logger.error(`${currentWiki}: Failed to read ${currentWiki}-${selectedList}.json: ${err}`);

            if (err.code === "ENOENT") {
                return utils.renderNotFoundPageWiki(res, currentWiki);
            } else {
                return utils.renderInternalErrorPage(res);
            }
        } else {
            listFileSelected = JSON.parse(data);

            userModel.find({
                u_sourcewiki: currentWiki,
                u_edits: {$exists: true}
            }, "u_name u_edits u_registration u_groups", (err, data) => {
                if (err) {
                    logger.mongooseerror(`${currentWiki}: Failed to retrieve users from database (list/${selectedList}): ${err}`);
                    utils.renderInternalErrorPage(res);
                    return;
                }

                const users = [];

                data.forEach((entry) => {
                    listFileSelected.users.forEach(user => {
                        if (user.name === entry.u_name &&
                            !utils.isUserBlacklisted(entry.u_name) &&
                            !utils.isUserRightBlacklisted(entry.u_groups)
                        ) {
                            const userActive = utils.isUserActive(currentWiki, entry.u_name);

                            users.push({
                                name: entry.u_name,
                                class: utils.getUserClasses(currentWiki, entry.u_name),
                                editsperday: (entry.u_edits / moment().diff(moment(entry.u_registration, "YYYYMMDD"), "days")).toFixed(2),
                                registration: utils.formatDate(entry.u_registration, "LL"),
                                registrationUnix: utils.formatDateTimestamp(entry.u_registration),
                                active: userActive ? "Yes" : "No",
                                activeClass: userActive ? "active" : "inactive",
                                edits: utils.formatNumber(entry.u_edits),
                                wikicap_number: user.number ? user.number : null,
                                wikicap_received: user.date ? utils.formatDate(user.date, "LL") : null,
                                wikicap_receivedUnix: user.timestamp ? user.timestamp : null,
                                top100_position: user.position ? user.position : null
                            });
                        }
                    });
                });

                createPage(users);
            });
        }
    });

    function createPage(users) {
        const list = require(`../data/lists/${currentWiki}-${selectedList}.json`);

        res.render("lists/lists-generic.html", {
            rUsers: users,
            lName: list.name,
            lDescription: list.description,
            lActive: selectedList !== "active",
            wWikiCap: wikiCap,
            wWikiCapList: selectedList === "wikicap",
            wTop100List: selectedList === "top100",
            wStaffList: selectedList === "staff",
            lGenerated: list.auto === false,
            lUpdatedAt: list.updatedat || "",
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost",
                wAlias: currentWiki,
                wName: wikis.name[currentWiki],
                wTheme: wikis.files.theme[currentWiki]
            },
            partials: {
                header: "../common/header",
                footer: "../common/footer"
            }
        });
    }
};

// Get monthly top contributors
exports.monthlytop = async function (req, res) {
    const currentWiki = req.params.wiki;
    const topData = await topModel.find({
        wiki: currentWiki,
        year: req.params.year,
        month: req.params.month,
        data: {$exists: true, $ne: []}
    }, "data start end").cache(0, `${currentWiki}-top-${req.params.year}-${req.params.month}`);

    if (topData[0]) {
        const users = [];
        let index = 1;

        topData[0].data.forEach((entry) => {
            users.push({
                index: index,
                name: entry.name,
                class: utils.getUserClasses(currentWiki, entry.name),
                contribsperday: (entry.edits / moment(topData[0].end, "YYYY-MM-DD").diff(moment(topData[0].start, "YYYY-MM-DD"), "days")).toFixed(2),
                contribs: utils.formatNumber(entry.contribs),
                edits: utils.formatNumber(entry.edits),
                uploads: utils.formatNumber(entry.uploads)
            });

            index++;
        });

        res.render("lists/tops-page.html", {
            wGamepedia: require(`../configs/wikis/${currentWiki}-config.json`).server.includes("gamepedia"),
            wWikiCap: currentWiki === "tf",
            data: {
                tMonth: utils.formatDate(req.params.month, "MMMM"),
                tYear: req.params.year,
                tStart: utils.formatDateLocaleString(topData[0].start),
                tEnd: utils.formatDateLocaleString(topData[0].end),
                tData: users
            },
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost",
                wAlias: currentWiki,
                wName: wikis.name[currentWiki],
                wTheme: wikis.files.theme[currentWiki]
            },
            partials: {
                header: "../common/header",
                footer: "../common/footer"
            }
        });
    } else {
        utils.renderNotFoundPage(res, req);
    }
};

// Monthly top directory
exports.monthly = function (req, res) {
    const currentWiki = req.params.wiki;

    res.render("lists/tops-homepage.html", {
        helpers: {
            webHost: `${req.protocol}://${req.get("Host")}`,
            webHostCanonical: "http://wikistats.localhost",
            wName: wikis.name[currentWiki],
            wIsDefault: currentWiki === "tf",
            wAlias: currentWiki,
            wTheme: wikis.files.theme[currentWiki],
            lYear: new Date().getUTCFullYear()
        },
        partials: {
            header: "../common/header",
            footer: "../common/footer"
        }
    });
};

exports.monthlytopavailable = async function (req, res) {
    try {
        const available = await topModel.find({
            wiki: req.params.wiki,
            year: req.query.year,
            data: {$exists: true, $ne: []}
        }, "month");
        const lists = [];

        available.forEach((list) => {
            lists.push({
                list: utils.formatDate(list.month, "MMMM"),
                year: req.query.year,
                month: list.month
            });
        });

        res.send(JSON.stringify({
            lists: lists
        }));
    } catch (err) {
        utils.renderJsonResponse(res, "Failed.", "There are no tops.");
    }
};

// Get top 10 editors
exports.top10editors = async function (req, res) {
    const currentWiki = req.params.wiki;

    try {
        const users = [];
        const bots = [];
        const userData = await userModel.find({
            u_sourcewiki: currentWiki,
            u_editsws: {$exists: true}
        }, "u_name u_editsws u_registration u_groups", {
            skip: 0,
            limit: 15,
            sort: {
                u_editsws: -1
            }
        });

        userData.forEach((entry) => {
            if (!utils.isUserABot(currentWiki, entry.u_name) &&
                users.length < 10 &&
                entry.u_editsws !== 0 &&
                !utils.isUserRightBlacklisted(entry.u_groups) &&
                !utils.isUserBlacklisted(entry.u_name)
            ) {
                users.push({
                    name: entry.u_name,
                    editsPerDay: (entry.u_editsws / moment().diff(moment(entry.u_registration, "YYYYMMDD"), "days")).toFixed(2),
                    edits: utils.formatNumber(entry.u_editsws),
                    class: utils.getUserClasses(currentWiki, entry.u_name)
                });
            } else if (utils.isUserABot(currentWiki, entry.u_name)) {
                bots.push({
                    name: entry.u_name,
                    editsPerDay: (entry.u_editsws / moment().diff(moment(entry.u_registration, "YYYYMMDD"), "days")).toFixed(2),
                    edits: utils.formatNumber(entry.u_editsws),
                    class: utils.getUserClasses(currentWiki, entry.u_name)
                });
            }
        });

        res.send(JSON.stringify({
            success: true,
            total: {
                users: users.length,
                bots: bots.length
            },
            users: users,
            bots: bots
        }));
    } catch (err) {
        utils.renderJsonResponse(res, "Failed.", err);
    }
};

// Get top 10 uploaders
exports.top10uploaders = async function (req, res) {
    const currentWiki = req.params.wiki;

    try {
        const users = [];
        const bots = [];
        const userData = await userModel.find({
            u_sourcewiki: currentWiki,
            u_edits: {$exists: true}
        }, "u_name u_alluploads u_registration u_groups", {
            skip: 0,
            limit: 20,
            sort: {
                u_alluploads: -1
            }
        });

        userData.forEach((entry) => {
            if (!utils.isUserABot(currentWiki, entry.u_name) &&
                users.length < 10 &&
                entry.u_alluploads !== 0 &&
                !utils.isUserRightBlacklisted(entry.u_groups) &&
                !utils.isUserBlacklisted(entry.u_name)
            ) {
                users.push({
                    name: entry.u_name,
                    uploads: utils.formatNumber(entry.u_alluploads),
                    uploadsPerDay: (entry.u_alluploads / moment().diff(moment(entry.u_registration, "YYYYMMDD"), "days")).toFixed(2),
                    class: utils.getUserClasses(currentWiki, entry.u_name)
                });
            } else if (utils.isUserABot(currentWiki, entry.u_name)) {
                bots.push({
                    name: entry.u_name,
                    uploads: utils.formatNumber(entry.u_alluploads),
                    uploadsPerDay: (entry.u_alluploads / moment().diff(moment(entry.u_registration, "YYYYMMDD"), "days")).toFixed(2),
                    class: utils.getUserClasses(currentWiki, entry.u_name)
                });
            }
        });

        res.send(JSON.stringify({
            success: true,
            total: {
                users: users.length,
                bots: bots.length
            },
            users: users,
            bots: bots
        }));
    } catch (err) {
        utils.renderJsonResponse(res, "Failed.", err);
    }
};
