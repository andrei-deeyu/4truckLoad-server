const mongoose = require('mongoose')

const Stats = new mongoose.Schema({
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