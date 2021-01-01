/** ** (c) Espacorede Project ** **/

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

module.exports.updateListUsers = () => {
    dataFiles.forEach(function (file) {
        wikis.enabled.forEach(function (wiki) {
            if (file.includes(wiki)) {
                logger.verbose(`${wiki}: Updating users listed on ${file}`);

                try {
                    const list = require(`../data/lists/${file}`);

                    list.users.forEach(user => {
                        updateUser.getUserInfo(user.name, 0, wiki);
                    });
                } catch (ex) {
                    logger.error(`${wiki}: Failed to read ${file}: ${ex}`);
                }
            }
        });
    });
};

// module.exports.updateDbUsers = () => {
//
// };
