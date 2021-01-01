/** ** (c) Espacorede Project ** **/

const wikis = require("../../configs/wikis/wikis.json");
const moment = require("moment");
const logger = require("../logger");
const monthlyStats = require("../updateMonthlyStats");

for (const wiki of wikis.enabled) {
    const dateCreation = moment("2020-09-01"); // moment(wikis.creation[wiki]);
    const dateNow = moment().startOf("month");
    const times = [];

    while (dateNow > dateCreation || dateCreation.format("M") === dateNow.format("M")) {
        times.push(dateCreation.format("YYYY-MM"));
        dateCreation.add(1, "month");
    }

    for (const time of times) {
        if (!(moment().isSame(time, "month") && moment().isSame(time, "year"))) {
            logger.verbose(`${wiki}: Getting history for ${time}.`);

            monthlyStats.updateMonthly(moment(time).format("YYYY"), moment(time).format("MM"), wiki);
        }
    }
}
