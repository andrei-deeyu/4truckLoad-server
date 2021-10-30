const mongoose = require('mongoose')

const Stats = new mongoose.Schema({
  statsType: {
    type: String,
    unique: false
  },

  ip: {
    type: String,
    unique: false
  },

  whichCTA: {
    type: String,
    unique: false
  }
})

module.exports = mongoose.model('Stats', Stats);