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

        logger.info(`${wiki}: Removing abandoned accounts from database (<2 edits)...`);

        await userModel.deleteMany({
            u_sourcewiki: wiki,
            u_edits: {
                $lt: 2
            }
        }, function (err, result) {
            if (err) {
                logger.mongooseerror(`${wiki}: Failed to remove abandoned accounts from database: ${err}`);
            } else {
                logger.debug(`${wiki}: Removed ${result.deletedCount} abandoned accounts from database`);
            }
        });
    };
}

removeUsers();
