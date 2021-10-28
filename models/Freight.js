const mongoose = require('mongoose')


const Freight = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    unique: false
  },

  destination: {
    type: String,
    required: true,
    unique: false
  },

  details: {
    type: String,
    unique: false
  },

  distance: {
    type: String,
    required: true,
    unique: false
  },

  initialoffer: {
    type: Number,
    unique: false
  },

  TVA: {
    type: String,
    unique: false,
    enum: [ 'included', 'without' ],
    required: true
  },

  regime: {
    type: Array,
    regime: {
      type: String,
      unique: false,
      enum: [ 'LTL', 'FTL', 'ANY' ],
      required: true
    }
  },

  tonnage: {
    type: Number,
    required: true,
    unique: false
  },

  palletName: {
    type: String,
    unique: false,
    enum: ['europallet', 'industrialpallet', 'other', ''],
  },

  palletNumber: {
    type: Number,
    unique: false
  },

  volume: {
    type: Number,
    unique: false
  },

  freightLength: {
    type: Number,
    unique: false,
  },

  width: {
    type: Number,
    unique: false
  },

  height: {
    type: Number,
    unique: false
  },

  valability: {
    type: String,
    unique: false,
    enum: ['1days', '3days', '7days', '14days', '30days']
  },

  trucktype: {
    type: Array,
    trucktype: {
      type: String,
      unique: false,
      enum: ['duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container']
    }
  },

  features: {
    type: Array,
    features: {
      type: String,
      unique: false,
      enum: ['walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer']
    }
  },

  fromUser: [{
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      unique: false
    },
  }],

  createdAt: {
    type: Date,
    required: true
  }
});

module.exports = mongoose.model('Freight', Freight);