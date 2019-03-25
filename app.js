/** * (c) Espacorede Project * **/

const bodyParser = require("body-parser");
const engines = require("consolidate");
const express = require("express");
const logger = require("./scripts/logger");
const db = require("./scripts/mongooseConnect");
const app = express();

db.on("error", (err) => {
    if (err) {
        logger.mongooseerror(`Falha ao conectar-se ao MongoDB: ${err}`);
    }
});

app.engine("html", engines.mustache);
app.set("view engine", "html");
app.set("views", `${__dirname}/views`);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/", require(`${__dirname}/routes/main`));
app.use("/", express.static(`${__dirname}/public`));

app.use(function (req, res) {
    res.status(404).render("error", {
        errorCode: 404,
        errorTitle: "Not Found",
        errorReturnToMain: true,
        partials: {
            header: "common/header"
        }
    });
});

module.exports = app;