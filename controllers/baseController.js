/** ** (c) Espacorede Project ** **/

const logger = require("../scripts/logger");
const userModel = require("../models/userModel");
const utils = require("../scripts/utils");
const wikis = require("../configs/wikis/wikis.json");
const fs = require("fs");

// Homepage
exports.homepage = async function (req, res) {
    if (!wikis.enabled || !wikis.enabled[0]) {
        logger.error("There are no wikis enabled! Please edit wikis.json.");
        res.send("There are no wikis enabled! Please edit wikis.json.");
        return;
    } else if (wikis.enabled.length === 1 || !wikis.featured || !wikis.featured[0]) {
        if (!wikis.featured || !wikis.featured[0]) {
            logger.warn(`There are no wikis defined as "featured" in wikis.js, redirecting to ${wikis.enabled[0]}.`);
        }

        res.redirect(`/wiki/${wikis.enabled[0]}`);
        return;
    }

    try {
        const changelog = JSON.parse(fs.readFileSync("./data/changelog.json"));
        const wikiData = await userModel.find({}, "u_name u_edits").cache(0, "wikistats-data");
        const featuredWikis = [];

        wikis.featured.forEach(wiki => {
            const newWiki = {
                path: wiki,
                name: wikis.name[wiki]
            };

            featuredWikis.push(newWiki);
        });

        featuredWikis.sort((a, b) => a.name.localeCompare(b.name));

        res.render("pages/home.html", {
            pWikis: featuredWikis,
            mUsers: wikiData ? utils.formatNumber(wikiData.length) : "over 1.000",
            mWikis: wikis.enabled.length,
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost",
                wsFeaturedChangelog: changelog.changelogFeatured
            },
            partials: {
                header: "../common/header",
                footer: "../common/footer"
            }
        });
    } catch (err) {
        logger.error(`Failed to render /: ${err}`);
        utils.renderInternalErrorPage(res);
    }
};

// About
exports.about = async function (req, res) {
    try {
        const availableWikis = [];

        wikis.enabled.forEach(wiki => {
            const newWiki = {
                path: wiki,
                name: wikis.name[wiki],
                url: wikis.url[wiki]
            };

            availableWikis.push(newWiki);
        });

        availableWikis.sort((a, b) => a.name.localeCompare(b.name));

        res.render("pages/about.html", {
            pWikis: availableWikis,
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost"
            },
            partials: {
                header: "../common/header",
                footer: "../common/footer"
            }
        });
    } catch (err) {
        logger.error(`Failed to render /about: ${err}`);
        utils.renderInternalErrorPage(res);
    }
};

// Search
exports.search = async function (req, res) {
    if (!req.query.term || !req.query.wiki) {
        return utils.renderJsonResponse(res, false, "Missing required parameter (term, wiki)");
    }

    try {
        const users = [];
        const regex = new RegExp(req.query.term, "i");
        const queryData = await userModel.find({
            u_name: regex,
            u_sourcewiki: req.query.wiki,
            updateComplete: true
        }, "u_name u_editsws").sort({
            dataLastUpdated: -1
        }).limit(5);

        queryData.forEach(user => {
            users.push({
                name: user.u_name,
                edits: user.u_editsws ? user.u_editsws : null,
                editsFormatted: user.u_editsws ? utils.formatNumber(user.u_editsws) : null,
                uploads: user.u_alluploads ? user.u_alluploads : null,
                uploadsFormatted: user.u_alluploads ? utils.formatNumber(user.u_alluploads) : null
            });
        });

        res.send(JSON.stringify({
            success: true,
            total: users.length,
            users: users
        }));
    } catch (err) {
        utils.renderJsonResponse(res, "Failed.", err);
    }
};

// Changelog
exports.changelog = async function (req, res) {
    const changelog = JSON.parse(fs.readFileSync("./data/changelog.json"));

    res.render("pages/changelog.html", {
        page: {
            version: changelog.versionPublic,
            github: changelog.repositoryGitHub,
            gitlab: changelog.repositoryGitLab,
            changelog: changelog.changelog
        },
        process: {
            version: process.env.npm_package_version,
            uptime: new Date(Math.floor(process.uptime()) * 1000).toISOString().substr(11, 8),
            memory: process.memoryUsage
        },
        helpers: {
            webHost: `${req.protocol}://${req.get("Host")}`,
            webHostCanonical: "http://wikistats.localhost"
        },
        partials: {
            header: "../common/header",
            footer: "../common/footer"
        }
    });
};

// Offline
exports.offline = async function (req, res) {
    res.render("pages/offline.html");
};

// Achievements
exports.achievements = async function (req, res) {
    res.send(JSON.parse(fs.readFileSync("./data/achievements.json")));
};

// Redirects
exports.github = function (req, res) {
    res.redirect(301, "https://github.com/Espacorede/WikiStats");
};

exports.gitlab = function (req, res) {
    res.redirect(301, "https://gitlab.com/Espacorede/WikiStats");
};
