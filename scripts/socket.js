/** ** (c) Espacorede Project ** **/

const fs = require("fs");
const logger = require("./logger");
const userModel = require("../models/userModel");
const workers = require("./worker");
const utils = require("./utils");

module.exports = (socketio) => {
    socketio.on("connection", (socket) => {
        socket.on("load", (user, wiki = "tf") => {
            if (utils.isUserDeleted(user)) {
                socketio.emit("deleted", user, wiki);
                return;
            }

            userModel
                .find({
                    u_sourcewiki: wiki,
                    u_name: user
                })
                .cache(0, `${wiki}user-${user}`)
                .exec((err, data) => {
                    if (err) {
                        logger.mongooseerror(`www - Mongoose error: ${err}`);
                        return;
                    }

                    if (!data || !data[0]) {
                        socketio.emit("notfound", user, wiki);
                    } else if (!data[0].u_contribs[0]) {
                        socketio.emit("noedits", user, wiki);
                    } else {
                        const hasLocalData = (data[0].u_contribs.length > 10000 &&
                            fs.existsSync(`./data/expensiveusers/${wiki}/${user}.json`));

                        if (hasLocalData) {
                            fs.readFile(`./data/expensiveusers/${wiki}/${user}.json`, (err, fileData) => {
                                if (err) {
                                    logger.debug(`Error reading ${user}.json`);
                                    processAndEmitData(data[0]._doc);
                                    return;
                                }
                                const json = JSON.parse(fileData);

                                const daysSinceProcessed = json.processDate
                                    ? Math.ceil((utils.formatDateTimestamp() - json.processDate) / 86400000) : 2;

                                const editCountChanged = require("./utils").formatNumber(data[0].u_contribs.length) !== json.uTotalEdits;

                                if (daysSinceProcessed > 1 && editCountChanged) {
                                    processAndEmitData(data[0]._doc);
                                    socketio.emit("update", user, wiki);
                                }
                                socketio.emit(`${json.uName}-${json.uWiki}`, json);
                            });
                        } else {
                            processAndEmitData(data[0]._doc);
                        }
                    }
                });
        });
    });

    function processAndEmitData(data) {
        const userString = `${data.u_name}-${data.u_sourcewiki}`;
        workers(data).then((out) => {
            if (out) {
                socketio.emit(userString, out);
            }
        }, (err) => {
            if (err) {
                logger.debug(`Failed to process data for "${data.u_name}": ${err} `);
                socketio.emit("notfound", data.u_name, data.u_sourcewiki);
            }
        });
    }
};
