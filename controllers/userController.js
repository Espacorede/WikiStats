/** ** (c) Espacorede Project ** **/

const logger = require("../scripts/logger");
const moment = require("moment");
const updateUser = require("../scripts/updateUser");
const userModel = require("../models/userModel");
const wikis = require("../configs/wikis/wikis.json");
const utils = require("../scripts/utils");

// Detailed user page
exports.user = async function (req, res) {
    const currentWiki = req.params.wiki;
    const user = utils.returnCleanUsername(req.params.user);

    try {
        const userData = await userModel.find({
            u_sourcewiki: currentWiki,
            u_name: user
        }).cache(0, `${currentWiki}user-${user}`);

        if (!userData || !userData[0] || !userData[0].u_edits) {
            if (!utils.isUserBlacklisted(user)) {
                logger.verbose(`No data for "${user}" was found in the database, calling updateUser.`);
                updateUser.getUserInfo(user, 0, currentWiki);
            } else {
                logger.verbose(`No data for "${user}" was found in the database but isUserBlacklisted is true.`);
            }

            res.render("pages/user.html", {
                user: user,
                helpers: {
                    webHost: `${req.protocol}://${req.get("Host")}`,
                    webHostCanonical: "http://wikistats.localhost",
                    wAlias: currentWiki,
                    wName: wikis.name[currentWiki],
                    wTheme: wikis.files.theme[currentWiki],
                    wIsDefault: currentWiki === "tf"
                },
                partials: {
                    header: "../common/header",
                    footer: "../common/footer"
                }
            });

            return;
        }

        updateUser.getUserInfo(user, 0, currentWiki);

        const registrationInDays = moment().diff(moment(userData[0].u_registration, "YYYYMMDD"), "days");
        const average = registrationInDays <= 0 ? utils.formatNumber(userData[0].u_edits) : (userData[0].u_edits / registrationInDays).toFixed(2);

        res.render("pages/user.html", {
            user: user,
            mEdits: utils.formatNumber(userData[0].u_contribs.length),
            mEditsAvg: average,
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost",
                wAlias: currentWiki,
                wName: wikis.name[currentWiki],
                wTheme: wikis.files.theme[currentWiki],
                wIsDefault: currentWiki === "tf",
                wIsMultiLanguage: currentWiki === ("tf" || "portal")
            },
            partials: {
                header: "../common/header",
                footer: "../common/footer"
            }
        });
    } catch (err) {
        logger.error(`Failed to search for "${user}" in the database (/user): ${err}`);
        utils.renderInternalErrorPage(res);
    }
};

// Raw user data
exports.userRaw = async function (req, res) {
    const currentWiki = req.params.wiki;
    const user = utils.returnCleanUsername(req.params.user);

    try {
        const userData = await userModel.find({
            u_sourcewiki: currentWiki,
            u_name: user
        }).cache(0, `${currentWiki}user-${user}`);

        if (!userData || !userData[0] || !userData[0].u_edits) {
            if (!utils.isUserBlacklisted(user)) {
                logger.verbose(`No data for "${user}" was found in the database (raw profile).`);
                utils.renderJsonResponse(res, false, "User not found.");
            } else {
                utils.renderJsonResponse(res, false, "User is blacklisted.");
            }

            return;
        }

        res.send(JSON.stringify({
            success: true,
            user: userData[0].u_name,
            wiki: userData[0].u_sourcewiki,
            lastUpdated: userData[0].dataLastUpdated,
            updateComplete: userData[0].updateComplete,
            data: {
                registration: userData[0].registration,
                uploads: userData[0].u_alluploads,
                uploadsNew: userData[0].u_uploads,
                edits: userData[0].u_editsws,
                editsMediaWiki: userData[0].u_edits,
                minors: userData[0].u_minoredits,
                creations: userData[0].u_pagecreations,
                uniques: userData[0].u_uniquepages,
                blocks: userData[0].u_blockcount,
                deletes: userData[0].u_deletecount,
                thanked: userData[0].u_thanked,
                thanks: userData[0].u_thanks,
                namespaces: userData[0].u_namespaceedits,
                groups: userData[0].u_groups,
                languages: userData[0].u_languagedits || null
            }
        }));
    } catch (err) {
        logger.error(`Failed to search for "${user}" in the database (raw profile): ${err}`);
        utils.renderJsonResponse(res, false, "Query failed.");
    }
};
