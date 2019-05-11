const logger = require("../scripts/logger");
const moment = require("moment");
const updateUser = require("../scripts/updateUser");
const userModel = require("../models/userModel");
const wikis = require("../configs/wikis/wikis.json");
const utils = require("../scripts/utils");

// Detailed user page
exports.user = function (req, res) {
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
};

// Compare user
exports.compare = function (req, res) {
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
};

// Get top 10 editors
exports.top10 = async function (currentWiki) {
    try {
        let userData;
        let users = [];

        userData = await userModel.find({
            "u_sourcewiki": currentWiki
        }, "u_name u_edits u_registration", {
            skip: 0,
            limit: 20,
            sort: {
                u_edits: -1
            }
        });

        userData.forEach((entry) => {
            if (!isUserBot(currentWiki, entry["u_name"]) && users.length < 10 && entry["u_edits"] !== 0) {
                users.push({
                    name: entry["u_name"],
                    editsperday: (entry["u_edits"] / moment().diff(moment(entry["u_registration"], "YYYYMMDD"), "days")).toFixed(2),
                    edits: new Intl.NumberFormat().format(entry["u_edits"]),
                    class: getUserClasses(currentWiki, entry["u_name"])
                });
            }
        });

        return users;
    } catch (err) {
        return false;
    }
};

// Get top 10 uploaders
exports.top10uploaders = async function (currentWiki) {
    try {
        let userData;
        let users = [];

        userData = await userModel.find({
            "u_sourcewiki": currentWiki
        }, "u_name u_uploads", {
            skip: 0,
            limit: 20,
            sort: {
                u_uploads: -1
            }
        });


        userData.forEach((entry) => {
            if (!isUserBot(currentWiki, entry["u_name"]) && users.length < 10 && entry["u_uploads"] !== 0) {
                users.push({
                    name: entry["u_name"],
                    uploads: new Intl.NumberFormat().format(entry["u_uploads"]),
                    class: getUserClasses(currentWiki, entry["u_name"])
                });
            }
        });

        return users;
    } catch (err) {
        return false;
    }
};

function isUserBot(wiki, user) {
    let active = require(`../data/lists/${wiki}-bots.json`);
    return active["users"].some(u => u.name === user) ? true : false;
}

// We should probably move this to utils.js
function getUserClasses(wiki, user) {
    let classes = ["user-normal"];

    if (require(`../data/lists/${wiki}-staff.json`)["users"].some(u => u.name === user && u.note === "current")) {
        classes.push("user-staff");
    }

    if (require(`../data/lists/${wiki}-staff.json`)["users"].some(u => u.name === user && u.note === "curse")) {
        classes.push("user-curse");
    }

    if (wiki === "tf") {
        if (require("../data/lists/tf-valve.json")["users"].some(u => u.name === user)) {
            classes.push("user-valve");
        }

        if (require("../data/lists/tf-wikicap.json")["users"].some(u => u.name === user)) {
            classes.push("user-wikicap");
        }
    }

    // TODO: Special color for active users
    return classes[1] ? classes[1] : classes[0];
}