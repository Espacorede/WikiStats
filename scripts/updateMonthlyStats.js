/** ** (c) Espacorede Project ** **/

const async = require("async");
const Bot = require("nodemw");
const cachegoose = require("cachegoose");
const db = require("./mongooseConnect");
const logger = require("./logger");
const moment = require("moment");
const topModel = require("../models/topModel.js");
const utils = require("./utils");

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

module.exports.updateMonthly = (year, month, currentWiki = "tf") => {
    const MWClient = new Bot(`./configs/wikis/${currentWiki}-config.json`);
    const start = moment(`${year}-${month}`, "YYYY-MM").startOf("month").format("YYYY-MM-DDTHH:mm:ss");
    const end = moment(`${year}-${month}`, "YYYY-MM").endOf("month").format("YYYY-MM-DDTHH:mm:ss");

    function getRecentChanges() {
        logger.debug(`${currentWiki}: Searching for recent changes.`);

        const parameters = {
            action: "query",
            list: "recentchanges",
            rcprop: "user|loginfo",
            rcstart: `${start}Z`,
            rcend: `${end}Z`,
            rcdir: "newer",
            rcshow: "!bot",
            rclimit: 500
        };

        const monthlyStats = [];

        function callRecentChanges() {
            logger.verbose(`${currentWiki}: Fetching recent changes...`);

            async.whilst(
                async () => {
                    return true;
                },
                (callback) => {
                    MWClient.api.call(parameters, (err, data, next) => {
                        if (err) {
                            logger.apierror(`${currentWiki}: callRecentChanges returned "${err}")`);
                            callback(err);
                        }

                        if (!data) {
                            logger.apierror(`${currentWiki}: Failed to get data from callRecentChanges`);
                            return;
                        }

                        const userContribs = data.recentchanges;
                        const userContribsLength = data.recentchanges && data.recentchanges.length;

                        logger.verbose(`${currentWiki}: We received ${userContribsLength} contributions for this time period.`);

                        if (userContribsLength > 0) {
                            userContribs.forEach((entry) => {
                                // Ignore bots / blacklisted
                                if (utils.isUserBlacklisted(entry.user)) {
                                    return;
                                }

                                if (monthlyStats.findIndex(u => u.name === entry.user) === -1) {
                                    // console.log("puush!")
                                    monthlyStats.push({
                                        name: entry.user,
                                        contribs: 0, // everything is a contribution
                                        edits: 0, // entry.type "edit" + "new"
                                        editsonly: 0,
                                        editsnew: 0,
                                        uploads: 0,
                                        moves: 0,
                                        deletions: 0,
                                        blocks: 0,
                                        other: 0 // protect, flow, etc.

                                    });
                                }

                                const userIndex = monthlyStats.findIndex(u => u.name === entry.user);

                                // Everything combined
                                monthlyStats[userIndex].contribs = monthlyStats[userIndex].contribs + 1;

                                // Categories
                                if (entry.type === "edit" || entry.type === "new") {
                                    if (entry.type === "edit") {
                                        monthlyStats[userIndex].editsonly = monthlyStats[userIndex].editsonly + 1;
                                    }

                                    if (entry.type === "new") {
                                        monthlyStats[userIndex].editsnew = monthlyStats[userIndex].editsnew + 1;
                                    }

                                    monthlyStats[userIndex].edits = monthlyStats[userIndex].edits + 1;
                                } else if (entry.logtype === "upload") {
                                    monthlyStats[userIndex].uploads = monthlyStats[userIndex].uploads + 1;
                                } else if (entry.logtype === "move") {
                                    monthlyStats[userIndex].moves = monthlyStats[userIndex].moves + 1;
                                } else if (entry.logtype === "delete") {
                                    monthlyStats[userIndex].deletions = monthlyStats[userIndex].deletions + 1;
                                } else if (entry.logtype === "block") {
                                    monthlyStats[userIndex].blocks = monthlyStats[userIndex].blocks + 1;
                                } else {
                                    monthlyStats[userIndex].other = monthlyStats[userIndex].other + 1;
                                }
                            });
                        }

                        if (next) {
                            // TODO: Implement proper support (Starg pls fix)
                            if (currentWiki === "ac") {
                                logger.verbose(`${currentWiki}: Fetching next recent changes page [${next.rcstart}]`);
                                parameters.rcstart = next.rcstart;
                            } else {
                                logger.verbose(`${currentWiki}: Fetching next recent changes page [${next.rccontinue}]`);
                                parameters.rccontinue = next.rccontinue;
                            }
                            callRecentChanges();
                        } else {
                            logger.verbose(`${currentWiki}: There are no more recent changes during this period. Finishing with "NOMOR"...`);
                            callback("NOMOR");
                        }
                    });
                },
                (err) => {
                    if (err) {
                        if (err === "NOMOR") {
                            updateTopModel();
                        } else {
                            logger.error(`We received an error other than "NOMOR" (callRecentChanges): ${err}`);
                        }
                    }
                });
        }

        function updateTopModel() {
            logger.verbose(`${currentWiki}: Updating top data (updateTopModel)`);

            const sortedMonthlyStats = monthlyStats.sort(function (a, b) {
                return b.contribs - a.contribs;
            });

            const slicedMonthlyStats = sortedMonthlyStats.slice(0, 25);

            if (slicedMonthlyStats.length === 0) {
                logger.debug(`${currentWiki}: Not updading top data because slicedMonthlyStats is empty.`);
                return;
            }

            topModel.update({
                wiki: currentWiki,
                month: moment(start).format("MM"),
                year: moment(start).format("YYYY")
            }, {
                $setOnInsert: {
                    start: start,
                    end: end,
                    data: slicedMonthlyStats,
                    dataLastUpdated: utils.formatDateTimestamp()
                }
            }, {
                upsert: true
            }, (err) => {
                if (err) {
                    logger.mongooseerror(`${currentWiki}: Failed to update top data: ${err}`);
                    return;
                }

                logger.verbose(`${currentWiki}: Top data successfully saved! Checking...`);
                checkTopData();
            });
        }

        function checkTopData() {
            topModel.find({
                wiki: currentWiki,
                month: moment(start).format("MM"),
                year: moment(start).format("YYYY")
            }).exec((err) => {
                if (err) {
                    logger.mongooseerror(`${currentWiki}: Failed to check top data (checkTopData): ${err}`);
                    return;
                }

                logger.verbose(`${currentWiki}: Top data successfully checked!`);
                cachegoose.clearCache(`${currentWiki}-top-${moment(start).format("YYYY")}-${moment(start).format("MM")}`);
                logger.verbose(`${currentWiki}: Top data cache cleared!`);
            });
        }

        callRecentChanges();
    }

    getRecentChanges();
};
