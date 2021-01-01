/** ** (c) Espacorede Project ** **/

const bodyParser = require("body-parser");
const compression = require("compression");
const engines = require("consolidate");
const express = require("express");
const app = express();

const wikis = require("./configs/wikis/wikis.json");

app.enable("trust proxy");
app.engine("html", engines.handlebars);
app.set("view engine", "html");
app.set("views", `${__dirname}/views`);

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("x-powered-by", "Wiki Stats");
    next();
});

app.use("/", express.static(`${__dirname}/public`));
app.use("/", require(`${__dirname}/routes/main`));
app.use("/wiki", require(`${__dirname}/routes/wiki`));
app.use("/user", require(`${__dirname}/routes/user`));
// app.use("/article", require(`${__dirname}/routes/article`));
app.use("/", express.static(`${__dirname}/public`, {maxAge: "30d"}));

app.use(function (req, res) {
    const curWiki = req.url.split("/")[2];

    if (curWiki && wikis.enabled.includes(curWiki)) {
        res.status(404).render("error", {
            error: {
                code: 404,
                title: "Not Found",
                return: true
            },
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost",
                wName: wikis.name[curWiki],
                wAlias: curWiki
            },
            partials: {
                header: "common/header",
                footer: "common/footer"
            }
        });
    } else {
        res.status(404).render("error", {
            error: {
                code: 404,
                title: "Not Found",
                return: true
            },
            helpers: {
                webHost: `${req.protocol}://${req.get("Host")}`,
                webHostCanonical: "http://wikistats.localhost"
            },
            partials: {
                header: "common/header",
                footer: "common/footer"
            }
        });
    }
});

module.exports = app;
