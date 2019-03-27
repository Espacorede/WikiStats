/** * (c) Espacorede Project * **/

const bot = require("nodemw");
const fs = require("fs");
const logger = require("./logger");
const updateLists = require("./updateLists");
const wikis = require("../configs/wikis/wikis.json");

fs.writeFileSync("./data/processqueue.json", JSON.stringify({ users: [] }, null, 2));

wikis["enabled"].forEach(function (wiki) {
    let shouldPopulateLists = false;

    if (wiki === "tf") {
        if (!fs.existsSync(`./data/lists/${wiki}-wikicap.json`)) {
            logger.info(`${wiki}: Creating data/lists/${wiki}-wikicap.json`);
            fs.writeFileSync(`./data/lists/${wiki}-wikicap.json`, JSON.stringify({ "name": "Wiki Cap owners", "description": "OTFW's cream of the crop", "users": [] }, null, 2));
            shouldPopulateLists = true;
        }

        if (!fs.existsSync(`./data/lists/${wiki}-top100.json`)) {
            logger.info(`${wiki}: Creating data/lists/${wiki}-top100.json`);
            fs.writeFileSync(`./data/lists/${wiki}-top100.json`, JSON.stringify({ "name": "Top 100 editors", "description": "Accounts listed on the 'Users by edit count' list", "users": [] }, null, 2));
            shouldPopulateLists = true;
        }

        if (!fs.existsSync(`./data/lists/${wiki}-valve.json`)) {
            logger.info(`${wiki}: Creating data/lists/${wiki}-valve.json`);
            fs.writeFileSync(`./data/lists/${wiki}-valve.json`, JSON.stringify({ "name": "Valve employees", "description": "", "users": [] }, null, 2));
            shouldPopulateLists = true;
        }
    }

    if (!fs.existsSync(`./data/lists/${wiki}-active.json`)) {
        logger.info(`${wiki}: Creating data/lists/${wiki}-active.json`);
        fs.writeFileSync(`./data/lists/${wiki}-active.json`, JSON.stringify({ "name": "Active users", "description": "Editors who have performed at least one action in the last 30 days", "users": [] }, null, 2));
        shouldPopulateLists = true;
    }

    if (!fs.existsSync(`./data/lists/${wiki}-staff.json`)) {
        logger.info(`${wiki}: Creating data/lists/${wiki}-staff.json`);
        fs.writeFileSync(`./data/lists/${wiki}-staff.json`, JSON.stringify({ "name": "Staff members", "description": "Editors who have performed at least one action in the last 30 days", "users": [] }, null, 2));
        shouldPopulateLists = !shouldPopulateLists ? false : true;
    }

    if (!fs.existsSync(`./data/lists/${wiki}-bots.json`)) {
        logger.info(`${wiki}: Creating data/lists/${wiki}-bots.json`);
        fs.writeFileSync(`./data/lists/${wiki}-bots.json`, JSON.stringify({ "name": "Bots", "description": "", "users": [] }, null, 2));
        shouldPopulateLists = !shouldPopulateLists ? false : true;
    }

    if (!fs.existsSync(`./data/namespaces/${wiki}.json`)) {
        updateNameSpaces(wiki);
    }

    if (!fs.existsSync(`./data/extensions/${wiki}.json`)) {
        updateExtensions(wiki);
    }

    if (shouldPopulateLists) {
        logger.verbose(`${wiki}: Updating lists.`);
        updateLists.updateLists(wiki);
    }
});

function updateNameSpaces(wiki) {
    logger.verbose(`${wiki}: Updating list of namespaces.`);

    let MWClient = new bot(`./configs/wikis/${wiki}-config.json`);

    MWClient.api.call({
        "action": "query",
        "meta": "siteinfo",
        "siprop": "namespaces"
    }, (err, data) => {
        if (err) {
            logger.apierror(`${wiki}: namespaces returned "${err}" (updateNameSpaces)`);
            return;
        }
        let namespaces = {
            namespaces: {
            }
        };
        for (let nm in data["namespaces"]) {
            namespaces["namespaces"][nm] = data["namespaces"][nm]["*"];
        }
        fs.writeFile(`./data/namespaces/${wiki}.json`, JSON.stringify(namespaces, null, 2), (err) => {
            if (err) {
                logger.error(`${wiki}: Failed to save namespaces/${wiki}.json (updateNameSpaces): ${err}`);
                return;
            }

            logger.verbose(`${wiki}: Namespaces successfully updated!`);
        });
    });
}

function updateExtensions(wiki) {
    logger.verbose(`${wiki}: Updating list of extensions.`);

    let MWClient = new bot(`./configs/wikis/${wiki}-config.json`);

    MWClient.api.call({
        "action": "query",
        "meta": "siteinfo",
        "siprop": "extensions"
    }, (err, data) => {
        if (err) {
            logger.apierror(`${wiki}: extensions returned "${err}" (updateExtensions)`);
            return;
        }
        let extensions = {
            extensions: {
            }
        };
        for (let ex of data["extensions"]) {
            extensions["extensions"][ex["name"]] = ex["url"];
        }
        fs.writeFile(`./data/extensions/${wiki}.json`, JSON.stringify(extensions, null, 2), (err) => {
            if (err) {
                logger.error(`${wiki}: Failed to save extensions/${wiki}.json (updateExtensions): ${err}`);
                return;
            }

            logger.verbose(`${wiki}: Extensions successfully updated!`);
        });
    });
}
