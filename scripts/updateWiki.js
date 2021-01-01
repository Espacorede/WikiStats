/** ** (c) Espacorede Project ** **/

const async = require("async");
const Bot = require("nodemw");
const cachegoose = require("cachegoose");
const db = require("./mongooseConnect");
const utils = require("./utils");
const logger = require("./logger");
const moment = require("moment");
const wikiModel = require("../models/wikiModel.js");

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

module.exports.updateWiki = (currentWiki = "tf") => {
    const MWClient = new Bot(`./configs/wikis/${currentWiki}-config.json`);

    function updateWiki() {
        let wikiActiveUsers = "";
        let wikiAdmins = "";
        let wikiAge = "";
        let wikiArticles = "";
        let wikiEdits = "";
        let wikiImages = "";
        let wikiLast30Days = "";
        let wikiLast7Days = "";
        let wikiName = "";
        let wikiPages = "";
        let wikiUsers = "";

        function getWikiInfo() {
            logger.verbose(`${currentWiki}: Updating wiki information`);

            const parameters = {
                action: "query",
                meta: "siteinfo",
                siprop: "general"
            };

            MWClient.api.call(parameters, (err, data) => {
                if (err) {
                    logger.apierror(`${currentWiki}: general returned "${err}" (getWikiInfo)`);
                    return;
                }

                const wikidata = data.general;

                wikiName = wikidata.sitename;

                getWikiAge();
            });
        }

        function getWikiAge() {
            logger.verbose(`${currentWiki}: Updating wiki age.`);

            wikiAge = moment(require("../configs/wikis/wikis.json").creation[currentWiki], "YYYY-MM-DD").fromNow();

            getWikiStatistics();
        }

        // https://wiki.teamfortress.com/wiki/Special:Statistics
        function getWikiStatistics() {
            logger.verbose(`${currentWiki}: Updating wiki statistics.`);

            const parameters = {
                action: "query",
                meta: "siteinfo",
                siprop: "statistics"
            };

            MWClient.api.call(parameters, (err, data) => {
                if (err) {
                    logger.apierror(`${currentWiki}: statistics returned "${err}" (getWikiStatistics)`);
                    return;
                }

                const wikidata = data.statistics;

                wikiPages = wikidata.pages;
                wikiArticles = wikidata.articles;
                wikiEdits = wikidata.edits;
                wikiImages = wikidata.images;
                wikiUsers = wikidata.users;
                wikiActiveUsers = wikidata.activeusers;
                wikiAdmins = wikidata.admins;

                getRecentChanges();
            });
        }

        function getRecentChanges() {
            logger.verbose(`${currentWiki}: Checking recent changes.`);

            const daysToLookFor = 30;
            const daysToLookForTimestamp = utils.formatDateTimestamp(moment().subtract(daysToLookFor, "days"));

            const parameters = {
                action: "query",
                list: "recentchanges",
                rclimit: 500,
                rcstart: daysToLookForTimestamp, // Timestamp do daysToLookFoor (timeStampToLookFor)
                rcdir: "newer",
                rcshow: "!bot" // Ingnora bots
            };

            let totalEdits = 0;
            wikiLast7Days = 0;

            function callRecentChanges() {
                logger.verbose(`${currentWiki}: Total number of edits so far (callRecentChanges): ${totalEdits}`);

                async.whilst(
                    () => true,
                    (callback) => {
                        MWClient.api.call(parameters, (err, data, next) => {
                            if (err) {
                                logger.apierror(`${currentWiki}: recentchanges returned "${err}" (callRecentChanges)`);
                                return;
                            }

                            data.recentchanges.forEach((edit) => {
                                totalEdits = totalEdits + 1;

                                if (moment().diff(moment.utc(edit.timestamp), "days") < 7) {
                                    wikiLast7Days += 1;
                                }
                            });

                            if (next) {
                                // TODO: Implement proper support (Starg pls fix)
                                if (currentWiki === "ac") {
                                    logger.warn(`STARGPLSFIX: ${currentWiki}: Getting next recent changes page... (${next.rcstart})`);
                                    parameters.rcstart = next.rcstart;
                                } else {
                                    logger.verbose(`${currentWiki}: Getting next recent changes page... (${next.rccontinue})`);
                                    parameters.rccontinue = next.rccontinue;
                                }
                                callRecentChanges();
                            } else {
                                logger.verbose(`${currentWiki}: There are no more recent changes.`);
                                callback("STOP");
                            }
                        });
                    },
                    (err) => {
                        if (err) {
                            wikiLast30Days = totalEdits;
                            updateWikiModel();
                        }
                    }
                );
            }

            callRecentChanges();
        }

        function updateWikiModel() {
            logger.verbose(`${currentWiki}: Saving wiki data (updateWikiModel)`);

            wikiModel.update({
                alias: currentWiki,
                w_name: wikiName
            }, {
                w_pages: wikiPages,
                w_articles: wikiArticles,
                w_edits: wikiEdits,
                w_images: wikiImages,
                w_users: wikiUsers,
                w_activeusers: wikiActiveUsers,
                w_admins: wikiAdmins,
                w_last7: wikiLast7Days,
                w_last30: wikiLast30Days,
                w_age: wikiAge,
                dataLastUpdated: utils.formatDateTimestamp()
            }, {
                upsert: true
            }, (err) => {
                if (err) {
                    logger.mongooseerror(`${currentWiki}: Failed to update wiki data: ${err}`);
                    return;
                }

                logger.verbose(`${currentWiki}: Wiki data successfully saved! Checking...`);
                checkWikiData();
            });
        }

        function checkWikiData() {
            wikiModel.find({
                w_name: wikiName
            }).exec((err) => {
                if (err) {
                    logger.mongooseerror(`${currentWiki}: Failed to check wiki data (checkWikiData): ${err}`);
                    return;
                }

                logger.verbose(`${currentWiki}: Wiki data successfully checked!`);
                cachegoose.clearCache(`${currentWiki}-wikidata`);
                logger.verbose(`${currentWiki}: Wiki data cache cleared!`);
            });
        }

        getWikiInfo();
    }

    updateWiki();
};
