const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  donor: {
    type: String,
    required: true,
  },
  contactInfo: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  foodDetails: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "accepted", "expired"],
    default: "available", 
  },
});

module.exports = mongoose.model("Donation", donationSchema);
