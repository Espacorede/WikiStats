/** * (c) Espacorede Project * **/

const mongoose = require("mongoose");
    
const Schema = mongoose.Schema;
    
const wikiModel = new Schema({
    alias: String,
    w_name: String,
    w_pages: Number,
    w_articles: Number,
    w_edits: Number,
    w_images: Number,
    w_users: Number,
    w_activeusers: Number,
    w_admins: Number,
    w_last30: Number,
    w_last7: Number,
    w_age: String,
    dataLastUpdated: String
});

module.exports = mongoose.model("wiki", wikiModel);