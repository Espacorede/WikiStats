/** ** (c) Espacorede Project ** **/

const express = require("express");
const router = express.Router();

const wikiController = require("../controllers/wikiController");
const utils = require("../scripts/utils");

// Base
router.get("/:wiki", utils.middlewareWikiIsEnabled, wikiController.homepage);

// Lists
router.get("/:wiki/lists", utils.middlewareWikiIsEnabled, wikiController.lists);
router.get("/:wiki/list/:list", utils.middlewareWikiIsEnabled, wikiController.list);

// Tops
router.get("/:wiki/tops", utils.middlewareWikiIsEnabled, wikiController.monthly);
router.get("/:wiki/tops/available", utils.middlewareWikiIsEnabledJson, wikiController.monthlytopavailable);
router.get("/:wiki/top/:year/:month", utils.middlewareWikiIsEnabled, wikiController.monthlytop);

// Data dump
router.get("/:wiki/data/top10editors", utils.middlewareWikiIsEnabledJson, wikiController.top10editors);
router.get("/:wiki/data/top10uploaders", utils.middlewareWikiIsEnabledJson, wikiController.top10uploaders);

module.exports = router;
