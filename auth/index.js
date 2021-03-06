const { isLoggedIn } = require('./middlewares');

const express = require('express'),
      router = express.Router(),
      fetch = require('node-fetch'),
      AuthenticationClient = require('auth0').AuthenticationClient,
      requestIp = require('request-ip');

const auth0 = new AuthenticationClient({
  domain: process.env.DOMAIN,
  clientId: process.env.CLIENTID,
  clientSecret: process.env.CLIENTSECRET
});

const Stats = require('../models/Stats');

function respondError500(res, next) {
  res.status(500);
  const error = new Error('Unable to load');
  next(error);
}


// any route in here is pre-pended with /auth
router.get('/', (req, res) => {
  res.json({
    message:  '🔐'
  });
});


// @desc  log which CTA button was clicked
// @route   POST /whichCTA
router.post('/whichCTA', async (req, res, next) => {
  // Get the visitor's IP
  // It will be used to determine which CTA button the user has registered with
  let clientIp = requestIp.getClientIp(req);

  let insertObject = {
    statsType: 'whichCTA',
    ip: clientIp,
    whichCTA: req.body.whichCTA
  }

  // Store the data asynchronously to eliminate any delay
  await Stats.create(insertObject, async (err, result) => {
    if( err ) return;
  });

  return res.json({ 'status': 'done' });
});

// Connect to the Auth0 Management API
auth0.clientCredentialsGrant({ audience: 'https://dev-h1e424j0.us.auth0.com/api/v2/'}, (err, response) => {
  if (err) return respondError500(res, next);

  // @desc  resend verification email
  // @route   POST /verification-email
  router.post('/verification-email', async (req, res, next) => {
    let user_id = req.body.user_id;

    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/jobs/verification-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`,
      },
      body: JSON.stringify({ "user_id": user_id, "client_id": process.env.CLIENTID})
    })
    .then(( res ) => res.json() )
    .then(( response ) => {
      if(response.status == "pending") return res.json({ "status": "pending" });
      return respondError500(res, next);
    });
  });

  // @desc  GET user metadata from the Auth0 Management API
  // @route   GET /getUserMetadata
  router.get('/getUserMetadata', isLoggedIn, async (req, res, next) => {
    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/users/' + req.user.sub, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`
      },
    })
    .then(res => res.json())
    .then(( result ) => {
      return res.json({ role: result.user_metadata.role, phone: result.user_metadata.phone });
    });
  });

  // @desc    change user metadata through the Auth0 Management API
  // @route   POST /changeUserMetadata
  router.post('/changeUserMetadata', isLoggedIn, async (req, res, next) => {
    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/users/' + req.user.sub, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`
      },
      body: JSON.stringify({ "user_metadata": { role: req.body.role, phone: req.body.phone } })
    })
    .then(res => res.json())
    .then(( result ) => {
      return res.json({state: 'changed.', newRole: result.user_metadata.role, newPhone: result.user_metadata.phone });
    });
  });

  // @desc notify the subscription state: changed or not
  // @route   POST /planchanged
  router.post('/planchanged', isLoggedIn, async (req, res, next) => {
    // Request the Management API to get the subscription metadata
    await fetch('https://dev-h1e424j0.us.auth0.com/api/v2/users/' + req.user.sub, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${response.access_token}`
      },
    })
    .then(( res ) => res.json() )
    .then(( response ) => {
      let subscriptionType = req.user['https://www.dev-h1e424j0.us.auth0.com.subscription'];

      // notify changes if the API returns a different metadata than the user's ID token have
      if(response.app_metadata && response.app_metadata.subscription !== subscriptionType) {
        return res.json({
          "planName": response.app_metadata.subscription,
          "refresh_the_Token": true
        })
      }
      // notify the user is already updated
      return res.json({ "refresh_the_Token": false })
    });
  });
});


module.exports = router;