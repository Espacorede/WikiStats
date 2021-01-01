/** ** (c) Espacorede Project ** **/

const wikis = require("../configs/wikis/wikis.json");

function generateRandomErrorMessage() {
    const messages = [
        // Pauling
        "Crap! The Administrator is going to kill me. — Miss Pauling",
        "S'okay. We'll get them next time. — Miss Pauling",
        "Let's uh...call this a learning experience? — Miss Pauling",
        "Hey, sometimes we have to walk away. — Miss Pauling",
        "Looks like I'll have to shunt this around somewhere else... — Miss Pauling",
        "Well, we can't win them all. — Miss Pauling",
        "Hmm. Well maybe next time. — Miss Pauling",
        // Administrator
        "We failed. We failed Saxton Hale! We failed everyone... — The Administrator",
        "Nobody! Try to imagine my complete lack of surprise right now. — The Administrator",
        "Don't let this lack of success go to your head. — The Administrator",
        "Being the best is difficult...evidently. — The Administrator",
        "Oh, no. Gentlemen, this never happened. — The Administrator",
        // Scout
        "You have got to be kidding! — The Scout",
        "You gotta be kiddin' me! — The Scout",
        "I can not believe this! — The Scout",
        "Ah, crap! — The Scout",
        "Ok guys, bad news: we lost that last one. Good news: you still got me. — The Scout",
        // Soldier
        "We failed, men. — The Soldier",
        // Pyro
        "Mmmmmmmmmpffffff! — The Pyro",
        // Demo
        "That wasn't supposed ta' happen! — The Demoman",
        "Aye, what just happened? — The Demoman",
        // Heavy
        "Tell me, where did we go so wrong? — The Heavy",
        "Ooh, it is sad day! — The Heavy",
        // Engineer
        "That just ain't right! — The Engineer",
        "Now I've seen everything! — The Engineer",
        // Medic
        "Zis... is unacceptable! — The Medic",
        "Schweinhunds! — The Medic",
        // Sniper
        "That's some shonky business right there! — The Sniper",
        "Ahh, that was rubbish! — The Sniper",
        // Spy
        "What a disaster! — The Spy",
        "Not our finest moment. — The Spy",
        "Well, this was a disappointment! — The Spy",
        // Cave Johnson
        "Welcome, test subject, it's Cave. Prime. From Earth One. I am speaking to you from a working page! I am literally in the future! I am--Hold on... [off mic] What? [on mic] Alright, my assistant Greg tells me none of that's true. — Cave Johnson",
        // GLaDOS
        "How brave of you. You know the assembly machine could fail at any time, and yet you still insist on testing it. — GLaDOS",
        "I'm starting to think the theme of this piece should be 'failure'. — GLaDOS",
        "We only failed — GLaDOS",
        "We failing does not make this science. — GLaDOS",
        "I consider that a failing, by the way. — GLaDOS",
        "How can we fail at this? It isn't even a test. — GLaDOS",
        "If at first you don't succeed, refresh this page 5 more times. — GLaDOS"
    ];

    const random = Math.floor(Math.random() * messages.length);

    return messages[random];
}

module.exports = {
    // Pages
    renderInternalErrorPage: (res) => {
        res.status(500).render("error", {
            error: {
                code: 500,
                title: "Internal Server Error",
                messagerandom: generateRandomErrorMessage(),
                message: "<br><br>Please try again later or <a href=\"/about\">report this issue</a>.",
                return: false
            },
            partials: {
                header: "common/header",
                footer: "common/footer"
            }
        });
    },

    renderNotFoundPage: (res, req, message = "Not Found", shouldReturn = true) => {
        if (!req.params.wiki || message === "Wiki Not Found") {
            res.status(404).render("error", {
                error: {
                    code: 404,
                    title: message,
                    messagerandom: generateRandomErrorMessage(),
                    return: shouldReturn
                },
                helpers: {
                    webHost: `${req.protocol}://${req.get("Host")}`,
                    webHostCanonical: "http://wikistats.localhost"
                },
                partials: {
                    header: "common/header",
                    footer: "common/footer"
                }
            });
        } else {
            res.status(404).render("error", {
                error: {
                    code: 404,
                    title: message,
                    messagerandom: generateRandomErrorMessage(),
                    return: shouldReturn
                },
                helpers: {
                    webHost: `${req.protocol}://${req.get("Host")}`,
                    webHostCanonical: "http://wikistats.localhost",
                    wName: wikis.name[req.params.wiki],
                    wAlias: req.params.wiki
                },
                partials: {
                    header: "common/header",
                    footer: "common/footer"
                }
            });
        }
    },

    renderNotFoundPageWiki: (res, wiki) => {
        res.status(404).render("error", {
            error: {
                code: 404,
                title: "Not Found",
                return: true
            },
            helpers: {
                wName: wikis.name[wiki],
                wAlias: wiki
            },
            partials: {
                header: "common/header",
                footer: "common/footer"
            }
        });
    },

    renderJsonResponse: (res, success = false, message, details) => {
        res.send(JSON.stringify({
            success: success,
            message: message + (details ? ` ${details}` : "")
        }));
    },

    // Formatting

    returnCleanUsername: (name) => {
        let user = name.trim();
        user = user.charAt(0).toUpperCase() + user.slice(1);
        return user;
    },

    formatNumber: (number) => {
        return number.toLocaleString("en-GB");
    },

    roundAndFormatNumber: (number, decimals = 1) => {
        return module.exports.formatNumber(Number(number.toFixed(decimals)));
    },

    formatDateLocaleDateString: (date, options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    }) => {
        if (date) {
            return new Date(date).toLocaleDateString("en-GB", options, {timeZone: "UTC"});
        } else {
            return new Date().toLocaleDateString("en-GB", options, {timeZone: "UTC"});
        }
    },

    formatDateLocaleString: (date, options = {
        hour12: false,
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        year: "numeric"
    }) => {
        if (date) {
            return new Date(date).toLocaleString("en-GB", options, {timeZone: "UTC"});
        } else {
            return new Date().toLocaleString("en-GB", options, {timeZone: "UTC"});
        }
    },

    formatDateTimestamp: (date) => {
        if (date) {
            return new Date(date).getTime();
        } else {
            return new Date().getTime();
        }
    },

    formatDate: (date, format) => {
        // FIXME: this shit is not in UTC
        const d = new Date(date);
        // .toLocaleString("en-GB", { month: 'long' }, { timeZone: "UTC" })
        const dicMeses = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"];

        if (format === "DD/MM/YYYY") {
            return `${d.getUTCDate()}/${d.getUTCMonth()}/${d.getUTCFullYear()}`;
        } else if (format === "MMMM YYYY") {
            return `${dicMeses[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
        } else if (format === "LL") {
            return `${dicMeses[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
        } else if (format === "MMMM") {
            return dicMeses[d.getUTCMonth()];
        } else if (format === "YYYY-MM-DDTHH:mm:ss") {
            return d.toISOString().split(".")[0];
        } else if (format === "YYYY") {
            return d.getUTCFullYear();
        } else if (format === "MM") {
            const month = d.getUTCMonth() + 1;

            if (month < 10) {
                return `0${month}`;
            } else {
                return month;
            }
        } else {
            return d;
        }
    },

    formatDateFirstDayOfMonth: (year, month) => {
        return new Date(Date.UTC(year, month - 1, 1)).toISOString().split(".")[0];
    },

    formatDateLastDayOfMonth: (year, month) => {
        return new Date(Date.UTC(year, month, -1, 23, 59, 59)).toISOString().split(".")[0];
    },

    // Middleware

    middlewareWikiIsEnabled: (req, res, next) => {
        if (wikis.enabled.includes(req.params.wiki)) {
            next();
        } else {
            module.exports.renderNotFoundPage(res, req, "Wiki Not Found");
        }
    },

    middlewareWikiIsEnabledJson: (req, res, next) => {
        if (wikis.enabled.includes(req.params.wiki) || wikis.enabled.includes(req.query.wiki)) {
            next();
        } else {
            module.exports.renderJsonResponse(res, false, "Wiki not found.");
        }
    },

    // User fluff

    getUserClasses: (wiki, user, returnAsArray = false) => {
        const classes = ["user-normal"];

        if (wiki === "tf") {
            if (require("../data/lists/tf-valve.json").users.some(u => u.name === user)) {
                classes.push("user-valve");
            }

            if (require("../data/lists/tf-wikicap.json").users.some(u => u.name === user)) {
                classes.push("user-wikicap");
            }
        }

        if (require(`../data/lists/${wiki}-staff.json`).users.some(u => u.name === user)) {
            classes.push("user-staff");
        }

        if (require(`../data/lists/${wiki}-bots.json`).users.some(u => u.name === user)) {
            classes.push("user-bot");
        }

        if (require("../data/specialusers.json").users.some(u => u.name === user && u.wikis.includes(wiki) && u.reason === "donator")) {
            classes.push("user-donator");
        }

        if (require("../data/specialusers.json").users.some(u => u.name === user && u.wikis.includes(wiki) && u.reason === "developer")) {
            classes.push("user-developer");
        }

        return returnAsArray ? classes : classes.join(" ");
    },

    isUserActive: (wiki, user) => {
        const active = require(`../data/lists/${wiki}-active.json`);
        return !!active.users.some(u => u.name === user);
    },

    isUserStaff: (wiki, user) => {
        const active = require(`../data/lists/${wiki}-staff.json`);
        return !!active.users.some(u => u.name === user);
    },

    isUserValve: (user) => {
        const active = require("../data/lists/tf-valve.json");
        return !!active.users.some(u => u.name === user);
    },

    isUserABot: (wiki, user) => {
        const active = require(`../data/lists/${wiki}-bots.json`);
        return !!active.users.some(u => u.name === user);
    },

    isUserDeleted: (user) => {
        return new RegExp(/^@?DeletedUser/, "i").test(user);
    },

    isUserBlacklisted: (user) => {
        const blacklist = require("../data/blacklist.json");
        return new RegExp(/^@?DeletedUser/, "i").test(user) || blacklist.users.includes(user);
    },

    isUserRightBlacklisted: (rights) => {
        const blacklist = require("../data/blacklist.json");

        let exclude = false;

        rights.forEach(function (right) {
            if (blacklist.rights.includes(right)) {
                exclude = true;
            }
        });

        return exclude;
    }
};
