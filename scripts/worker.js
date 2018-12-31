const cpus = require("os").cpus().length;
const Workers = require("worker-nodes");
const config = require("../configs/wikistats-config.json").maxCPUs;

const maxCPUs = (config > 0 && config <= cpus) ? config : cpus;

const workers = new Workers(require("path").resolve(__dirname, "./processUserData"), {
    lazyStart: true,
    maxWorkers: maxCPUs,
    workerStopTimeout: 10000
});

module.exports = workers.call.processUser;