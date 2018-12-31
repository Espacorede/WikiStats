/** * (c) Espacorede Project * **/
const tasks = require("./timelyTasks");

setInterval(() => {
    let currentTime = new Date();
    let minute = currentTime.getMinutes();
    let hour = currentTime.getHours();

    if (minute === 0) {
        tasks.updateLists();

        if (hour === 0) {
            tasks.updateUsers();
        }

        if (hour === 3) {
            tasks.processBots();
        }
    }

    if (minute === 30) {
        tasks.checkQueue();
    }

}, 60000);

tasks.checkQueue();