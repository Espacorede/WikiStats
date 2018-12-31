/** * (c) Espacorede Project * **/

const db = require("./mongooseConnect");
const fs = require("fs");
const logger = require("./logger");
const updateUser = require("./updateUser");
const dataFiles = fs.readdirSync("./data/lists");
const wikis = require("../configs/wikis/wikis.json");

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

module.exports.updateUsers = () => {
    dataFiles.forEach(function (file) {
        wikis["enabled"].forEach(function (wiki) {
            if (file.includes(wiki)) {
                logger.verbose(`${wiki}: Updating users listed on ${file}`);

                require(`../data/lists/${file}`)["users"].forEach(user => {
                    updateUser.getUserInfo(user["name"], false, wiki);
                });
            }
        });
    });
};