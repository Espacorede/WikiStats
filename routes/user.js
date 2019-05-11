/** * (c) Espacorede Project * **/

const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

router.get("/:wiki/:user", userController.user);

router.get("/:wiki/:user/compare", userController.compare);

module.exports = router;