const mongoose = require('mongoose')

const Company = new mongoose.Schema({
  companyName: {
    type: String,
  },

  cui: {
    type: String,
    unique: true
  },

  fromYear: {
    type: Number,
  },

  address: {
    type: String,
  },

  activity: {
    type: String,
    unique: false,
    enum: ["transporter", "expeditor", "casa de expeditii", "altele"],
  },

  administrator: {
    type: String,
    unique: true
  }
})

module.exports = mongoose.model('Company', Company);