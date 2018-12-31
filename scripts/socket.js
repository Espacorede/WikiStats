const fs = require("fs");
const logger = require("./logger");
const userModel = require("../models/userModel");
const workers = require("./worker");

module.exports = (socketio) => {
    socketio.on("connection", (socket) => {
        socket.on("load", (user, wiki = "tf") => {
            userModel
                .find({ u_sourcewiki: wiki, u_name: user })
                .cache(0, `${wiki}user-${user}`)
                .exec((err, data) => {
                    if (err) {
                        logger.mongoose(`www - Mongoose error: ${err}`);
                        return;
                    }

                    if (!data || !data[0]) {
                        socketio.emit("notfound", user, wiki);
                    } else if (!data[0].u_contribs[0]) {
                        socketio.emit("noedits", user, wiki);
                    } else {

                        let hasLocalData = (data[0].u_contribs.length > 10000 &&
                     fs.existsSync(`./data/expensiveusers/${wiki}/${user}.json`));

                        if (hasLocalData) {
                            fs.readFile(`./data/expensiveusers/${wiki}/${user}.json`, (err, fileData) => {
                                if (err) {
                                    logger.debug(`Error reading ${user}.json`);
                                    processAndEmitData(data[0]._doc);
                                    return;
                                }
                                let json = JSON.parse(fileData);

                                let daysSinceProcessed = json.processDate ?
                                    Math.ceil((new Date().getTime() - json.processDate) / 86400000) : 2;

                                let editCountChanged = require("./utils").formatNumber(data[0].u_contribs.length) !== json.uTotalEdits;

                                if (daysSinceProcessed > 1 && editCountChanged) {
                                    processAndEmitData(data[0]._doc);
                                }
                                socketio.emit(json.uName, json);
                            });
                        }
                        else {
                            processAndEmitData(data[0]._doc);
                        }

                    }
                });
        });
    });

    function processAndEmitData(data) {
        workers(data).then((out) => {
            if (out) {
                socketio.emit(data.u_name, out);
            }
        }, (err) => {
            if (err) {
                logger.debug(`Failed to process data for "${data.u_name}": ${err} `);
                socketio.emit("notfound", data.u_name);
            }
        });
    }
};

