/** ** (c) Espacorede Project ** **/

const db = require("../mongooseConnect");
const logger = require("../logger");
const userModel = require("../../models/userModel");
const wikis = require("../../configs/wikis/wikis.json");

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Failed to connect to MongoDB: ${err}`);
    }
});

async function removeUsers() {
    for (let wiki in wikis.enabled) {
        wiki = wikis.enabled[wiki];

        logger.info(`${wiki}: Removing deleted accounts from database...`); ;

        await userModel.deleteMany({
            u_sourcewiki: wiki,
            u_name: /^@?DeletedUser/
        }, function (err, result) {
            if (err) {
                logger.mongooseerror(`${wiki}: Failed to remove deleted users from database: ${err}`);
            } else {
                logger.debug(`${wiki}: Removed ${result.deletedCount} deleted users from database`);
            }
        });
    };
}

removeUsers();
