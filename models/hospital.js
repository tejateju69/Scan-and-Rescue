const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const Schema = mongoose.Schema;

const hospitalSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    unique: true
  }
});

hospitalSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Hospital", hospitalSchema);
