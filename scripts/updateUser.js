/** ** (c) Espacorede Project ** **/

const async = require("async");
const Bot = require("nodemw");
const cachegoose = require("cachegoose");
const fs = require("fs");
const logger = require("./logger");
const utils = require("./utils");
const moment = require("moment");
const userModel = require("../models/userModel");
const WSConfig = require("../configs/wikistats-config.json");
const port = process.env.PORT || WSConfig.port;
const socket = require("socket.io-client")(`http://localhost:${port}`);

module.exports.getUserInfo = (user, force = 0, sourceWiki = "tf") => {
    const MWClient = new Bot(`./configs/wikis/${sourceWiki}-config.json`);

    user = user.trim();
    user = user.charAt(0).toUpperCase() + user.slice(1);

    MWClient.whois(user, (err, userData) => {
        if (err) {
            logger.apierror(`${sourceWiki}: getUserInfo returned "${err}" (whois ${user})`);
            return;
        }

        if (userData.userid && !utils.isUserDeleted(user)) {
            userModel.find({
                u_sourcewiki: sourceWiki,
                u_name: userData.name
            }, "u_edits u_topeditedpages dataLastUpdated updateComplete", (err, data) => {
                if (err) {
                    logger.mongooseerror(`${sourceWiki}: Failed to search for "${userData.name}" in the database: ${err}`);
                    return;
                }

                let update = false;
                if (!data || !data[0] || force === 2) {
                    update = true;
                } else if (data[0].updateComplete === true) {
                    if (moment(data[0].dataLastUpdated, "x").isBefore(moment(), "days")) {
                        if (!force && data[0].u_edits === userData.editcount) {
                            logger.debug(`${sourceWiki}: User data for "${user}" has been updated recently (u_edits is the same). Aborting...`);
                        } else {
                            update = true;
                        }
                    } else {
                        if (!force && data[0].u_edits === userData.editcount) {
                            logger.debug(`${sourceWiki}: User data for "${user}" has been updated recently (dataLastUpdated is recent and u_edits is the same). Aborting...`);
                        } else {
                            update = true;
                        }
                    }
                } else {
                    if (moment(data[0].dataLastUpdated, "x").isBefore(moment(), "days")) {
                        update = true;
                    } else {
                        logger.debug(`${sourceWiki}: User "${user}" is already being updated. Aborting...`);
                        return;
                    }
                }

                if (update) {
                    userModel.update({
                        u_sourcewiki: sourceWiki,
                        u_name: userData.name,
                        u_userid: userData.userid
                    }, {
                        u_registration: userData.registration,
                        u_groups: userData.groups.filter(function (g) {
                            return !userData.implicitgroups.includes(g);
                        }),
                        dataLastUpdated: utils.formatDateTimestamp(),
                        updateComplete: false
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
                        u_name: user
                    }, {
                        dataLastUpdated: utils.formatDateTimestamp()
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
                    if (utils.isUserDeleted(user)) {
                        logger.debug(`${sourceWiki}: Removed ${user} from database (deleted account)`);
                        socket.emit("deleted", user, sourceWiki);
                    } else {
                        logger.debug(`${sourceWiki}: Removed ${user} from database (missing userid)`);
                        socket.emit("missing", user, sourceWiki);
                    }
                }
            });
        }
    });

    function updateRoutine(user, editcount, force, sourceWiki) {
        getUserContribs(user, editcount, force);

        function getUserContribs(user, edits, force = false) {
            logger.debug(`${sourceWiki}: Searching for ${user}'s data.`);
            socket.emit("update", user, sourceWiki);

            const parameters = {
                action: "query",
                list: "usercontribs",
                ucdir: "newer",
                uclimit: 500,
                ucuser: user,
                ucprop: "ids|title|timestamp|comment|size|flags|sizediff"
            };

            const parametersLogsBlocks = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                leuser: user,
                letype: "block",
                list: "logevents"
            };

            const parametersLogsDeletions = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                leuser: user,
                letype: "delete",
                list: "logevents"
            };

            const parametersLogsUsersThanked = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                leuser: user,
                letype: "thanks",
                list: "logevents"
            };

            const parametersLogsUserThanks = {
                action: "query",
                ledir: "newer",
                lelimit: 500,
                letitle: `User:${user}`,
                letype: "thanks",
                list: "logevents"
            };

            const extensions = require(`../data/extensions/${sourceWiki}.json`).extensions;
            const wikiHasThanks = Object.values(extensions).some((x) => x === "https://www.mediawiki.org/wiki/Extension:Thanks");

            let uBlocked = 0;
            const uContribs = [];
            let uDeleted = 0;
            let uMinor = 0;
            let uPageCreations = 0;
            let uUploads = 0;
            let uAllUploads = 0;
            const uNameSpaces = {};
            const editedPages = {};
            let uThanked = 0;
            let uThanks = 0;
            let uBytes = 0;
            let uBytesBalance = 0;
            let uBiggestEdit = {};
            let uBiggestEditNs0 = {};
            const uLanguages = {};

            function callUserContribs() {
                logger.verbose(`${sourceWiki}: Fetching contributions for "${user}"...`);
                socket.emit("update", user, sourceWiki);

                const wikiCfg = require(`../configs/wikis/${sourceWiki}-config.json`);
                const wikiUrl = `${wikiCfg.protocol}://${wikiCfg.server}${wikiCfg.path === "/" ? "" : wikiCfg.path}`;

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

                        const userContribs = data.usercontribs;
                        const userContribsLength = userContribs && userContribs.length;

                        logger.verbose(`${sourceWiki}: We received ${userContribsLength} contributions for "${user}"`);

                        if (userContribsLength > 0) {
                            userContribs.forEach((entry) => {
                                const eNameSpace = entry.ns;
                                const ePageTitle = entry.title;
                                const eTimeStamp = utils.formatDateTimestamp(entry.timestamp);

                                uContribs.push(eTimeStamp);

                                editedPages[ePageTitle] = (editedPages[ePageTitle] || 0) + 1;

                                if (entry.new !== undefined) {
                                    if (entry.ns === 6 && !(/ ?(move[du]|Redirec(ted|ionamento))/).test(entry.comment)) {
                                        uUploads = (uUploads || 0) + 1;
                                    } else {
                                        uPageCreations = (uPageCreations || 0) + 1;
                                    }
                                }

                                if (entry.minor !== undefined) {
                                    uMinor = (uMinor || 0) + 1;
                                }

                                // Somamos isso com o uUploads lá em baixo
                                if (entry.ns === 6 && (/(uploaded a new version of|carregou uma nova)/).test(entry.comment)) {
                                    uAllUploads = (uAllUploads || 0) + 1;
                                }

                                // Verificamos se o título tem um código de idioma
                                // Somente no namespace principal, não vale a pena contar edits em sandboxes...
                                // ... ou páginas do tipo
                                const regexLanguage = new RegExp(/(\/([a-z]{2}(?:-[A-Z]{2,4})?))$/, ["i"]).exec(ePageTitle);
                                if (entry.ns === 0 && regexLanguage !== null) {
                                    uLanguages[regexLanguage[2]] = (uLanguages[regexLanguage[2]] || 0) + 1;
                                }

                                uNameSpaces[eNameSpace] = (uNameSpaces[eNameSpace] || 0) + 1;

                                if (entry.sizediff) {
                                    uBytes += Math.abs(entry.sizediff);
                                    uBytesBalance += entry.sizediff;

                                    if (!uBiggestEdit.size || entry.sizediff > uBiggestEdit.size) {
                                        uBiggestEdit = {
                                            title: ePageTitle,
                                            link: `${wikiUrl}/index.php?title=${encodeURIComponent(ePageTitle)}&oldid=${entry.revid}`,
                                            size: entry.sizediff
                                        };
                                    }

                                    // Mesma coisa que o de cima, só que só para o namespace principal
                                    // Sugerido por Jan - 2020
                                    if (entry.ns === 0 && (!uBiggestEditNs0.size || entry.sizediff > uBiggestEditNs0.size)) {
                                        uBiggestEditNs0 = {
                                            title: ePageTitle,
                                            link: `${wikiUrl}/index.php?title=${encodeURIComponent(ePageTitle)}&oldid=${entry.revid}`,
                                            size: entry.sizediff
                                        };
                                    }
                                }
                            });
                        }

                        if (next) {
                            // TODO: Starg pls fix
                            if (sourceWiki === "ac") {
                                logger.warn(`STARGPLSFIX: ${sourceWiki}: Fetching next contributions page for "${user}" [${next.ucstart}]`);
                                parameters.ucstart = next.ucstart;
                            } else {
                                logger.verbose(`${sourceWiki}: Fetching next contributions page for "${user}" [${next.uccontinue}]`);
                                parameters.uccontinue = next.uccontinue;
                            }
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

                        const logEvents = data.logevents;
                        const logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} deletion events for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uDeleted = (uDeleted || 0) + 1;
                            });
                        }

                        if (next) {
                            // TODO: Implement proper support (Starg pls fix)
                            if (sourceWiki === "ac") {
                                logger.warn(`STARGPLSFIX: ${sourceWiki}: Fetching next page of deletion events for "${user}" [${next.lestart}]`);
                                parametersLogsDeletions.lestart = next.lestart;
                            } else {
                                logger.verbose(`${sourceWiki}: Fetching next page of deletion events for "${user}" [${next.lecontinue}]`);
                                parametersLogsDeletions.lecontinue = next.lecontinue;
                            }
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

                        const logEvents = data.logevents;
                        const logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} block events for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uBlocked = (uBlocked || 0) + 1;
                            });
                        }

                        if (next) {
                            // TODO: Implement proper support (Starg pls fix)
                            if (sourceWiki === "ac") {
                                logger.warn(`STARGPLSFIX: ${sourceWiki}: Fetching next page of deletion events for "${user}" [${next.lestart}]`);
                                parametersLogsBlocks.lestart = next.lestart;
                            } else {
                                logger.verbose(`${sourceWiki}: Fetching next page of block events for "${user}" [${next.lecontinue}]`);
                                parametersLogsBlocks.lecontinue = next.lecontinue;
                            }
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

                        const logEvents = data.logevents;
                        const logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} thanks received for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(() => {
                                uThanked = (uThanked || 0) + 1;
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next page of thanks received for "${user}" [${next.lecontinue}]`);
                            parametersLogsUsersThanked.lecontinue = next.lecontinue;
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

                        const logEvents = data.logevents;
                        const logEventsLength = logEvents && logEvents.length;

                        logger.verbose(`${sourceWiki}: We received ${logEventsLength} thanks for "${user}"`);

                        if (logEventsLength > 0) {
                            logEvents.forEach(t => {
                                // weapon of mass destruction
                                if (t.user !== "KaliEestiLinux") {
                                    uThanks = (uThanks || 0) + 1;
                                }
                            });
                        }

                        if (next) {
                            logger.verbose(`${sourceWiki}: Fetching next page of thanks for "${user}" [${next.lecontinue}]`);
                            parametersLogsUserThanks.lecontinue = next.lecontinue;
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
                        }
                    }
                });
            }

            function updateUserModel() {
                logger.debug(`${sourceWiki}: Updating data for "${user}" (updateUserModel)`);
                socket.emit("update", user, sourceWiki);

                const maxEdits = Math.max.apply(null, Object.values(editedPages));

                async.filter(Object.keys(editedPages), (x, callback) => {
                    callback(null, (editedPages[x] === maxEdits));
                }, (err, res) => {
                    if (err) {
                        logger.error(`${sourceWiki}: Failed to calculate most edited pages for "${user}" (updateUserModel): ${err}`);
                    } else {
                        const topEdits = res;
                        // topEdits.sort();
                        const topFour = topEdits.splice(0, 5);
                        const uTopPages = {
                            pages: topFour,
                            count: editedPages[topFour[0]],
                            remainder: topEdits.length
                        };

                        const uUniquePages = Object.keys(editedPages).length;

                        userModel.update({
                            u_sourcewiki: sourceWiki,
                            u_name: user
                        }, {
                            u_contribs: uContribs,
                            u_edits: edits,
                            u_editsws: uContribs.length - (uUploads + uPageCreations),
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
                            u_bytes: uBytes,
                            u_bytesbalance: uBytesBalance,
                            u_biggestedit: uBiggestEdit,
                            u_biggesteditns0: uBiggestEditNs0,
                            u_languagedits: uLanguages,
                            dataLastUpdated: utils.formatDateTimestamp(),
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

            fs.readFileSync("./data/userqueue.json", (err, data) => {
                if (err) {
                    logger.error(`${sourceWiki}: Failed to read user queue: ${err}`);
                }
                const list = JSON.parse(data);
                if (list.users.some(u => u.name === user && u.wiki === sourceWiki)) {
                    if (!force) {
                        logger.debug(`${sourceWiki}: User "${user}" is already being updated. Aborting...`);
                    }
                } else {
                    const update = list.users;
                    update.push({
                        name: user,
                        wiki: sourceWiki
                    });

                    fs.writeFileSync("./data/userqueue.json", JSON.stringify({
                        users: update
                    }), (err) => {
                        if (err) {
                            logger.error(`${sourceWiki}: Failed to add user "${user}" to the update queue: ${err}`);
                            return;
                        }

                        logger.verbose(`${sourceWiki}: User "${user}" was added to the update queue.`);
                    });
                }
            });

            try {
                callUserContribs();
            } catch (me) {
                logger.error(`${sourceWiki}: There was an unexpected error updating ${user}'s data! Aborting...`);
                logger.verbose(me);
            } finally {
                userModel.update({
                    u_sourcewiki: sourceWiki,
                    u_name: user
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

                fs.readFileSync("./data/userqueue.json", (err, data) => {
                    if (err) {
                        logger.error(`${sourceWiki}: Failed to read user queue: ${err}`);
                    }
                    const queue = JSON.parse(data);
                    let users = queue.users;

                    // Remove o usuário da fila
                    users = users.filter(function (u) {
                        return u.name !== user; // && u.wiki !== sourceWiki;
                    });

                    // Salva a nova fila
                    fs.writeFileSync("./data/userqueue.json", JSON.stringify({
                        users: users
                    }), (err) => {
                        if (err) {
                            logger.error(`${sourceWiki}: Failed to remove user "${user}" from the update queue: ${err}`);
                            return;
                        }

                        logger.debug(`${sourceWiki}: User "${user}" was removed from the update queue.`);
                    });
                });

                socket.emit("load", user, sourceWiki);
            }
        }

        function verifyUserData(user) {
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
            });
        }
    }
};
