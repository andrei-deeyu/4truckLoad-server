const express = require('express');
const router = express.Router();

const { isLoggedIn } = require('../auth/middlewares');

const fetch = require('node-fetch');
const Joi = require('joi');

const mongoose = require('mongoose');
const Company = require('../models/Company');
const Freight = require('../models/Freight');

const companySchema = Joi.object().keys({
  companyName: Joi.string().trim().min(3).max(596).required(),
  cui: Joi.string().trim().min(3).max(72).required(),
  fromYear: Joi.number().integer().min(1800).max(2100).required(),
  address: Joi.string().trim().min(5).max(596).required(),
  activity: Joi.string().valid().trim().only("transporter", "expeditor", "casa de expeditii", "altele").required(),
});

const postSchema = Joi.object().keys({
location: Joi.string().trim().min(3).max(256).required(),
destination: Joi.string().trim().min(3).max(256).required(),

    details: Joi.string().trim().max(596).allow(''),

distance: Joi.string().min(1).max(20000).required(),
    initialoffer: Joi.number().min(0).max(700000).allow(null),
    TVA: Joi.string().valid().trim().only('included', 'without').required(), // default without

regime: Joi.string().valid().trim().only('LTL', 'FTL', 'ANY').required(),
tonnage: Joi.number().min(0).max(17000).required(),
    palletName: Joi.string().valid().trim().only('europallet', 'industrialpallet', 'other', ''),
    palletNumber: Joi.number().min(0).max(17000).allow(null),
    volume: Joi.number().min(0).max(30000).allow(null), // m^3
    freightLength: Joi.number().min(0).max(2000).allow(null), // meters
    width: Joi.number().min(0).max(2000).allow(null),
    height: Joi.number().min(0).max(2000).allow(null),


    valability: Joi.string().valid().trim().only('1days', '3days', '7days', '14days', '30days'),
    // calculate total days remaining

    trucktype: Joi.array().items(Joi.string().valid().trim().only('duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container')).max(3),
    features:  Joi.array().items(Joi.string().valid().trim().only('walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer'))

    // createdAt: auto new Date() by mongoDB
    // modalitate plata
})


function respondError500(res, next) {
  res.status(500);
  const error = new Error('Ceva s-a intaplat! Incearca din nou.');
  next(error);
}

// needed to be tested
// warning

router.get('/', (req, res, next) => {
  return res.json({'whoa?': 'done. yep!'})
})

// @desc    Show Discovery experiences
// @route   GET /discovery
router.post('/discovery', async (req, res, next) => {
  let pagination = req.body.pagination;
  let limit = 10;
  let offset = pagination * limit;

  if (req.body.limit) limit = req.body.limit;
  if(!pagination) pagination = 0;

  console.log(pagination)
  console.log(offset);


  let start = new Date(new Date().getTime() - (7 * 60 * 60 * 24 * 1000));  // get date of last week

  async function sortedResponseOf(questions) {
    try {
      function compare(a, b) {
        if (a.data.upVotes < b.data.upVotes)
          return 1;
        if (a.data.upVotes > b.data.upVotes)
          return -1;
        return 0;
      }

      questions.forEach(element => {
        if( req.user && element.data.upVotedBy.indexOf(req.user._id) > -1) {
          element.data.upVoted = true;
        } else {
          element.data.upVoted = false;
        }
        delete element.data.upVotedBy;
        delete element.data.appointedTo;
      });

      let sorted = questions.sort(compare);
      res.json({ sorted });

    } catch (err) {
      console.error(err)
      respondError500(res, next);
    }
  }

  async function discovery(result) {
    result = await Question.find({
     // "data.createdAt": { "$gte": start.getTime() },
      "data.answer": { $exists: true }
    })
    .sort({
      'data.upVotes': -1,
      'data.createdAt': -1
    })
    .skip(offset)
    .limit(limit)
      .populate()
      .lean();

    return result;
  }

  return sortedResponseOf( await discovery() );
});


// @desc   set Company info
// @route   POST /company
router.post('/company', isLoggedIn, async (req, res, next) => {
  const result = Joi.validate(req.body, companySchema);

  if( result.error === null ) {
    try {
      let object = {
        companyName: req.body.companyName,
        cui: req.body.cui,
        fromYear: req.body.fromYear,
        address: req.body.address,
        activity: req.body.activity,
        administrator: req.user.email,
      };

      // Setup stuff
      var query = { administrator: req.user.email };

      // Check if company already exists
      Company.findOne(query, (error, alreadyExists) => {
        if( error ) return respondError500(res, next);

        // Update
        if ( alreadyExists ) {
          return Company.findOneAndUpdate(query, object, { new: true }, ( err, result ) => {
            if( err ) return respondError500(res, next);
            if( result ) return res.json({ state: "updated.", company: result})
          })
        } else if (!alreadyExists) {
          // Create new one
          return Company.create(object, {}, (err, result) => {
            if( result ) return res.json({ state: "updated.", company: result})
            if( err ) return respondError500(res, next);
          });
        }
      })
    } catch (err) {
      console.error(err)
      return respondError500(res, next);
    }
  } else {
    console.log(result.error);
    const error = new Error(result.error);
    res.status(422);
    next(error);
  }
})


// @desc   get myCompany info
// @route   GET /company
router.get('/company', isLoggedIn, async (req, res, next) => {
  try {
    // Setup stuff
    var query = { administrator: req.user.email };

    // Check if company already exists
    Company.findOne(query, (error, result) => {
      if( error ) return respondError500(res, next);

      // Respond
      if( result ) return res.json( result );

      // return nothing;
      return res.json({ });
    })
  } catch (err) {
    console.error(err)
    return respondError500(res, next);
  }
})


router.get('/freights', isLoggedIn, async (req, res, next) => {
  var result;
  let skipN;
  if( req.get('skipN') ) skipN = JSON.parse(req.get('skipN'));
  else skipN = 0;
  console.log(`skipu este ${skipN}`)
  let perPage = 8 + 1;
  let n = skipN * perPage;

  result = await Freight.find({})
  .sort({ createdAt: -1 })
  .skip(n)
  .limit(perPage)
    .populate()
    .lean();
console.log(result.length)
    return res.json(result);
});


// @desc  GET single freight/:id
// @route   GET /freight/:id
router.get('/freight/:freightID', isLoggedIn, async (req, res, next) => {

  const freightID = req.params.freightID;
  console.log(freightID);

    try {
      Freight.findOne({ _id: freightID }, async (err, result) => {
        if( err ) return respondError500(res, next);
        // console.log(result);

      if(req.user && req.user['https://www.dev-h1e424j0.us.auth0.com.subscription'] == "expeditor"
      || req.user && req.user['https://www.dev-h1e424j0.us.auth0.com.subscription'] == "transportator"
      ) {
        return res.json(result);
      } else {
        result.fromUser[0].email = '*****@gmail.com';
        result.fromUser[0].phone = '07******';
        return res.json(result);
      }
      });
    } catch (err) {
      return respondError500(res, next);
    }
})


// @desc  POST freight
// @route   POST /freight
router.post('/freight', isLoggedIn, async (req, res, next) => {
  const result = Joi.validate(req.body, postSchema);

  console.log(req.user)
  console.log(typeof req.user['https://www.dev-h1e424j0.us.auth0.com.phone'])

  if( req.body.palletName && req.body.palletNumber < 1) {
    const error01 = new Error('Ai introdus doar tipul paletului, nu si numarul acestora')
    res.status(422);
    return next(error01);
  } else if( req.body.palletNumber > 0 && !req.body.palletName ) {
    const error02 = new Error('Ai introdus doar numarul de paleti, nu si tipul acestora')
    res.status(422);
    return next(error02);
  }

  if( result.error === null && req.user['https://www.dev-h1e424j0.us.auth0.com.subscription'] == "expeditor") {
    try {
/*
          fromCompany: {
            name: req.body.name
            cui: req.body.cui,
            yearsOfActivity: new Date().getFullYear() - req.body.fromYear,
            activity: req.body.activity,
          },
*/
      var insertObject = {
        ...req.body,
          fromUser: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user['https://www.dev-h1e424j0.us.auth0.com.phone'],
          },
          createdAt: Date.now(),
      }

      Freight.create(insertObject, async (err, result) => {
        if( err ) {
          console.log(err);
          return respondError500(res, next);
        }

        // pay
        if( result ) return res.json({ state: "posted.", id: result._id });

        return res.json({state: 'wrong.'});
      });
    } catch (err) {
      console.log( err );
      return respondError500(res, next);
    }
  } else {
    if(req.user["https://www.dev-h1e424j0.us.auth0.com.subscription"] !== "expeditor") {
      res.status(500);
      const error = new Error('Ai nevoie de abonament de expeditor pentru asta');
      return next(error);
    }

    const error = new Error(result.error);
    res.status(422);
    return next(error);
  }
})


module.exports = router;