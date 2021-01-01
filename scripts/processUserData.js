/** ** (c) Espacorede Project ** **/

const fs = require("fs");
const moment = require("moment");
const logger = require("./logger");
const utils = require("./utils");

module.exports.processUser = (data) => {
    const user = utils.returnCleanUsername(data.u_name);

    if (utils.isUserDeleted(user)) {
        logger.warn(`${data.u_sourcewiki}: Failed to process data for "${user}": account is deleted`);
        return;
    } else {
        logger.debug(`${data.u_sourcewiki}: Processing data for "${user}"...`);
    }

    if (!fs.existsSync("./data/processqueue.json") || !fs.statSync("./data/processqueue.json").size) {
        logger.verbose("Creating processqueue.json...");

        try {
            fs.writeFileSync("./data/processqueue.json", JSON.stringify({
                users: [{
                    user: user,
                    wiki: data.u_sourcewiki
                }]
            }, null));
            logger.verbose(`${data.u_sourcewiki}: processqueue.json created with "${user}"`);
        } catch (err) {
            logger.error(`${data.u_sourcewiki}: Failed to create processqueue.json with "${user}": ${err}`);
            return;
        }
    } else {
        fs.readFileSync("./data/processqueue.json", (err, data) => {
            if (err) {
                logger.error(`${data.u_sourcewiki}: Failed to read process queue: ${err}`);
            }
            const queue = JSON.parse(data).users;
            if (queue.includes(user)) {
                logger.error(`${data.u_sourcewiki}: User "${user}" is already being processed.`);
            } else {
                logger.verbose(`${data.u_sourcewiki}: Adding "${user}" to the processing queue...`);
                queue.push({
                    user: user,
                    wiki: data.u_sourcewiki
                });

                try {
                    fs.writeFileSync("./data/processqueue.json", JSON.stringify({
                        users: queue
                    }, null));
                    logger.verbose(`${data.u_sourcewiki}: User "${user}" was added to the processing queue!`);
                } catch (err) {
                    logger.error(`${data.u_sourcewiki}: Failed to add "${user}" to the processing queue: ${err}`);
                }
            }
        });
    }

    try {
        let last7DaysEdits = 0;
        let last30DaysEdits = 0;
        let last6MonthsEdits = 0;
        let lastYearEdits = 0;
        let longestStreak = {};
        const streak = {};
        let currentStreak = {};
        const contributionsDictionary = {};
        const contributionsByDay = [];
        const contributionsWeekAndHour = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
        let contributionsByYearAndMonth = [];

        let previousDate;

        const userEdits = data.u_contribs.length;

        const streakIsLongest = () => (streak.end &&
            longestStreak.end.diff(longestStreak.start, "days") <
            streak.end.diff(streak.start, "days"));

        const checkCurrentStreak = () => {
            if (moment.utc().diff(streak.end, "days") < 2) {
                currentStreak = Object.assign({}, streak);
            }
        };

        const convertStreakToString = (streak) => {
            streak.start = streak.start._d;
            streak.end = streak.end._d;
        };

        const addDate = (contributionDate) => {
            const previousDate = moment.utc(contributionDate.date);
            const yearNumber = moment.utc().year() - previousDate.year();

            if (!contributionsByDay[yearNumber]) {
                contributionsByDay[yearNumber] = {};
            }

            if (!contributionsByDay[yearNumber][previousDate.month()]) {
                contributionsByDay[yearNumber][previousDate.month()] = {};
            }

            contributionsByDay[yearNumber][previousDate.month()][previousDate.date()] = contributionDate.contribs;
        };

        for (const element of data.u_contribs) {
            const contributionDate = moment.utc(element, "x");

            // Convert date
            const date = contributionDate.format("DD-MM-YYYY");

            if (previousDate && date !== previousDate.dateFmt) {
                addDate(previousDate);
            }

            contributionsDictionary[date] = (contributionsDictionary[date] || 0) + 1;

            if (moment().diff(contributionDate, "weeks") < 1) {
                last7DaysEdits += 1;
            }

            if (moment().diff(contributionDate, "months") < 1) {
                last30DaysEdits += 1;
            }

            if (moment().diff(contributionDate, "months") < 6) {
                last6MonthsEdits += 1;
            }

            if (moment().diff(contributionDate, "years") < 1) {
                lastYearEdits += 1;
            }

            const contributionHour = Number(contributionDate.format("HH"));
            const contributionWeekDay = contributionDate.format("e");

            contributionsWeekAndHour[contributionWeekDay][contributionHour] = (contributionsWeekAndHour[contributionWeekDay][contributionHour] || 0) + 1;

            const contributionYear = contributionDate.format("YYYY") - 2010;
            const contributionMonth = Number(contributionDate.format("M")) - 1;

            if (!contributionsByYearAndMonth[contributionYear]) {
                contributionsByYearAndMonth[contributionYear] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }

            contributionsByYearAndMonth[contributionYear][contributionMonth] = contributionsByYearAndMonth[contributionYear][contributionMonth] + 1;

            const lastEditDateMoments = {};

            lastEditDateMoments.current = moment(contributionDate.format("DD-MM-YYYY"), "DD-MM-YYYY");

            if (previousDate) {
                lastEditDateMoments.last = moment(previousDate.date.format("DD-MM-YYYY"), "DD-MM-YYYY");
            }

            const dateDifference = lastEditDateMoments.last ? lastEditDateMoments.current.diff(lastEditDateMoments.last, "day") : 0;

            if (dateDifference) {
                if (!streak.start) {
                    streak.start = lastEditDateMoments.last;
                }

                if (dateDifference <= 1) {
                    streak.end = lastEditDateMoments.current;
                    checkCurrentStreak();
                } else if (dateDifference > 1) {
                    streak.start = lastEditDateMoments.current;
                    streak.end = undefined;
                }

                if (!longestStreak.end || !longestStreak.start ||
                    streakIsLongest()) {
                    longestStreak = Object.assign({}, streak);
                }
            }

            previousDate = {
                date: contributionDate,
                dateFmt: date,
                contribs: contributionsDictionary[date]
            };
        }

        addDate(previousDate);

        if (!streak.start) {
            streak.start = moment(previousDate.date.format("DD-MM-YYYY"), "DD-MM-YYYY");
        }

        if (!streak.end) {
            streak.end = moment(previousDate.date.format("DD-MM-YYYY"), "DD-MM-YYYY");
        }
        checkCurrentStreak();

        if (!longestStreak.start || !longestStreak.end || streakIsLongest()) {
            longestStreak = Object.assign({}, streak);
        }

        const longestStreakCount = utils.formatNumber(longestStreak.end ? longestStreak.end.diff(longestStreak.start, "day") + 1 : 0);
        const currentStreakCount = utils.formatNumber(currentStreak.end ? currentStreak.end.diff(currentStreak.start, "day") + 1 : 0);

        convertStreakToString(longestStreak);

        if (currentStreak.end) {
            convertStreakToString(currentStreak);
        }

        const mostEditsOnASingleDay = Object.keys(contributionsDictionary).reduce((a, b) => contributionsDictionary[a] > contributionsDictionary[b] ? a : b);

        const registrationInDays = moment().diff(moment(data.u_registration, "YYYYMMDD"), "days");

        while (contributionsByYearAndMonth.length < moment.utc().year() - 2009) {
            contributionsByYearAndMonth.push(null);
        }

        for (let i = 0; i < contributionsByYearAndMonth.length; i += 1) {
            if (contributionsByYearAndMonth[i] !== undefined) {
                contributionsByYearAndMonth = contributionsByYearAndMonth.slice(i);
                break;
            }
        }

        // Namespace edits
        const namespaceEdits = {};
        const namespaces = require(`../data/namespaces/${data.u_sourcewiki}.json`).namespaces;
        const userNamespaceEdits = data.u_namespaceedits[0];

        for (const number in userNamespaceEdits) {
            const namespaceData = namespaces[number];

            if (!userNamespaceEdits[number]) {
                continue;
            }

            namespaceEdits[namespaceData || "Main"] = userNamespaceEdits[number];
        }

        const wikiConfig = require(`../configs/wikis/${data.u_sourcewiki}-config.json`);
        const wikiUrl = `https://${wikiConfig.server}`;
        const wikiPath = `${wikiUrl}${wikiConfig.path === "/w" ? "/w/" : wikiConfig.path}`;
        const oddPath = data.u_sourcewiki === "tf" || data.u_sourcewiki === "portal" ? "wiki/" : "";
        const encodedUsername = encodeURIComponent(data.u_name);
        const isExpensive = require(`../data/lists/${data.u_sourcewiki}-bots.json`).users.some(u => u.name === data.u_name) || userEdits > 10000;

        const wikiExtensions = require(`../data/extensions/${data.u_sourcewiki}.json`);
        const wikiHasThanks = Object.values(wikiExtensions.extensions).some((x) => x === "https://www.mediawiki.org/wiki/Extension:Thanks");

        const topPages = data.u_topeditedpages;

        const achievements = require("../data/achievements.json").achievements;

        const userAchievements = [];

        const lvls = ["platinum", "gold", "silver", "bronze", "tin"];

        for (const achievement of achievements) {
            let src = data[achievement.source];

            if (Array.isArray(src)) {
                src = src.length;
            }

            for (const lvl of lvls) {
                const count = achievement[lvl];
                if (count) {
                    if (src >= count) {
                        userAchievements.push(`${achievement.id}-${lvl}`);
                        continue;
                    }
                } else {
                    continue;
                }
            }
        }

        const out = {
            uWiki: data.u_sourcewiki,
            uName: data.u_name,
            uHasRights: (data.u_deletecount !== 0),
            uTotalEditsMediaWiki: utils.formatNumber(data.u_edits),
            uTotalEdits: utils.formatNumber(userEdits),
            uTotalEditsMinusCreations: utils.formatNumber(data.u_editsws),
            uPagesCreated: utils.formatNumber(data.u_pagecreations),
            uUploads: utils.formatNumber(data.u_uploads),
            uUploadsPlusNewVersions: utils.formatNumber(data.u_alluploads),
            uMinorEdits: utils.formatNumber(data.u_minoredits),
            uSingleDayOverall: utils.formatNumber(contributionsDictionary[mostEditsOnASingleDay]),
            uSingleDayOverallDate: moment(mostEditsOnASingleDay, "DD-MM-YYYY").fromNow(),
            uSingleDayOverallDateTip: moment(mostEditsOnASingleDay, "DD-MM-YYYY").format("MMMM D, YYYY"),
            uBlockCount: utils.formatNumber(data.u_blockcount),
            uDeleteCount: utils.formatNumber(data.u_deletecount),
            uNSEdits: namespaceEdits,
            uEditsLast30: utils.formatNumber(last30DaysEdits),
            uEditsLast7: utils.formatNumber(last7DaysEdits),
            uEditsLast6Months: utils.formatNumber(last6MonthsEdits),
            uEditsLastYear: utils.formatNumber(lastYearEdits),
            uEditsAllTime: registrationInDays <= 0 ? utils.formatNumber(data.u_editsws) : (data.u_editsws / registrationInDays).toFixed(2),
            uRegistration: moment(data.u_registration).format("MMMM D, YYYY"),
            uRegistrationFromNow: moment(data.u_registration, "YYYYMMDD").fromNow(),
            uRegistrationFromNowDays: registrationInDays,
            uStreak: longestStreak,
            uStreakCount: longestStreakCount,
            uStreakCurrent: currentStreak,
            uStreakCountCurrent: currentStreakCount,
            uPagesEdited: utils.formatNumber(data.u_uniquepages),
            uTopPages: topPages.pages || [],
            uTopPagesRemainder: topPages.remainder,
            uTopPageCount: topPages.count ? utils.formatNumber(topPages.count) : 0,
            uClass: utils.getUserClasses(data.u_sourcewiki, user, true),
            uIsExpensive: isExpensive,
            uThanksGiven: data.u_thanked ? utils.formatNumber(data.u_thanked) : 0,
            uThanksReceived: data.u_thanks ? utils.formatNumber(data.u_thanks) : 0,
            uBytes: data.u_bytes ? utils.formatNumber(data.u_bytes) : 0,
            uBytesBalance: data.u_bytesbalance ? utils.formatNumber(data.u_bytesbalance) : 0,
            uBiggestEdit: data.u_biggestedit,
            uBiggestEditNs0: data.u_biggesteditns0,
            uAchievements: userAchievements,
            uLanguages: data.u_languagedits[0],
            cContribsByDate: contributionsByDay,
            cContribsWeekAndHour: contributionsWeekAndHour,
            cContribsByYM: contributionsByYearAndMonth,
            wSpecialContributions: `${wikiPath}index.php?title=Special%3AContributions&contribs=user&target=${encodedUsername}`,
            wFiles: `${wikiUrl}/${oddPath}Special:ListFiles?limit=50&ilsearch=&user=${encodedUsername}&ilshowall=1`,
            wLinks: `${wikiPath}index.php?title=`,
            wThanks: wikiHasThanks
        };

        logger.debug(`${data.u_sourcewiki}: User data for "${data.u_name}" successfully processed!`);
        // logger.verbose(require("util").inspect(out));

        if (isExpensive) {
            out.processDate = utils.formatDateTimestamp();
            const directory = `./data/expensiveusers/${data.u_sourcewiki}`;

            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory);
            }

            fs.writeFile(`${directory}/${data.u_name}.json`,
                JSON.stringify(out), (err) => {
                    if (err) {
                        logger.error(`${data.u_sourcewiki}: Error saving ${data.u_name}.json:\n${err}`);
                    }
                });
        }

        return out;
    } finally {
        fs.readFileSync("./data/processqueue.json", (err, data) => {
            if (err) {
                logger.error(`${data.u_sourcewiki}: Failed to read process queue: ${err}`);
            }
            const remove = JSON.parse(data).users;
            const index = remove.indexOf(user);

            if (index !== -1) {
                logger.verbose(`${data.u_sourcewiki}: Removing "${user}" from the processing queue...`);
                remove.splice(index, 1);

                try {
                    fs.writeFileSync("./data/processqueue.json", JSON.stringify({
                        users: remove
                    }));
                    logger.verbose(`${data.u_sourcewiki}: User "${user}" was removed from the processing queue!`);
                } catch (err) {
                    logger.error(`${data.u_sourcewiki}: Failed to remove "${user}" from the processing queue: ${err}`);
                }
            }
        });
    }
};
