var express = require('express');
var router = express.Router();
var fs = require('fs');

/* GET home page. */
router.get('/', function(req, res, next) {

    var vm = {
        title: 'index'
    }

    res.render('index', vm);

});


module.exports = router;