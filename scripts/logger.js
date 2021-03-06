/** ** (c) Espacorede Project ** **/

const utils = require("./utils");
const winston = require("winston");
const config = require("../configs/wikistats-config.json");

const logLevels = {
    error: 0,
    apierror: 1,
    mongooseerror: 2,
    warn: 3,
    info: 4,
    debug: 5,
    verbose: 6
};

winston.addColors({
    levels: logLevels,
    colors: {
        error: "red",
        apierror: "red",
        mongooseerror: "red",
        warn: "yellow",
        info: "green",
        debug: "gray",
        verbose: "gray"
    }
});

const logger = winston.createLogger({
    level: config.logger,
    levels: logLevels,
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf((info) => {
            const level = info.level;
            const message = info.message;
            const timestamp = utils.formatDateLocaleString(info.timestamp).replace(/\//g, "-").replace(",", "");

            return `${timestamp} (${process.pid}) [${level}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({
            filename: "logs/error.log",
            level: "mongooseerror"
        }),
        new winston.transports.File({
            filename: "logs/combined.log"
        }),
        new winston.transports.Console({
            colorize: true
        })
    ]
});

module.exports = logger;
