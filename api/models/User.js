const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    nombre: {type: String, required: true},
    password: {type: String, required: true, min: 8}
    });

const User = mongoose.model("user", userSchema);

module.exports = User;