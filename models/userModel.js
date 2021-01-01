/** ** (c) Espacorede Project ** **/

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const userModel = new Schema({
    u_sourcewiki: String,
    u_name: String,
    u_userid: Number,
    u_edits: Number,
    u_editsws: Number,
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
    u_topeditedpages: {pages: Array, count: Number, remainder: Number},
    u_thanks: Number,
    u_thanked: Number,
    u_bytes: String,
    u_bytesbalance: String,
    u_biggestedit: {title: String, link: String, size: Number},
    u_biggesteditns0: {title: String, link: String, size: Number},
    u_groups: Array,
    u_languagedits: Array,
    dataLastUpdated: String,
    updateComplete: Boolean
});

module.exports = mongoose.model("user", userModel);
