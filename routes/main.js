/** * (c) Espacorede Project * **/

const express = require("express");
const logger = require("../scripts/logger");
const userModel = require("../models/userModel");
const wikis = require("../configs/wikis/wikis.json");
const utils = require("../scripts/utils");
const router = express.Router();

// Homepage

router.get("/", (req, res) => {
    if (wikis["enabled"].length === 1) {
        res.redirect(`${wikis["enabled"][0]}/wiki`);
        return;
    }

    userModel.find({}, "u_name u_edits", function (err, data) {
        if (err) {
            logger.mongooseerror(`Failed to retrieve users from database (/): ${err}`);
            utils.renderInternalErrorPage(res);
            return;
        }

        let availableWikis = [];

        wikis["enabled"].forEach(wiki => {
            let newWiki = {
                path: wiki,
                name: wikis.name[wiki],
                logo: wikis.files.logo[wiki]
            };
            availableWikis.push(newWiki);
        });

        availableWikis.sort((a, b) => a.name.localeCompare(b.name));

        res.render("homepage.html", {
            pWikis: availableWikis,
            mUsers: data ? data.length : "Unknown",
            mWikis: wikis["enabled"].length,
            partials: {
                header: "common/header"
            }
        });
    });
});

// Other

router.get("/about", (req, res) => {
    userModel.find({}, "u_name u_edits", (err, data) => {
        if (err) {
            logger.mongooseerror(`Failed to retrieve users from database (/about): ${err}`);
            utils.renderInternalErrorPage(res);
            return;
        }

        let availableWikis = [];

        wikis["enabled"].forEach(wiki => {
            let newWiki = {
                path: wiki,
                name: wikis.name[wiki],
                url: wikis.url[wiki]
            };
            availableWikis.push(newWiki);
        });

        availableWikis.sort((a, b) => a.name.localeCompare(b.name));

        res.render("about.html", {
            userstotal: data ? data.length : "Unknown",
            pWikis: availableWikis,
            partials: {
                header: "common/header"
            }
        });
    });
});

module.exports = router;