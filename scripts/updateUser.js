/** * (c) Espacorede Project * **/

const async = require("async");
const bot = require("nodemw");
const cachegoose = require("cachegoose");
const fs = require("fs");
const logger = require("./logger");
const moment = require("moment");
const userModel = require("../models/userModel");
const WSConfig = require("../configs/wikistats-config.json");
const port = process.env.PORT || WSConfig["port"];
const socket = require("socket.io-client")(`http://localhost:${port}`);

module.exports.getUserInfo = (user, force = 0, sourceWiki = "tf") => {
    let MWClient = new bot(`./configs/wikis/${sourceWiki}-config.json`);

    user = user.trim();
    user = user.charAt(0).toUpperCase() + user.slice(1);

    MWClient.whois(user, (err, userData) => {
        if (err) {
            logger.apierror(`${sourceWiki}: getUserInfo returned "${err}" (whois ${user})`);
            return;
        }
        if (userData.userid) {
            userModel.find({
                u_sourcewiki: sourceWiki,
                u_name: userData.name
            }, "u_edits dataLastUpdated updateComplete", (err, data) => {
                if (err) {
                    logger.mongooseerror(`${sourceWiki}: Failed to search for "${userData.name}" in the database: ${err}`);
                    return;
                }

                let update = false;

                if (!data || !data[0] || force === 2) {
                    update = true;
                } else {
                    if (data.updateComplete !== false) {
                        if (moment(data[0].dataLastUpdated, "x").isBefore(moment(), "days")) {
                            if (!force && data[0]["u_edits"] === userData.editcount) {
                                logger.debug(`${sourceWiki}: User data for "${user}" has been updated recently (u_edits is the same). Aborting...`);
                            } else {
                                update = true;
                            }
                        } else {
                            if (!force && data[0]["u_edits"] === userData.editcount) {
                                logger.debug(`${sourceWiki}: User data for "${user}" has been updated recently (dataLastUpdated is recent and u_edits is the same). Aborting...`);
                            } else {
                                update = true;
                            }
                        }
                    } else {
                        logger.debug(`${sourceWiki}: User "${user}" is already being updated. Aborting...`);
                        return;
                    }
                }

                if (update) {
                    userModel.update({
                        u_sourcewiki: sourceWiki,
                        u_name: userData.name,
                        u_userid: userData.userid,
                    }, {
                        u_registration: userData.registration,
                        u_groups: userData.groups.filter(function (g) {
                            return !userData.implicitgroups.includes(g);
                        }),
                        updateComplete: false,
                    }, {
                        upsert: true
                    }, (err) => {
                        if (err) {
                            logger.mongooseerror(`${sourceWiki}: An error occurred while updating the database for "${user}" (update = true): ${err}`);
                            return;
                        }

                        logger.verbose(`${sourceWiki}: Updating data for "${userData.name}" (#${userData.userid})`);

                        updateRoutine(user, userData.editcount, force, sourceWiki);
                    });
                } else {
                    userModel.update({
                        u_sourcewiki: sourceWiki,
                        u_name: user,
                    }, {
                        dataLastUpdated: moment().format("x")
                    }, {
                        upsert: true
                    }, (err) => {
                        if (err) {
                            logger.mongooseerror(`${sourceWiki}: An error occurred while updating the database for ${user} (update = false): ${err}`);
                            return;
                        }

                        cachegoose.clearCache(`${sourceWiki}user-${user}`);
                    });
                }
            });
        } else {
            userModel.remove({
                u_sourcewiki: sourceWiki,
                u_name: userData.name
            }, function (err) {
                if (!err) {
                    logger.debug(`${sourceWiki}: Removed ${user} from database (missing userid)`);
                    socket.emit("missing", user, sourceWiki);
                }
            });
        }
    });

    function updateRoutine(user, editcount, force, sourceWiki) {
        getUserContribs(user, editcount, force);

        function getUserContribs(user, edits, force = false) {
            logger.debug(`${sourceWiki}: Searching for ${user}'s data.`);
            socket.emit("update", user, sourceWiki);

            let parameters = {
                action: "query",
                list: "usercontribs",
                ucdir: "newer",
                uclimit: 500,
                ucuser: user,
            };

            let parametersLogsBlocks = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                leuser: user,
                letype: "block",
                list: "logevents"
            };

            let parametersLogsDeletions = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                leuser: user,
                letype: "delete",
                list: "logevents"
            };

            let parametersLogsUsersThanked = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                leuser: user,
                letype: "thanks",
                list: "logevents"
            };

            let parametersLogsUserThanks = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                letitle: `User:${user}`,
                letype: "thanks",
                list: "logevents"
            };

            const extensions = require(`../data/extensions/${sourceWiki}.json`)["extensions"];
            const wikiHasThanks = Object.keys(extensions).some((x) => x === "Thanks");

            let uBlocked = 0;
            let uContribs = [];
            let uDeleted = 0;
            let uMinor = 0;
            let uPageCreations = 0;
            let uUploads = 0;
            let uAllUploads = 0;
            let uNameSpaces = {};
            let editedPages = {};
            let uThanked = 0;
            let uThanks = 0;

            function callUserContribs() {
                logger.verbose(`${sourceWiki}: Fetching contributions for "${user}"...`);
                socket.emit("update", user, sourceWiki);

                async.whilst(() => true, (callback) => {
                    MWClient.api.call(parameters, (err, data, next) => {
                        if (err) {
                            logger.apierror(`${sourceWiki}: callUserContribs returned "${err}" (${user})`);
                            callback(err);
                        }

                        if (!data) {
                            logger.apierror(`${sourceWiki}: Failed to get data from callUserContribs (${user})`);
                            return;
                        }

                        let userContribs = data.usercontribs;
                        let userContribsLength = userContribs && userContribs.length;

                        logger.verbose(`${sourceWiki}: We received ${userContribsLength} contributions for "${user}"`);

                        if (userContribsLength > 0) {
                            userContribs.forEach((entry) => {
                                let eNameSpace = entry.ns;
                                let ePageTitle = entry.title;
                                let eTimeStamp = moment.utc(entry.timestamp).format("x");

                                uContribs.push(eTimeStamp);

                                editedPages[ePageTitle] = (editedPages[ePageTitle] || 0) + 1;

                                if (entry.new !== undefined) {
                                    if (entry.ns === 6) {
                                        uUploads = (uUploads || 0) + 1;
                                    } else {
                                        uPageCreations = (uPageCreations || 0) + 1;
                                    }
                                }

                                if (entry.minor !== undefined) {
                                    uMinor = (uMinor || 0) + 1;
                                }

                                // Somamos isso com o uUploads lá em baixo
                                if (entry.comment.includes(`${user} uploaded a new version of`)) {
                                    uAllUploads = (uAllUploads || 0) + 1;
                                }

                                uNameSpaces[eNameSpace] = (uNameSpaces[eNameSpace] || 0) + 1;
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next contributions page for "${user}" [${next.uccontinue}]`);
                            parameters["uccontinue"] = next.uccontinue;
                            callUserContribs();
                        } else {
                            logger.verbose(`${sourceWiki}: There are no more contributions for "${user}". Finishing with "NOMOR"...`);
                            callback("NOMOR");
                        }
                    });
                }, (err) => {
                    if (err) {
                        if (err === "NOMOR") {
                            getUserDeletions();
                        } else {
                            logger.error(`We received an error other than "NOMOR" (callUserContribs): ${err}`);
                            return;
                        }
                    }
                });
            }

            function getUserDeletions() {
                logger.verbose(`${sourceWiki}: Fetching delete events for "${user}"...`);
                socket.emit("update", user, sourceWiki);

                async.whilst(() => true, (callback) => {
                    MWClient.api.call(parametersLogsDeletions, (err, data, next) => {
                        if (err) {
                            logger.apierror(`${sourceWiki}: getUserBlocks returned "${err}" (${user})`);
                            return;
                        }

                        let logEvents = data.logevents;
                        let logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} deletion events for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uDeleted = (uDeleted || 0) + 1;
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next page of deletion events for "${user}" [${next.lecontinue}]`);
                            parametersLogsDeletions["lecontinue"] = next.lecontinue;
                            getUserDeletions();
                        } else {
                            logger.verbose(`${sourceWiki}: There's no more deletion events for "${user}". Finishing with "NOMOR"...`);
                            callback("NOMOR");
                        }
                    });
                }, (err) => {
                    if (err) {
                        if (err === "NOMOR") {
                            getUserBlocks();
                        } else {
                            logger.error(`We received an error other than "NOMOR" (getUserDeletions): ${err}`);
                            return;
                        }
                    }
                });
            }

            function getUserBlocks() {
                logger.verbose(`${sourceWiki}: getting user blocks for "${user}"...`);
                socket.emit("update", user, sourceWiki);

                async.whilst(() => true, (callback) => {
                    MWClient.api.call(parametersLogsBlocks, (err, data, next) => {
                        if (err) {
                            logger.apierror(`${sourceWiki}: getUserBlocks returned "${err}" (${user})`);
                            return;
                        }

                        let logEvents = data.logevents;
                        let logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} block events for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uBlocked = (uBlocked || 0) + 1;
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next page of block events for "${user}" [${next.lecontinue}]`);
                            parametersLogsBlocks["lecontinue"] = next.lecontinue;
                            getUserBlocks();
                        } else {
                            logger.verbose(`${sourceWiki}: There's no more block events for "${user}". Finishing with "NOMOR"...`);
                            callback("NOMOR");
                        }
                    });
                }, (err) => {
                    if (err) {
                        if (err === "NOMOR") {
                            if (wikiHasThanks) {
                                getUsersThanked();
                            } else {
                                updateUserModel();
                            }
                        } else {
                            logger.error(`We received an error other than "NOMOR" (getUserBlocks): ${err}`);
                            return;
                        }
                    }
                });
            }

            function getUsersThanked() {
                logger.verbose(`${sourceWiki}: getting thanks received for "${user}"...`);
                socket.emit("update", user, sourceWiki);

                async.whilst(() => true, (callback) => {
                    MWClient.api.call(parametersLogsUsersThanked, (err, data, next) => {
                        if (err) {
                            logger.apierror(`${sourceWiki}: getUsersThanked returned "${err}" (${user})`);
                            return;
                        }

                        let logEvents = data.logevents;
                        let logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} thanks received for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uThanked = (uThanked || 0) + 1;
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next page of thanks received for "${user}" [${next.lecontinue}]`);
                            parametersLogsUsersThanked["lecontinue"] = next.lecontinue;
                            getUsersThanked();
                        } else {
                            logger.verbose(`${sourceWiki}: There's no more thanks received for "${user}". Finishing with "NOMOR"...`);
                            callback("NOMOR");
                        }
                    });
                }, (err) => {
                    if (err) {
                        if (err === "NOMOR") {
                            getUserThanks();
                        } else {
                            logger.error(`We received an error other than "NOMOR" (getUsersThanked): ${err}`);
                            return;
                        }
                    }
                });
            }

            function getUserThanks() {
                logger.verbose(`${sourceWiki}: getting thanks for "${user}"...`);
                socket.emit("update", user, sourceWiki);

                async.whilst(() => true, (callback) => {
                    MWClient.api.call(parametersLogsUserThanks, (err, data, next) => {
                        if (err) {
                            logger.apierror(`${sourceWiki}: getUserThanks returned "${err}" (${user})`);
                            return;
                        }

                        let logEvents = data.logevents;
                        let logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} thanks for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uThanks = (uThanks || 0) + 1;
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next page of thanks for "${user}" [${next.lecontinue}]`);
                            parametersLogsUserThanks["lecontinue"] = next.lecontinue;
                            getUserThanks();
                        } else {
                            logger.verbose(`${sourceWiki}: There's no more thanks for "${user}". Finishing with "NOMOR"...`);
                            callback("NOMOR");
                        }
                    });
                }, (err) => {
                    if (err) {
                        if (err === "NOMOR") {
                            updateUserModel();
                        } else {
                            logger.error(`We received an error other than "NOMOR" (getUserThanks): ${err}`);
                            return;
                        }
                    }
                });
            }

            function updateUserModel() {
                logger.debug(`${sourceWiki}: Updating data for "${user}" (updateUserModel)`);
                socket.emit("update", user, sourceWiki);

                let maxEdits = Math.max.apply(null, Object.values(editedPages));

                async.filter(Object.keys(editedPages), (x, callback) => {
                    callback(null, (editedPages[x] === maxEdits));
                }, (err, res) => {
                    if (err) {
                        logger.error(`${sourceWiki}: Failed to calculate most edited pages for "${user}" (updateUserModel): ${err}`);
                        return;
                    } else {
                        let uTopPages = res;
                        uTopPages.sort();
                        uTopPages.unshift(editedPages[uTopPages[0]]);

                        let uUniquePages = Object.keys(editedPages).length;

                        userModel.update({
                            u_sourcewiki: sourceWiki,
                            u_name: user,
                        }, {
                            u_contribs: uContribs,
                            u_edits: edits,
                            u_pagecreations: uPageCreations,
                            u_uniquepages: uUniquePages,
                            u_uploads: uUploads,
                            u_alluploads: uAllUploads + uUploads,
                            u_minoredits: uMinor,
                            u_blockcount: uBlocked,
                            u_deletecount: uDeleted,
                            u_namespaceedits: uNameSpaces,
                            u_topeditedpages: uTopPages,
                            u_thanks: uThanks,
                            u_thanked: uThanked,
                            dataLastUpdated: moment().format("x"),
                            updateComplete: true
                        }, {
                            upsert: true
                        }, (err) => {
                            if (err) {
                                logger.mongooseerror(`${sourceWiki}: Failed to update user data for "${user}" (updateUserModel): ${err}`);
                                return;
                            }

                            logger.debug(`${sourceWiki}: User data for "${user}" successfully saved! Checking...`);
                            verifyUserData(user);
                        });
                    }
                });
            }

            let list = require("../data/userqueue.json");

            if (list["users"].some(u => u.name === user && u.wiki === sourceWiki)) {
                if (!force) {
                    logger.debug(`${sourceWiki}: User "${user}" is already being updated. Aborting...`);
                    return;
                }
            } else {
                let update = list["users"];
                update.push({
                    "name": user,
                    "wiki": sourceWiki
                });

                fs.writeFile("./data/userqueue.json", JSON.stringify({
                    users: update
                }, null, 2), (err) => {
                    if (err) {
                        logger.error(`${sourceWiki}: Failed to add user "${user}" to the update queue: ${err}`);
                        return;
                    }

                    logger.verbose(`${sourceWiki}: User "${user}" was added to the update queue.`);
                });
            }

            try {
                callUserContribs();
            } catch (me) {
                logger.error(`${sourceWiki}: There was an unexpected error updating ${user}'s data! Aborting...`);
            } finally {
                userModel.update({
                    u_sourcewiki: sourceWiki,
                    u_name: user,
                }, {
                    updateComplete: true
                }, {
                    upsert: true
                }, (err) => {
                    if (err) {
                        logger.mongooseerror(`${sourceWiki}: Failed to update user data for ${user} (getUserContribs finally): ${err}`);
                        return;
                    }
                    logger.verbose(`${sourceWiki}: updateComplete for user "${user}" set to true.`);
                });
            }
        }

        function verifyUserData(user) {
            let queue = require("../data/userqueue.json");
            let users = queue["users"];

            socket.emit("update", user, sourceWiki);

            userModel.find({
                u_sourcewiki: sourceWiki,
                u_name: user
            }, (err) => {
                if (err) {
                    logger.mongooseerror(`${sourceWiki}: Failed to check user data for "${user}" (checkUserData): ${err}`);
                    return;
                }

                logger.debug(`${sourceWiki}: User data for "${user}" successfully checked!`);

                // Apaga o cache
                cachegoose.clearCache(`${sourceWiki}user-${user}`);

                // Remove o usuário da fila
                users = users.filter(function (u) {
                    return u.name !== user; // && u.wiki !== sourceWiki;
                });

                // Salva a nova fila
                fs.writeFileSync("./data/userqueue.json", JSON.stringify({
                    "users": users
                }, null, 2), (err) => {
                    if (err) {
                        logger.error(`${sourceWiki}: Failed to remove user "${user}" from the update queue: ${err}`);
                        return;
                    }

                    logger.debug(`${sourceWiki}: User "${user}" was removed from the update queue.`);
                });

                socket.emit("load", user, sourceWiki);
            });
        }
    }
};