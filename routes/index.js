var express = require('express');
var router = express.Router();
var fs = require('fs');
var s3 = require('s3');

/* GET home page. */
router.get('/', function (req, res, next) {
    
    res.send('EVOWEBSERVICES');

});

module.exports = router;