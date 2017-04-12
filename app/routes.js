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


    app.get('/product_item', function(req,res){

    });

    app.post('/product_item',function(req,res){
        var product_id = req.body.product_id;
        var device_id = req.body.device_id;

        var expiration_date;        //TODO: No idea were to get -> No Idea ??? Oo
        var actual_weight;          //TODO: No idea were to get -> Deve vir do Pi
        var previous_weight = 0;    //TODO: No idea were to get -> Se o produto é novo não havia stock antes

        var updated_on = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() - ((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
        connection.query("SELECT * FROM `product_item` WHERE `product_id`='"+ product_id +"', and  `device_id`= '"+ device_id +"'",function(err0, rows0, fields0){
            if (err) throw err;
            if(rows0.length === 0){
                connection.beginTransaction(function (err) {
                    connection.query("INSERT INTO `product_item`(`id`, `product_id`, `device_id`, `actual_weight`, `expiration_date`, `previous_weight`, `updated_on`) " +
                        "VALUES ('" + product_id + "','" + device_id + "','" + actual_weight + "','" + expiration_date + "','" + previous_weight + "','" + updated_on + "')", function (err1, rows1, filter1) {
                        if (err) {
                            connection.rollback(function () {
                                throw err;
                            });
                            res.json({'state':'error', 'message': err});
                        }
                        connection.commit(function (err) {
                            if (err) {
                                connection.rollback(function () {
                                    throw err;
                                });
                            }
                            res.json({'state':'success'});
                        });
                    });
                });
            }else{
                res.json({'state':'error','message':'already exists'});
            }
        });
    });

    app.get('/product/:product_id/weight', function(req,res){
        var product_id = req.params.product_id;
        var device_id = req.body.device_id;
        var current_weight = -1;
	    connection.query("SELECT  `actual_weight`, `previous_weight` FROM `product_item` WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'",function (err,row,field) {
            for(var i in row){
                current_weight = row[i].actual_weight;
            }

            req.json({'success':'success', 'data':current_weight });
        });
    });

    app.post('/product/:product_id/weight', function(req,res){
        var product_id = req.params.product_id;
        var device_id = req.body.device_id;
        var current_weight = -1;
        var previous_weight = -1;
        connection.query("SELECT  `actual_weight`, `previous_weight` FROM `product_item` WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'",function (err,row,field) {
            for(var i in row){
                previous_weight = row[i].actual_weight;
            }
            connection.query("UPDATE `product_item` SET `actual_weight`='"+ current_weight +"',`previous_weight`='"+ previous_weight +"'" +
                "WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'",function(err,row,field){

                req.json({'success':'success'});
            });
        });
    });

    /*app.get('/product/:product_id/stock', function(req,res){
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

    app.get('/product/:product_id/expiration_date',function(req,res){
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
    });

    app.get('/shopping_list', function(req,res){
        var sql = "SELECT product_stock.product_name, device_has_product_stock.stock FROM device_has_product_stock " +
            "JOIN product_stock ON product_stock.id = device_has_product_stock.product_stock_id WHERE state='TOBUY'";
        connection.query(sql, function (err, rows, fields) {
            res.send({'shopping_list': JSON.stringify(rows)});
        });
    });

    app.post('/shopping_list', function (req, res) {
        var product_name = req.body.product_name;
        console.log(product_name);
        var sql = "SELECT id FROM product_stock WHERE product_stock.product_name ='" + product_name + "'";
        connection.query(sql, function (err, rows, fields) {
            if (err) throw err;
            if (rows.length === 0) {
                res.send('unable to add product to shopping list (invalid product name)');
            } else {
                for (var i in rows) {
                    var query = "UPDATE device_has_product_stock SET state = 'TOBUY' WHERE  product_stock_id ='" + rows[i].id + "'";
                    console.log(query);
                    connection.query(query, function (err, lines, fields) {
                        res.send("updated");
                    });
                }
            }
        });
    });

    app.delete('/shopping_list', function (req, res) {
        var product_name = req.body.product_name;
        console.log(product_name);
        var sql = "SELECT id FROM product_stock WHERE product_stock.product_name ='" + product_name + "'";
        connection.query(sql, function (err, rows, fields) {
            if (err) throw err;
            if (rows.length === 0) {
                res.send('unable to add product to shopping list (invalid product name)');
            } else {
                for (var i in rows) {
                    var query = "UPDATE device_has_product_stock SET state = 'DISABLE' WHERE  product_stock_id ='" + rows[i].id + "'";
                    console.log(query);
                    connection.query(query, function (err, lines, fields) {
                        res.send("updated");
                    });
                }
            }
        });
    });
*/
    app.post('/device',function(req,res) {
        var device_name = req.body.device_name;
        console.log(Date.now());
        console.log(device_name);
        var formatedMysqlString = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() - ((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
        connection.query('SELECT `id`, `device_name`, `updated_on` FROM `device` WHERE device_name="'+device_name+'"', function (err, rows, fields) {
            if (err) throw err;
            console.log(rows.length);
            if (rows.length !== 0) {
                for (i in rows) {
                    res.send('The device already exists' + rows[i].id);
                }
            } else {
                connection.beginTransaction(function (err) {
                    connection.query('INSERT INTO `device`(`device_name`, `updated_on`) VALUES ("' + device_name + '","' + formatedMysqlString + '")', function (err, rows, fields) {
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
                        res.send('Device added ' + device_name);
                    });
                });
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
