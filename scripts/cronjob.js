/** ** (c) Espacorede Project ** **/

const tasks = require("./timelyTasks");
const logger = require("./logger");

setInterval(() => {
    const currentTime = new Date();
    const minute = currentTime.getUTCMinutes();
    // const hour = currentTime.getUTCHours();

    if (minute === 0) {
        logger.debug("Cronjob: Updating lists");
        tasks.updateLists();

        // if (hour === 0) {
        // FIXME
        // logger.debug("Cronjob: Updating list users");
        // tasks.updateListUsers();

        // if (currentTime.getDate() === 1) {
        //    logger.debug("Cronjob: Updating monthlytop");
        //    tasks.updateMonthly();
        // }
        // }

        // if (hour === 2) {
        //    logger.debug("Cronjob: Updating db users");
        //    tasks.updateDbUsers();
        // }

        // if (hour === 3) {
        //    logger.debug("Cronjob: Processing bots");
        //    tasks.processBots();
        // }
    }

    if (minute === 30) {
        logger.debug("Cronjob: Checking queue");
        tasks.checkQueue();
    }
}, 60000);
