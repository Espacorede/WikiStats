/** * (c) Espacorede Project * **/

const express = require("express");
const router = express.Router();

const wikiController = require("../controllers/wikiController");

router.get("/:wiki", wikiController.homepage);

router.get("/:wiki/lists", wikiController.lists);

router.get("/:wiki/list/:list", wikiController.list);

module.exports = router;