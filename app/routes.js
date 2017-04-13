// app/routes.js
var mysql = require('mysql');
var bcrypt = require('bcrypt-nodejs');
var dbconfig = require('../config/database.js');
var connection = mysql.createConnection(dbconfig.connection);
var http = require('http');
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

	app.get('/sensor', isLoggedIn, function(req,res){
        switch (req.accepts(['json', 'html'])) { //#D
            case 'html':
                res.render('sensor.ejs', {
                    user: req.user
                });
                return;
            default:
                var options = {
                    host: 'localhost',
                    port: '8484',
                    path: '/pi/sensors'
                };
                callback = function(response) {
                    var str = '';

                    //another chunk of data has been recieved, so append it to `str`
                    response.on('data', function (chunk) {
                        str += chunk;
                    });
                    //the whole response has been recieved, so we just print it out here
                    response.on('end', function () {
                        res.send(str);
                    });
                }
                http.request(options, callback).end();
                return;
        }
    });

    app.post('/api/sensor/data',function(req,res){
        var device_id = req.body.device_id;
        var beacon_uid = JSON.parse(req.body.beacons); //Array of JSONS
        var total_weight = req.body.wight;
        var new_products = [];
        var missing_product = [];
        var existing_product_out = [];
        connection.query("SELECT id, state  FROM `product_item`",function(err,existing_products,fields){
            for(var i in beacon_uid) {
                for (var j in existing_products) {
                    if(beacon_uid[i].uuid !== existing_products[j].id){
                        new_products.push(beacon_uid[i]);
                    }else{
                        //A detected id was removed in a previous time
                        if(existing_products[j].state === "OUT"){
                            existing_product_out.push(existing_products[j].id);
                        }
                    }
                    for(k in beacon_uid){
                        if(existing_products[j].id !== beacon_uid[k].uuid){
                            missing_product.push(existing_products[j].id)
                        }
                    }
                }
            }

            connection.query("SELECT SUM(actual_weight) FROM `product_item`",function(err,shelfWeight){
                //Weight only changes when something is remove or add to the shelf.
                if(missing_product.length > 0 ) {
                    var missing_item_weight = shelfWeight - total_weight;
                    var missing_item_state = "OUT";

                    for (var i in missing_product) {
                        connection.query("SELECT `actual_weight` FROM `product_item` WHERE id='"+missing_product[i]+"'", function (error,previous_weight) {
                            var updated_on = (new Date((new Date((new Date(new Date())).toISOString())).getTime() - ((new Date()).getTimezoneOffset() * 60000))).toISOString().slice(0, 19).replace('T', ' ');

                            var queryString = "UPDATE `product_item` SET `actual_weight`='" + missing_item_weight + "',`previous_weight`='" + previous_weight + "',`updated_on`='" + updated_on + "'," +
                                "`state`='" + missing_item_state + "',`device_id`='" + device_id + "' WHERE id='" + missing_product[i] + "'";
                            console.log(queryString);//TODO: CHANGE THIS TO RES.JSON
                        });
                    }
                }

                if(new_products.length > 0){
                    var new_item_weight = total_weight - shelfWeight;
                    var new_item_state = "IN";

                    for(var i in new_products) {
                        connection.query("SELECT `actual_weight` FROM `product_item` WHERE id='"+new_products[i].uuid+"'", function (error,previous_weight) {
                            var updated_on = (new Date((new Date((new Date(new Date())).toISOString())).getTime() - ((new Date()).getTimezoneOffset() * 60000))).toISOString().slice(0, 19).replace('T', ' ');
                            var queryString = "INSERT INTO `product_item`(`id`, `actual_weight`, `previous_weight`, `updated_on`, `state`, `distance`, `device_id`, `lot_id`, `lot_product_id`) " +
                                "VALUES ('" + new_products[i].uuid + "','" + new_item_weight + "','" + previous_weight + "','" + updated_on + "','" + new_item_state + "','" + new_products[i].distance + "','" + device_id + "','" + new_products[i].minor + "','" + new_products[i].major + "')";
                            console.log(queryString);//TODO: CHANGE THIS TO RES.JSON
                        });
                    }
                }

                if(existing_product_out.length > 0){
                    var existing_item_weight = total_weight - shelfWeight;
                    var existing_item_state = "IN";

                    for(var i in existing_product_out) {
                        connection.query("SELECT `actual_weight` FROM `product_item` WHERE id='"+existing_product_out[i]+"'", function (error,previous_weight) {
                            var updated_on = (new Date((new Date((new Date(new Date())).toISOString())).getTime() - ((new Date()).getTimezoneOffset() * 60000))).toISOString().slice(0, 19).replace('T', ' ');
                            var queryString = "UPDATE `product_item` SET `actual_weight`='" + existing_item_weight + "',`previous_weight`='" + previous_weight + "',`updated_on`='" + updated_on + "'," +
                                "`state`='" + existing_item_state + "',`device_id`='" + device_id + "' WHERE id='" + existing_product_out[i] + "'";
                            console.log(queryString);//TODO: CHANGE THIS TO RES.JSON
                        });
                    }
                }
            });
        });




        connection.query("SELECT * FROM `product_item` WHERE `product_id`='"+ product_id +"' and  `device_id`= '"+ device_id +"'",function(err0, rows0, fields0){
            if (err0) throw err0;
            if(rows0.length === 0){
                var previous_weight = 0;
                connection.beginTransaction(function (err) {
                    connection.query("INSERT INTO `product_item`( `product_id`, `device_id`, `actual_weight`,  `previous_weight`, `updated_on`) " +
                        "VALUES ('" + product_id + "','" + device_id + "','" + actual_weight + "','" + previous_weight + "','" + updated_on + "')", function (err1, rows1, filter1) {
                        if (err1) {
                            connection.rollback(function () {
                                throw err1;
                            });
                            res.json({'state':'error', 'message': err});
                        }
                        connection.commit(function (err1) {
                            if (err1) {
                                connection.rollback(function () {
                                    throw err1;
                                });
                            }
                            res.send({'state':'success'});
                        });
                    });
                });
            }else{
                res.send({'state':'error','message':'already exists'});
            }
        });
    });

    app.put('/product_item',function(req,res){
        var product_id = req.body.product_id;
        var device_id = req.body.device_id;
        var actual_weight = req.body.actual_weight;
        var updated_on = (new Date ((new Date((new Date(new Date())).toISOString() )).getTime() - ((new Date()).getTimezoneOffset()*60000))).toISOString().slice(0, 19).replace('T', ' ');
        connection.query("SELECT actual_weight FROM `product_item` WHERE `product_id`='"+ product_id +"' and  `device_id`= '"+ device_id +"'",function(err0, rows0, fields0){
            if (err0) throw err0;

        });
    });

    // localhost:8080/product/1/weight?device_id=1
    app.get('/product/:product_id/weight', function(req,res){
        var product_id = req.params.product_id;
        var device_id = req.query.device_id;
        var current_weight = -1;
        console.log("SELECT  `actual_weight`, `previous_weight` FROM `product_item` WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'");
	    connection.query("SELECT  `actual_weight`, `previous_weight` FROM `product_item` WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'",function (err,row,field) {
            if (err) throw err;
            for(var i in row){
                console.log(row[i].actual_weight);
                current_weight = row[i].actual_weight;
            }

            res.json({'success':'success', 'data':current_weight });
        });
    });

    app.post('/product/:product_id/weight', function(req,res){
        var product_id = req.params.product_id;
        var device_id = req.body.device_id;
        var current_weight = req.body.actual_weight;
        var previous_weight = -1;
        connection.query("SELECT  `actual_weight`, `previous_weight` FROM `product_item` WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'",function (err,row,field) {
            if (err) throw err;
            for(var i in row){
                previous_weight = row[i].actual_weight;
            }
            connection.query("UPDATE `product_item` SET `actual_weight`='"+ current_weight +"',`previous_weight`='"+ previous_weight +"'" +
                "WHERE `product_id`='"+product_id+"' and `device_id`='"+device_id+"'",function(err,row,field){
                if (err) throw err;
                res.json({'success':'success'});
            });
        });
    });

    app.get('/product', function (req, res) {
        var sql = "SELECT name, (SELECT count(*) FROM product_item WHERE product_item.product_id = product.id) AS quantity " +
            "FROM product WHERE state='TOBUY'";
        connection.query(sql, function (err, rows, fields) {
            res.send({'shopping_list': JSON.stringify(rows)});
        });
    });

    app.post('/product/:product_id/state', function (req, res) {
        var product_id = req.params.product_id;
        var state = req.body.state;
        console.log("STATE " + state);
        var sql = "SELECT * FROM product WHERE product.id ='" + product_id + "'";
        console.log(sql);
        connection.query(sql, function (err, rows, fields) {
            if (err) throw err;
            if (rows.length === 0) {
                res.send('unable to add product (invalid product id)');
            } else {
                var query = "UPDATE product SET state = '" + state +
                    "' WHERE  product.id ='" + product_id + "'";
                console.log(query);
                connection.query(query, function (err, lines, fields) {
                    res.send("updated");
                });
            }
        });
    });

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
