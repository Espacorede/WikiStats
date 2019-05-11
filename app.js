/** * (c) Espacorede Project * **/

const bodyParser = require("body-parser");
const engines = require("consolidate");
const express = require("express");
const app = express();

app.engine("html", engines.mustache);
app.set("view engine", "html");
app.set("views", `${__dirname}/views`);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use("/", express.static(`${__dirname}/public`));

app.use("/", require(`${__dirname}/routes/main`));
app.use("/wiki", require(`${__dirname}/routes/wiki`));
app.use("/user", require(`${__dirname}/routes/user`));
app.use("/api", require(`${__dirname}/routes/api`));
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