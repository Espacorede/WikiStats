/** * (c) Espacorede Project * **/

const fs = require("fs");
const moment = require("moment");
const logger = require("./logger");
const utils = require("./utils");

module.exports.processUser = (data) => {
    let user = utils.returnCleanUsername(data.u_name);

    logger.debug(`${data.u_sourcewiki}: Processing data for "${user}"...`);

    if (!fs.existsSync("./data/processqueue.json") || !fs.statSync("./data/processqueue.json").size) {
        logger.verbose("Creating processqueue.json...");

        try {
            fs.writeFileSync("./data/processqueue.json", JSON.stringify({ users: [{ user: user, wiki: data.u_sourcewiki }] }, null, 2));
            logger.verbose(`${data.u_sourcewiki}: processqueue.json created with "${user}"`);
        } catch (err) {
            logger.error(`${data.u_sourcewiki}: Failed to create processqueue.json with "${user}": ${err}`);
            return;
        }
    } else {
        let queue = require("../data/processqueue.json").users;

        if (queue.includes(user)) {
            logger.error(`${data.u_sourcewiki}: User "${user}" is already being processed.`);
            return;
        } else {
            logger.verbose(`${data.u_sourcewiki}: Adding "${user}" to the processing queue...`);
            queue.push({ user: user, wiki: data.u_sourcewiki });

            try {
                fs.writeFileSync("./data/processqueue.json", JSON.stringify({ users: queue }, null, 2));
                logger.verbose(`${data.u_sourcewiki}: User "${user}" was added to the processing queue!`);
            } catch (err) {
                logger.error(`${data.u_sourcewiki}: Failed to add "${user}" to the processing queue: ${err}`);
                return;
            }
        }
    }

    try {
        let last7DaysEdits = 0;
        let last30DaysEdits = 0;
        let last6MonthsEdits = 0;
        let lastYearEdits = 0;
        let longestStreak = {};
        let streak = {};
        let currentStreak = {};
        let contributionsDictionary = {};
        let contributionsByDay = [];
        let contributionsWeekAndHour = [
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

        let userEdits = data.u_contribs.length;

        let streakIsLongest = () => (streak.end &&
         longestStreak.end.diff(longestStreak.start, "days") <
         streak.end.diff(streak.start, "days"));

        let checkCurrentStreak = () => {
            if (moment.utc().diff(streak.end, "days") < 2) {
                currentStreak = Object.assign({}, streak);
            }
        };

        let convertStreakToString = (streak) => {
            streak.start = streak.start._d;
            streak.end = streak.end._d;
        };

        let addDate = (contributionDate) => {
            let previousDate = moment.utc(contributionDate.date);
            let yearNumber = moment.utc().year() - previousDate.year();

            if (!contributionsByDay[yearNumber]) {
                contributionsByDay[yearNumber] = {};
            }

            if (!contributionsByDay[yearNumber][previousDate.month()]) {
                contributionsByDay[yearNumber][previousDate.month()] = {};
            }
            contributionsByDay[yearNumber][previousDate.month()][previousDate.date()] = contributionDate.contribs;
        };

        for (let element of data.u_contribs) {
            let contributionDate = moment.utc(element, "x");

            // Convert date
            let date = contributionDate.format("DD-MM-YYYY");

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

            let contributionHour = Number(contributionDate.format("HH"));
            let contributionWeekDay = contributionDate.format("e");

            contributionsWeekAndHour[contributionWeekDay][contributionHour] = (contributionsWeekAndHour[contributionWeekDay][contributionHour] || 0) + 1;

            let contributionYear = contributionDate.format("YYYY") - 2010;
            let contributionMonth = Number(contributionDate.format("M")) - 1;

            if (!contributionsByYearAndMonth[contributionYear]) {
                contributionsByYearAndMonth[contributionYear] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            }

            contributionsByYearAndMonth[contributionYear][contributionMonth] = contributionsByYearAndMonth[contributionYear][contributionMonth] + 1;

            let lastEditDateMoments = {};

            lastEditDateMoments.current = moment(contributionDate.format("DD-MM-YYYY"), "DD-MM-YYYY");

            if (previousDate) {
                lastEditDateMoments.last = moment(previousDate.date.format("DD-MM-YYYY"), "DD-MM-YYYY");
            }

            let dateDifference = lastEditDateMoments.last ? lastEditDateMoments.current.diff(lastEditDateMoments.last, "day") : 0;

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
            if (streak) {
                longestStreak = Object.assign({}, streak);
            }
        }

        let longestStreakCount = utils.formatNumber(longestStreak.end ? longestStreak.end.diff(longestStreak.start, "day") + 1 : 0);
        let currentStreakCount = utils.formatNumber(currentStreak.end ? currentStreak.end.diff(currentStreak.start, "day") + 1 : 0);

        convertStreakToString(longestStreak);
        if (currentStreak.end) {
            convertStreakToString(currentStreak);
        }

        let mostEditsOnASingleDay = Object.keys(contributionsDictionary).reduce((a, b) => contributionsDictionary[a] > contributionsDictionary[b] ? a : b);

        let registrationInDays = moment().diff(moment(data.u_registration, "YYYYMMDD"), "days");

        while (contributionsByYearAndMonth.length < moment.utc().year() - 2009) {
            contributionsByYearAndMonth.push(null);
        }

        for (let i = 0; i < contributionsByYearAndMonth.length; i += 1) {
            if (contributionsByYearAndMonth[i] !== undefined) {
                contributionsByYearAndMonth = contributionsByYearAndMonth.slice(i);
                break;
            }
        }

        // Name color
        let bots = require(`../data/lists/${data.u_sourcewiki}-bots.json`);

        let classes = ["user-normal"];
        let staffMembers = require(`../data/lists/${data.u_sourcewiki}-staff.json`);

        if (staffMembers["users"].some(u => u.name === data.u_name && u.note === "current")) {
            classes.push("user-staff");
        }

        let namespaceEdits = {};

        let namespaces = require(`../data/namespaces/${data.u_sourcewiki}.json`)["namespaces"];
        let userNamespaceEdits = data.u_namespaceedits[0];

        for (let number in userNamespaceEdits) {
            let namespaceData = namespaces[number];

            if (!userNamespaceEdits[number]) {
                continue;
            }

            if (namespaceData) {
                namespaceEdits[namespaceData["*"] || "Main"] = userNamespaceEdits[number];
            }
            else {
                namespaceEdits["Other"] = (namespaceEdits["Other"] || 0) + userNamespaceEdits[number];
            }
        }

        if (bots["users"].some(u => u.name === data.u_name)) {
            classes.push("user-bot");
        }

        if (data.u_sourcewiki === "tf") {
            let capUsers = require("../data/lists/tf-wikicap.json");
            let valve = require("../data/lists/tf-valve.json");

            valve["users"].includes(data.u_name) ? classes.push("user-valve") : "";

            if (capUsers["users"].some(u => u.name === data.u_name)) {
                classes.push("user-wikicap");
            }
        }

        let wikiConfig = require(`../configs/wikis/${data.u_sourcewiki}-config.json`);
        let wikiUrl = `https://${wikiConfig["server"]}`;
        let wikiPath = `${wikiUrl}${wikiConfig["path"] === "/w" ? "/w/" : wikiConfig["path"]}`;
        let oddPath = data.u_sourcewiki === "tf" || data.u_sourcewiki === "portal" ? "wiki/" : "";
        let encodedUsername = encodeURIComponent(data.u_name);
        let isExpensive = userEdits > 10000;
        let out = {
            uWiki: data.u_sourcewiki,
            uName: data.u_name,
            uHasRights: (data.u_deletecount !== 0),
            uTotalEdits: utils.formatNumber(userEdits),
            uTotalEditsMinusCreations: utils.formatNumber(userEdits - (data.u_pagecreations + data.u_uploads)),
            uPagesCreated: utils.formatNumber(data.u_pagecreations),
            uUploads: utils.formatNumber(data.u_uploads),
            uUploadsPlusNewVersions: utils.formatNumber(data.u_alluploads),
            uMinorEdits: utils.formatNumber(data.u_minoredits),
            uSingleDayOverall: utils.formatNumber(contributionsDictionary[mostEditsOnASingleDay]),
            uSingleDayOverallDate: moment(mostEditsOnASingleDay, "DD-MM-YYYY").fromNow(),
            uSingleDayOverallDateTip: moment(mostEditsOnASingleDay, "DD-MM-YYYY").format("D MMMM YYYY"),
            uBlockCount: utils.formatNumber(data.u_blockcount),
            uDeleteCount: utils.formatNumber(data.u_deletecount),
            uNSEdits: namespaceEdits,
            uEditsLast30: utils.formatNumber(last30DaysEdits),
            uEditsLast7: utils.formatNumber(last7DaysEdits),
            uEditsLast6Months: utils.formatNumber(last6MonthsEdits),
            uEditsLastYear: utils.formatNumber(lastYearEdits),
            uEditsAllTime: registrationInDays <= 0 ? utils.formatNumber(userEdits) : (userEdits / registrationInDays).toFixed(2),
            uRegistration: moment(data.u_registration).format("D MMMM YYYY"),
            uRegistrationFromNow: moment(data.u_registration, "YYYYMMDD").fromNow(),
            uRegistrationFromNowDays: registrationInDays,
            uStreak: longestStreak,
            uStreakCount: longestStreakCount,
            uStreakCurrent: currentStreak,
            uStreakCountCurrent: currentStreakCount,
            uPagesEdited: utils.formatNumber(data.u_uniquepages),
            uTopPages: data.u_topeditedpages.slice(1),
            uTopPageCount: utils.formatNumber(data.u_topeditedpages[0]),
            uClass: classes[1] ? classes[1] : classes[0],
            uIsExpensive: isExpensive,
            uThanksGiven: data.u_thanked ? utils.formatNumber(data.u_thanked) : 0,
            uThanksReceived: data.u_thanks ? utils.formatNumber(data.u_thanks) : 0,
            cContribsByDate: contributionsByDay,
            cContribsWeekAndHour: contributionsWeekAndHour,
            cContribsByYM: contributionsByYearAndMonth,
            wSpecialContributions: `${wikiPath}index.php?title=Special%3AContributions&contribs=user&target=${encodedUsername}`,
            wFiles: `${wikiUrl}/${oddPath}Special:ListFiles?limit=50&ilsearch=&user=${encodedUsername}&ilshowall=1`,
            wLinks: `${wikiPath}index.php?title=`,
        };

        logger.debug(`${data.u_sourcewiki}: User data for "${data.u_name}" successfully processed!`);
        logger.verbose(require("util").inspect(out));

        if (isExpensive) {
            out.processDate = new Date().getTime();
            let directory = `./data/expensiveusers/${data.u_sourcewiki}`;
            if (!fs.existsSync(directory)) {
                fs.mkdirSync(directory);
            }
            fs.writeFile(`${directory}/${data.u_name}.json`,
                JSON.stringify(out, null, 4), (err) => {
                    if (err) {
                        logger.error(`${data.u_sourcewiki}: Error saving ${data.u_name}.json:\n${err}`);
                    }
                });
        }
        return out;
    } finally {
        let remove = require("../data/processqueue.json").users;
        let index = remove.indexOf(user);

        if (index !== -1) {
            logger.verbose(`${data.u_sourcewiki}: Removing "${user}" from the processing queue...`);
            remove.splice(index, 1);

            try {
                fs.writeFileSync("./data/processqueue.json", JSON.stringify({ users: remove }, null, 2));
                logger.verbose(`${data.u_sourcewiki}: User "${user}" was removed from the processing queue!`);
            } catch (err) {
                logger.error(`${data.u_sourcewiki}: Failed to remove "${user}" from the processing queue: ${err}`);
            //return;
            }
        }
    }
};