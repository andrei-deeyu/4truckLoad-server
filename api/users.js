const express = require('express');
const router = express.Router();

const { json } = require('body-parser');

const mongoose = require('mongoose');
const Users = require('../models/Company');
const { isLoggedIn } = require('../auth/middlewares');

const Joi = require('joi');

// account's username have at least 3 characters. But searching bar requires just 2
const usernameSchema = Joi.string().trim().min(2).max(256).required();

function respondError500(res, next) {
  res.status(500);
  const error = new Error('Unable to load');
  next(error);
}

/*
db.Customers.find({'EmailAddresses.EmailAddress' : /Zohi.com$/i},{'_id':0, 'Addresses':0,'Name':0,
'Notes':0, 'Phones':0})
*/
//find all customers with an email address that uses Zohi.com
//don't return the id, Addresses, Name, Notes or Phones



/* Everything here is pre-pended with "/users" */

// @desc    Get user data
// @route   GET /users/:queryParam (username/nickname)
router.get('/:username', (req, res, next) => {
  const result = Joi.validate(req.params.username, usernameSchema);

  if( result.error === null ) {
    // get the username from params and find that user
    var regex = new RegExp(`^${req.params.username}`, `g`);

    Users.find({ username: regex }, 'username thumbnail -_id', (err, data) => {
      if (err) return respondError500(res, next);
      if ( data ) return res.json({ data });
      return res.json({ });
    });
  } else {
    console.log(result.error);
    return res.json({});
  }
});


// @desc    follow | unfollow user
// @route   POST /:username/follow/
router.post('/:username/follow', isLoggedIn, async (req, res, next) => {
  if(req.user && req.params.username !== req.user.username) {
// paramsUser _id is the id from user auth or profile data? exactly. Use username until you discover.
    try {
      Users.updateOne({ username: req.user.username },
      { $addToSet: { "following_UserIDs": req.params.username } },
      ( err, doc ) => {

        if( err ) return respondError500(res, next);
          // addToSet adds unique value.
          // if nModified = 0 (value not changed) - then the value already exists

          // ( if == 1 ), value changed, so we - increase reqUser followers number by +1.
          //                                   - increase paramsUser followers number by +1.
          //                                   - add reqUser._id to paramsUser's followers_UserIDs

          // ( else ),    value already exists, do the opposite: remove from all 4 values.
        if( doc.nModified == 1 ) {
          function reqUser() {
            Users.updateOne({ username: req.user.username }, {
              $inc: { "following": 1 }
            }, ( err2 ) => { if( err2 ) return respondError500(res, next) });
          }

          function paramsUser() {
            Users.updateOne({ username: req.params.username }, {
              $addToSet: { "followers_UserIDs": req.user.username },
              $inc: { "followers": 1 }
            }, ( err2 ) => { if( err2 ) return respondError500(res, next) });
          }
          reqUser();
          paramsUser();

          res.json({ state: "followed." });
        } else {
          function reqUser() {
            Users.updateOne({ username: req.user.username }, {
              $pull: { "following_UserIDs": req.params.username },
              $inc: { "following": -1 }
            }, ( err2, res ) => { if( err2 ) return respondError500(res, next) });
          }

          function paramsUser() {
            console.log(req.user)
            console.log(req.user.username);
            Users.updateOne({ username: req.params.username }, {
              $pull: { "followers_UserIDs": req.user.username },
              $inc: { "followers": -1 }
            }, ( err2, res ) => {
              if( err2 ) {
                console.log(err2);
                return respondError500(res, next)
              }
            });
          }
          reqUser();
          paramsUser();
          // awaiting these functions will cause twice executions. Why?

          res.json({ state: "unfollowed." });
        }
      })
    } catch (err) {
      console.error(err)
      return respondError500(res, next);
    }
  } else {
    const error = new Error('Use a mirror');
    res.status(500);
    return next(error);
  }
})


module.exports = router;