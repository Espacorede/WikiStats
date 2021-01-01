/** ** (c) Espacorede Project ** **/

const tasks = require("../timelyTasks");
const logger = require("../logger");

logger.debug("Cronjob: Updating lists");
tasks.updateLists();
