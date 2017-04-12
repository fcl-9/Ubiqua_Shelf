// app/routes.js
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var dbconfig = require('../config/database.js');
var connection = mysql.createConnection(dbconfig.connection);
connection.query('USE ' + dbconfig.database);

module.exports = function(app, passport) {

	// =====================================
	// HOME PAGE (with login links) ========
	// =====================================
	//app.get('/', function(req, res) {
	//	res.render('index.ejs'); // load the index.ejs file
	//});

	// =====================================
	// LOGIN ===============================
	// =====================================
	// show the login form
	app.get('/', function(req, res) {

		// render the page and pass in any flash data if it exists
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	// process the login form
	app.post('/', passport.authenticate('local-login', {
            successRedirect : '/profile', // redirect to the secure profile section
            failureRedirect : '/', // redirect back to the signup page if there is an error
            failureFlash : true // allow flash messages
		}),
        function(req, res) {
            console.log("hello");

            if (req.body.remember) {
              req.session.cookie.maxAge = 1000 * 60 * 3;
            } else {
              req.session.cookie.expires = false;
            }
        res.redirect('/');
    });

	// =====================================
	// SIGNUP ==============================
	// =====================================
	// show the signup form
	app.get('/signup', function(req, res) {
		// render the page and pass in any flash data if it exists
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	// process the signup form
	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect : '/profile', // redirect to the secure profile section
		failureRedirect : '/signup', // redirect back to the signup page if there is an error
		failureFlash : true // allow flash messages
	}));

	// =====================================
	// PROFILE SECTION =========================
	// =====================================
	// we will want this protected so you have to be logged in to visit
	// we will use route middleware to verify this (the isLoggedIn function)
	app.get('/profile', isLoggedIn, function(req, res) {
		res.render('profile.ejs', {
			user : req.user // get the user out of session and pass to template
		});
	});

	// =====================================
	// LOGOUT ==============================
	// =====================================
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});


	app.get('/stock',isLoggedIn, function(req,res){
		res.render('stock.ejs',{
			user: req.user
		});
	});

	app.get('/recipe',isLoggedIn, function(req,res){
		res.render('recipe.ejs',{
			user: req.user
		});
	});

	app.get('/settings',isLoggedIn, function(req,res){
		res.render('settings.ejs',{
			user: req.user
		});
	});

	app.get('/sensor',isLoggedIn, function(req,res){
		res.render('sensor.ejs',{
			user: req.user
		});
	});

	app.get('/shopping_list',isLoggedIn, function(req,res){
		res.render('shopping_list.ejs',{
			user: req.user
		});
	});

    app.get('/product', function(req,res){
        connection.query("SELECT * FROM `device_has_product_stock` ", function(err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if(rows.length === 0){

                res.send({'products':'error'});
            }
            for (var i in rows) {
                res.send({'products':JSON.stringify(rows) });
            }
        });
    });

    app.post('/product',function(req,res){
        // TODO READ VARS FROM POST REQUEST
        var product_id = req.body.device_name;
        var device_id ="";
        var state = 0;
        var previous_weight = 0;
        var stocked_weight = 0;
        var stock = 0;
        var expiration_date = Date.now();
        connection.query("SELECT * FROM `device_has_product_stock` WHERE product_stock_id = ", function(err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if (rows.length === 0) {
                connection.beginTransaction(function (err) {
                    connection.query("INSERT INTO `device_has_product_stock`(`stock`, `stocked_weight`, `expiration_date`, `state`, `previous_weight`, `product_stock_id`, `device_id`) " +
                        "VALUES ('" + stock + "','" + stocked_weight + "','" + expiration_date + "','" + state + "','" + previous_weight + "','" + product_id + "','" + device_id + "')", function (err, rows, fields) {
                        if (err) {
                            connection.rollback(function () {
                                throw err;
                            });
                        }
                        connection.commit(function (err) {
                            if (err) {
                                connection.rollback(function () {
                                    throw err;
                                });
                            }
                        });
                        res.send('New Product Added');
                    });
                });
            }
            else {
                res.send("No product was added. It already exists");
            }
        });
    });

    app.get('/product/:product_id/weight', function(req,res){
        connection.query("SELECT stocked_weight FROM `device_has_product_stock` where product_stock_id=" + req.params.product_id, function(err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if(rows.length === 0){

				res.send({'stocked_weight':'error'});
			}
            for (var i in rows) {
                res.send({'stocked_weight':rows[i].stocked_weight });
            }
        });
	});

    app.post('/product/:product_id/weight', function(req,res){
        //TODO VARS COME IN JSON NEED TO DEFINE A STRUCTURE FOR THEM.
        var device_name = req.body.device_name;
        var product_stock_id = req.params.product_id;
        var stocked_weight = req.body.stocked_weight;

        connection.query("SELECT * FROM `device_has_product_stock` WHERE `product_stock_id`="+product_stock_id+" and `device_id`="+device_name+"",function(err, rows, fields){
            if (err) throw err;
            for(i in rows){
                connection.query("UPDATE `device_has_product_stock` SET `previous_weight`=`"+rows[i].stocked_weight+"` WHERE `product_stock_id`="+product_stock_id+" and `device_id`="+device_name+"",function(err, rows, fields) {
                    if (err) throw err;
                });
                connection.query("UPDATE `device_has_product_stock` SET `stocked_weight`=`"+stocked_weight+"` WHERE `product_stock_id`="+product_stock_id+" and `device_id`="+device_name+"",function(err, rows, fields) {
                    if (err) throw err;
                    res.send('Update Weight');
                });
            }
        });
    });

    app.get('/product/:product_id/stock', function(req,res){
        connection.query("SELECT state FROM `device_has_product_stock` where product_stock_id=" + req.params.product_id, function(err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if(rows.length === 0){

                res.send({'state':'error'});
            }
            for (var i in rows) {
                res.send({'state':rows[i].state });
            }
        });
    });

    app.post('/product/:product_id/stock')

    /*app.get('/product/:product_id/expiration_date',function(req,res){
        connection.query("SELECT expiration_date FROM `device_has_product_stock` where product_stock_id=" + req.params.product_id, function(err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if(rows.length === 0){

                res.send({'expiration_date':'error'});
            }
            for (var i in rows) {
                res.send({'expiration_date':rows[i].expiration_date });
            }
        });
    });*/

    app.get('/shopping_list', function(req,res){
        connection.query("SELECT * FROM `device_has_product_stock` where state='TOBUY'", function(err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if(rows.length === 0){
                res.send({'c':'Non'});
            }
            for (var i in rows) {
                res.send({'expiration_date':rows[i].expiration_date });
            }
        });
    });

    app.get('/device', function(req,res){
    });

    app.post('/device',function(req,res) {
        var device_name = req.body.device_name;
        console.log(Date.now());
        console.log(device_name);
        var formatedMysqlString = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() - ((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
        connection.query('SELECT `id`, `device_name`, `updated_on` FROM `device` WHERE device_name="'+device_name+'"', function (err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if(rows.length === 0){
                connection.beginTransaction(function(err) {
                    connection.query('INSERT INTO `device`(`device_name`, `updated_on`) VALUES ("' + device_name + '","' + formatedMysqlString + '")', function (err, rows, fields) {
                        if (err) {
                            connection.rollback(function() {
                                throw err;
                            });
                        }
                        connection.commit(function(err) {
                            if (err) {
                                connection.rollback(function () {
                                    throw err;
                                });
                            }
                        });
                        res.send('Device added '+ device_name);
                    });
                });
            }else{
                res.send('The device already exists');
            }

        });


    });
};

// route middleware to make sure
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/');
}
