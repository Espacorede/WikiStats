/** ** (c) Espacorede Project ** **/

const express = require("express");
const router = express.Router();

const RateLimit = require("express-rate-limit");
const RateLimitMongoStore = require("rate-limit-mongo");

const baseController = require("../controllers/baseController");
const config = require("../configs/wikistats-config.json");
const utils = require("../scripts/utils");

const middlewareLimiter = new RateLimit({
    store: new RateLimitMongoStore({
        uri: `mongodb+srv://${config.mongoose.user}:${config.mongoose.password}@${config.mongoose.hostm}/${config.mongoose.db}`,
        collectionName: "ratelimits"
    }),
    max: 10,
    windowMs: 60000
});

// Base
router.get("/", middlewareLimiter, baseController.homepage);
router.get("/about", middlewareLimiter, baseController.about);

// Actions
router.get("/action/search", utils.middlewareWikiIsEnabledJson, baseController.search);
router.get("/action/getAchievements", baseController.achievements);

// Other
router.get("/github", baseController.github);
router.get("/gitlab", baseController.gitlab);
router.get("/changelog", middlewareLimiter, baseController.changelog);
router.get("/offline", baseController.offline);

module.exports = router;
