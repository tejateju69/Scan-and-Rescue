const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  username: {  // Add this field
    type: String,
    required: true,
  },
  mobileNo: {
    type: String,
    required: true,
  },
  guardianNo: {
    type: String,
    required: true,
  },
  bloodGrp: {
    type: String,
    required: true,
  },
  healthDetails: {
    type: String,
    required: true,
  },
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);

