/** ** (c) Espacorede Project ** **/

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");
const utils = require("../scripts/utils");

// Base
router.get("/:wiki/:user", utils.middlewareWikiIsEnabled, userController.user);

// Data dump
router.get("/:wiki/:user/data", utils.middlewareWikiIsEnabledJson, userController.userRaw);

module.exports = router;
