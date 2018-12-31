/** * (c) Espacorede Project * **/

const mongoose = require("mongoose");


    
const Schema = mongoose.Schema;


    
const userModel = new Schema({
    u_sourcewiki: String,
    u_name: String,
    u_userid: Number,
    u_edits: Number,
    u_registration: String,
    u_contribs: Array,
    u_pagecreations: Number,
    u_uniquepages: Number,
    u_uploads: Number,
    u_alluploads: Number,
    u_minoredits: Number,
    u_blockcount: Number,
    u_deletecount: Number,
    u_namespaceedits: Array,
    u_topeditedpages: Array,
    dataLastUpdated: String,
    updateComplete: Boolean
});

module.exports = mongoose.model("user", userModel);