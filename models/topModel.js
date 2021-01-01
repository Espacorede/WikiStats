/** ** (c) Espacorede Project ** **/

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const topModel = new Schema({
    wiki: String,
    year: String,
    month: String,
    start: String,
    end: String,
    data: Array,
    dataLastUpdated: String
});

module.exports = mongoose.model("top", topModel);
