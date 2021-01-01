/** ** (c) Espacorede Project ** **/

const Bot = require("nodemw");
const fs = require("fs");
const logger = require("./logger");
const updateLists = require("./updateLists");
const updateUser = require("./updateUser");
const wikis = require("../configs/wikis/wikis.json");

function checkDirectories() {
    logger.debug("checkfiles: Checking for missing directories...");
    let missingCreated = 0;

    if (!fs.existsSync("./logs")) {
        logger.debug("checkfiles: Creating logs/ directory");
        fs.mkdirSync("./logs");
        missingCreated++;
    }

    if (!fs.existsSync("./data")) {
        logger.debug("checkfiles: Creating data/ directory");
        fs.mkdirSync("./data");
        missingCreated++;
    }

    if (!fs.existsSync("./data/expensiveusers")) {
        logger.debug("checkfiles: Creating data/expensiveusers/ subdirectory");
        fs.mkdirSync("./data/expensiveusers");
        missingCreated++;
    }

    if (!fs.existsSync("./data/extensions")) {
        logger.debug("checkfiles: Creating data/extensions/ subdirectory");
        fs.mkdirSync("./data/extensions");
        missingCreated++;
    }

    if (!fs.existsSync("./data/lists")) {
        logger.debug("checkfiles: Creating data/lists/ subdirectory");
        fs.mkdirSync("./data/lists");
        missingCreated++;
    }

    if (!fs.existsSync("./data/namespaces")) {
        logger.debug("checkfiles: Creating data/namespaces/ subdirectory");
        fs.mkdirSync("./data/namespaces");
        missingCreated++;
    }

    if (!fs.existsSync("./data/userqueue.json")) {
        logger.debug("checkfiles: Creating queue file (data/userqueue.json)");
        fs.writeFileSync("./data/userqueue.json", JSON.stringify({
            users: []
        }));
    }

    if (!fs.existsSync("./data/blacklist.json")) {
        logger.debug("checkfiles: Creating blacklist file (data/blacklist.json)");
        fs.writeFileSync("./data/blacklist.json", JSON.stringify({
            users: [],
            rights: []
        }));
    }

    fs.writeFileSync("./data/processqueue.json", JSON.stringify({
        users: []
    }));

    if (missingCreated === 0) {
        logger.debug("checkfiles: No missing directories found.");
    } else {
        logger.info(`${missingCreated} missing directories have been created.`);
    }

    populateFiles();

    if (!fs.existsSync("./public/css/preprocessed")) {
        logger.warn("checkfiles: Missing CSS files! Please run `npm run sass-generate`.");
    }
}

function populateFiles() {
    if (!wikis.enabled || !wikis.enabled[0]) {
        logger.error("There are no wikis enabled! Please edit wikis.json.");
        return;
    }

    wikis.enabled.forEach(function (wiki) {
        let shouldPopulateLists = false;

        if (wiki === "tf") {
            if (!fs.existsSync("./data/lists/tf-wikicap.json")) {
                logger.debug("tf: Creating data/lists/tf-wikicap.json");

                fs.writeFileSync("./data/lists/tf-wikicap.json", JSON.stringify({
                    name: "Wiki Cap Recipients",
                    description: "OTFW's Cream of the Crop",
                    updatedat: "",
                    users: []
                }));
                shouldPopulateLists = true;
            }

            if (!fs.existsSync("./data/lists/tf-top100.json")) {
                logger.debug("tf: Creating data/lists/tf-top100.json");
                fs.writeFileSync("./data/lists/tf-top100.json", JSON.stringify({
                    name: "Top 100 Editors",
                    description: "Accounts listed on the \"Users by edit count\" report page.",
                    updatedat: "",
                    users: []
                }));
                shouldPopulateLists = true;
            }

            if (!fs.existsSync("./data/lists/tf-valve.json")) {
                logger.debug("tf: Creating data/lists/tf-valve.json");
                fs.writeFileSync("./data/lists/tf-valve.json", JSON.stringify({
                    name: "Valve Employees",
                    description: "",
                    users: []
                }));
            }

            if (!fs.existsSync("./data/lists/tf-manneemeritus.json")) {
                logger.debug("tf: Creating data/lists/tf-manneemeritus.json");
                fs.writeFileSync("./data/lists/tf-manneemeritus.json", JSON.stringify({
                    name: "Manne Emeritus",
                    description: "Olde staffe with arbitrarily enough tenure to still get a shiny title.",
                    users: []
                }));
            }
        }

        if (!fs.existsSync(`./data/lists/${wiki}-active.json`)) {
            logger.debug(`${wiki}: Creating data/lists/${wiki}-active.json`);
            fs.writeFileSync(`./data/lists/${wiki}-active.json`, JSON.stringify({
                name: "Active Users",
                description: "Editors who have performed at least one action in the last 30 days.",
                updatedat: "",
                users: []
            }));
            shouldPopulateLists = true;
        }

        if (!fs.existsSync(`./data/lists/${wiki}-staff.json`)) {
            logger.debug(`${wiki}: Creating data/lists/${wiki}-staff.json`);
            fs.writeFileSync(`./data/lists/${wiki}-staff.json`, JSON.stringify({
                name: "Staff Members",
                description: "",
                users: []
            }));
        }

        if (!fs.existsSync(`./data/lists/${wiki}-bots.json`)) {
            logger.debug(`${wiki}: Creating data/lists/${wiki}-bots.json`);
            fs.writeFileSync(`./data/lists/${wiki}-bots.json`, JSON.stringify({
                name: "Bots",
                description: "",
                users: []
            }));
        }

        if (!fs.existsSync(`./data/namespaces/${wiki}.json`)) {
            updateNameSpaces(wiki);
        }

        if (!fs.existsSync(`./data/extensions/${wiki}.json`)) {
            updateExtensions(wiki);
        }

        if (shouldPopulateLists) {
            logger.debug(`${wiki}: Updating lists.`);
            updateLists.updateLists(wiki);
        }
    });

    const userQueue = require("../data/userqueue.json");

    for (const user of userQueue.users) {
        updateUser.getUserInfo(user.name, 2, user.wiki);
    }
}

function updateNameSpaces(wiki) {
    logger.debug(`${wiki}: Updating list of namespaces.`);

    const MWClient = new Bot(`./configs/wikis/${wiki}-config.json`);

    MWClient.api.call({
        action: "query",
        meta: "siteinfo",
        siprop: "namespaces"
    }, (err, data) => {
        if (err) {
            logger.apierror(`${wiki}: namespaces returned "${err}" (updateNameSpaces)`);
            return;
        }

        const namespaces = {
            namespaces: {}
        };

        for (const nm in data.namespaces) {
            namespaces.namespaces[nm] = data.namespaces[nm]["*"];
        }

        fs.writeFile(`./data/namespaces/${wiki}.json`, JSON.stringify(namespaces), (err) => {
            if (err) {
                logger.error(`${wiki}: Failed to save data/namespaces/${wiki}.json (updateNameSpaces): ${err}`);
                return;
            }

            logger.debug(`${wiki}: Namespaces successfully updated!`);
        });
    });
}

function updateExtensions(wiki) {
    logger.debug(`${wiki}: Updating list of extensions.`);

    const MWClient = new Bot(`./configs/wikis/${wiki}-config.json`);

    MWClient.api.call({
        action: "query",
        meta: "siteinfo",
        siprop: "extensions"
    }, (err, data) => {
        if (err) {
            logger.apierror(`${wiki}: extensions returned "${err}" (updateExtensions)`);
            return;
        }

        const extensions = {
            extensions: {}
        };

        for (const ex of data.extensions) {
            extensions.extensions[ex.name] = ex.url;
        }

        fs.writeFile(`./data/extensions/${wiki}.json`, JSON.stringify(extensions), (err) => {
            if (err) {
                logger.error(`${wiki}: Failed to save data/extensions/${wiki}.json (updateExtensions): ${err}`);
                return;
            }

            logger.debug(`${wiki}: Extensions successfully updated!`);
        });
    });
}

checkDirectories();
