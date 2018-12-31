/** * (c) Espacorede Project * **/

const cachegoose = require("cachegoose");
const config = require("../configs/wikistats-config.json");
const mongoose = require("mongoose");

const mongoDB = `mongodb+srv://${
    config.mongoose.user}:${
    config.mongoose.password}@${
    config.mongoose.hostm}/${
    config.mongoose.db}`;

cachegoose(mongoose);

mongoose.connect(mongoDB, { useNewUrlParser: true });
mongoose.Promise = global.Promise;

module.exports = mongoose.connection;