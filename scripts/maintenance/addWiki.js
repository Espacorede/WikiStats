const prompt = require("prompt");
const fs = require("fs");
const logger = require("../logger");

const wikiBaseConfig = {
    protocol: "",
    server: "",
    path: "",
    concurrency: 1
};

const propertiesBaseConfig = [
    {
        description: "Wiki protocol",
        name: "protocol",
        type: "string",
        required: true,
        default: "https"
    },
    {
        description: "Wiki server (mywiki.example.com)",
        name: "server",
        type: "string",
        required: true
    },
    {
        description: "MediaWiki script path (Usually \"/\" on Gamepedia; see Special:Version)",
        name: "path",
        type: "string",
        required: true,
        default: "/w"
    }
];

const propertiesWikisConfig = [
    {
        description: "Wiki alias",
        message: "Must be a valid word; no spaces or special characters.",
        name: "alias",
        type: "string",
        required: true,
        pattern: /^\w+$/
    },
    {
        description: "Wiki name",
        name: "name",
        type: "string",
        required: true
    },
    {
        description: "Wiki url (Must be a valid URL)",
        message: "Must be a valid URL",
        name: "url",
        type: "string",
        required: true,
        pattern: /(https?:\/\/[a-zA-Z0-9\-.]+.[a-zA-Z]{2,3})$/
    },
    {
        description: "Wiki creation date (YYYY-MM-DD format)",
        message: "YYYY-MM-DD",
        name: "creation",
        type: "string",
        required: true,
        pattern: /\d{4}-\d{2}-\d{2}/
    },
    {
        description: "Wiki theme (Optional, hex color)",
        name: "mobiletheme",
        type: "string",
        required: false,
        default: "#3498DB"
    },
    {
        description: "Is enabled? (y/n)",
        message: "Is enabled",
        name: "isenabled",
        type: "string",
        required: true,
        default: "y",
        pattern: /y|n/
    },
    {
        description: "Is featured? (y/n)",
        message: "Is featured",
        name: "isfeatured",
        type: "string",
        required: true,
        default: "y",
        pattern: /y|n/
    }
];

prompt.start();

prompt.get(propertiesWikisConfig, function (err, result) {
    if (err) {
        logger.error("Error: ", err);
    }

    logger.info("\nInput received:");
    logger.info("  alias: ", result.alias);
    logger.info("  enabled: ", result.isenabled);
    logger.info("  featured: ", result.isfeatured);
    logger.info("  theme: ", result.mobiletheme);
    logger.info("  name: ", result.name);
    logger.info("  creation: ", result.creation);
    logger.info("  url: ", result.url, "\n\n");

    prompt.get({
        description: "Save wiki data? (y/n)",
        message: "Save wiki data? (y/n)",
        name: "save",
        type: "string",
        required: true,
        default: "y",
        pattern: /y|n/
    }, function (err, confirm) {
        if (err) {
            return logger.error("Prompt error: ", err);
        }

        if (confirm.save === "y") {
            logger.info("\nSaving...");

            fs.readFile("configs/wikis/wikis.json", function (err, data) {
                if (err) {
                    return logger.error("Failed to read configs/wikis/wikis.json: ", err);
                }

                const json = JSON.parse(data);

                json.name[result.alias] = result.name;
                json.creation[result.alias] = result.creation;
                json.url[result.alias] = result.url;
                json.files.theme[result.alias] = result.mobiletheme;
                if (result.isenabled === "y") {
                    json.enabled.push(result.alias);
                }
                if (result.isfeatured === "y") {
                    json.featured.push(result.alias);
                }

                fs.writeFile("configs/wikis/wikis.json", JSON.stringify(json, null, 4), function (err) {
                    if (err) {
                        return logger.error("Failed to save configs/wikis/wikis.json: ", err);
                    }

                    logger.info("configs/wikis/wikis.json saved successfully!\n\n");

                    prompt.get(propertiesBaseConfig, function (err, resultconfig) {
                        if (err) {
                            logger.error("Prompt error: ", err);
                        }

                        logger.info("\nInput received:");
                        logger.info("  protocol: ", resultconfig.protocol);
                        logger.info("  server: ", resultconfig.server);
                        logger.info("  path: ", resultconfig.path, "\n\n");

                        wikiBaseConfig.protocol = resultconfig.protocol;
                        wikiBaseConfig.server = resultconfig.server;
                        wikiBaseConfig.path = resultconfig.path;

                        logger.info("\nSaving wiki configuration...");

                        fs.writeFile(`configs/wikis/${result.alias}-config.json`, JSON.stringify(wikiBaseConfig, null, 4), function (err) {
                            if (err) {
                                return logger.error(`Failed to save configs/wikis/${result.alias}-config.json: `, err);
                            }

                            logger.info(`configs/wikis/${result.alias}-config.json saved successfully!`);
                        });
                    });
                });
            });
        } else {
            logger.info("\nAlright, then. Keep your secrets.");
        }
    });
});
