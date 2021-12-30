const express = require('express');
const router = express.Router();

const { isLoggedIn } = require('../auth/middlewares');

const Joi = require('joi');

const Company = require('../models/Company');
const Freight = require('../models/Freight');

/* Joi validation schemas */
const companySchema = Joi.object().keys({
  companyName: Joi.string().trim().min(3).max(596).required(),
  cui: Joi.string().trim().min(3).max(72).required(),
  fromYear: Joi.number().integer().min(1800).max(2100).required(),
  address: Joi.string().trim().min(5).max(596).required(),
  activity: Joi.string().valid().trim().only("transporter", "expeditor", "casa de expeditii", "altele").required(),
});

const postSchema = Joi.object().keys({
  location: Joi.string().trim().min(3).max(256).required(), // required
  destination: Joi.string().trim().min(3).max(256).required(), // required
  details: Joi.string().trim().max(596).allow(''),
  distance: Joi.string().min(1).max(20000).required(), // required
  initialoffer: Joi.number().min(0).max(700000).allow(null),
  TVA: Joi.string().valid().trim().only('included', 'without').required(), // the default value is 'without', required
  regime: Joi.string().valid().trim().only('LTL', 'FTL', 'ANY').required(), // required
  tonnage: Joi.number().min(0).max(17000).required(), // required
  palletName: Joi.string().valid().trim().only('europallet', 'industrialpallet', 'other', ''),
  palletNumber: Joi.number().min(0).max(17000).allow(null),
  volume: Joi.number().min(0).max(30000).allow(null),
  freightLength: Joi.number().min(0).max(2000).allow(null),
  width: Joi.number().min(0).max(2000).allow(null),
  height: Joi.number().min(0).max(2000).allow(null),
  valability: Joi.string().valid().trim().only('1days', '3days', '7days', '14days', '30days'),
  trucktype: Joi.array().items(Joi.string().valid().trim().only('duba', 'decopertat', 'basculanta', 'transport auto', 'prelata', 'agabaritic', 'container')).max(3),
  features:  Joi.array().items(Joi.string().valid().trim().only('walkingfloor', 'ADR', 'FRIGO', 'izoterm', 'lift', 'MEGAtrailer'))
})


function respondError500(res, next) {
  res.status(500);
  const error = new Error('Ceva s-a intaplat! Incearca din nou.');
  next(error);
}


// @desc   set Company info
// @route   POST /company
router.post('/company', isLoggedIn, async (req, res, next) => {
  const result = Joi.validate(req.body, companySchema);

  if( result.error === null ) {
    try {
      const object = {
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

        if ( alreadyExists ) {
          // Update the existing one
          return Company.findOneAndUpdate(query, object, { new: true }, ( err, result ) => {
            if( err ) return respondError500(res, next);
            if( result ) return res.json({ state: "updated.", company: result})
          })
        } else if ( !alreadyExists ) {
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


// @desc   get reqUser's company info
// @route   GET /freights
router.get('/freights', isLoggedIn, async (req, res, next) => {
  let result;
  let skipN;

  if( req.get('skipN') ) skipN = JSON.parse( req.get('skipN') );
  else skipN = 0; // first page

  let perPage = 8 + 1;
  let n = skipN * perPage;

  // query the database for the last 9 posts
  /*
    the 9th post is used just for pagination purposes,
    to tell the client there are more pages to show.
    the client will pop it out && spawn one more pagination button
  */
  result = await Freight.find({})
  .sort({ createdAt: -1 })
  .skip(n)
  .limit(perPage)
    .populate()
    .lean();
  return res.json(result);
});


// @desc  boolean: user has posted any freights?
// @route   GET /userAddedFreights
router.get('/userAddedFreights', isLoggedIn, async (req, res, next) => {
  let x;
  x = await Freight.findOne({ 'fromUser.email': req.user.email  });

  // return the boolean
  if( x ) return res.json({ userAddedFreights: true })
  else return res.json({ userAddedFreights: false })
});

// @desc  GET single freight/:id
// @route   GET /freight/:id
router.get('/freight/:freightID', isLoggedIn, async (req, res, next) => {
  const freightID = req.params.freightID;

  try {
    Freight.findOne({ _id: freightID }, async (err, result) => {
      if( err ) return respondError500(res, next);

      // check if user is premium
      let subscriptionType = req.user['https://www.dev-h1e424j0.us.auth0.com.subscription'];

      if( req.user && subscriptionType == "complet" || req.user && subscriptionType == "transportator" ) {
        // return the complete freight data
        return res.json(result);
      } else {
        // blur the contact data
        result.fromUser[0].email = '*****@gmail.com';
        result.fromUser[0].phone = '07******';
        return res.json( result );
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

  // both palletName && palletNumber must be present, or neither
  if( req.body.palletName && !req.body.palletNumber) {
    let error = new Error('Ai introdus doar tipul paletului, nu si numarul acestora')
    res.status(422);
    return next(error);
  } else if( req.body.palletNumber > 0 && !req.body.palletName ) {
    let error = new Error('Ai introdus doar numarul de paleti, nu si tipul acestora')
    res.status(422);
    return next(error);
  }

  if( result.error === null ) {
    try {
      // TODO: fromUser.company
      let insertObject = {
        ...req.body,
          fromUser: {
            name: req.user.name,
            email: req.user.email,
            phone: req.user['https://www.dev-h1e424j0.us.auth0.com.phone'],
          },
          createdAt: Date.now(),
      }

      Freight.create(insertObject, async (err, result) => {
        if( err ) return respondError500(res, next);

        if( result ) return res.json({ state: "posted.", id: result._id });
        return res.json({ state: 'wrong.' });
      });
    } catch (err) {
      console.log( err );
      return respondError500(res, next);
    }
  } else {
    const error = new Error(result.error);
    res.status(422);
    return next(error);
  }
})


module.exports = router;