/**
 * Created by barrett on 8/28/14.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE ' + dbconfig.database);

connection.query('\
CREATE TABLE `' + dbconfig.database + '`.`' + dbconfig.users_table + '` ( \
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, \
    `username` VARCHAR(20) NOT NULL, \
    `password` CHAR(60) NOT NULL, \
    `email` VARCHAR(45) NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
        PRIMARY KEY (`id`), \
    UNIQUE INDEX `id_UNIQUE` (`id` ASC), \
    UNIQUE INDEX `username_UNIQUE` (`username` ASC) \
)');

connection.query('\
    CREATE TABLE IF NOT EXISTS  `' + dbconfig.database + '`.`' + dbconfig.device_table + '` (\
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\
    `device_name` VARCHAR(45) NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
    PRIMARY KEY (`id`)\
)');

connection.query('\
    CREATE TABLE IF NOT EXISTS  `' + dbconfig.database + '`.`' + dbconfig.product_stock_table + '` (\
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\
    `product_name` VARCHAR(45) NOT NULL,\
    `weight_default` VARCHAR(45) NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
    PRIMARY KEY (`id`)\
)');
connection.query('\
    CREATE TABLE IF NOT EXISTS `house_db`.`device_has_users` (\
    `device_id` INT UNSIGNED NOT NULL,\
    `users_id` INT UNSIGNED NOT NULL,\
    PRIMARY KEY (`device_id`, `users_id`),\
    INDEX `fk_device_has_users_users1_idx` (`users_id` ASC),\
    CONSTRAINT `fk_device_has_users_device1`\
        FOREIGN KEY (`device_id`)\
        REFERENCES `house_db`.`device` (`id`)\
        ON DELETE NO ACTION\
        ON UPDATE NO ACTION,\
    CONSTRAINT `fk_device_has_users_users1`\
        FOREIGN KEY (`users_id`)\
        REFERENCES `house_db`.`users` (`id`)\
        ON DELETE NO ACTION\
        ON UPDATE NO ACTION)\
');

connection.query('\
    CREATE TABLE IF NOT EXISTS `house_db`.`device_has_product_stock` (\
      `stock` INT NOT NULL,\
    `stocked_weight` FLOAT NOT NULL,\
    `expiration_date` DATE NOT NULL,\
    `state` TINYINT NOT NULL,\
    `previous_weight` FLOAT NOT NULL,\
    `product_stock_id` INT UNSIGNED NOT NULL,\
    `device_id` INT UNSIGNED NOT NULL,\
    INDEX `fk_device_has_product_stock_product_stock1_idx` (`product_stock_id` ASC),\
    INDEX `fk_device_has_product_stock_device1_idx` (`device_id` ASC),\
    PRIMARY KEY (`product_stock_id`, `device_id`),\
    CONSTRAINT `fk_device_has_product_stock_product_stock1`\
        FOREIGN KEY (`product_stock_id`)\
        REFERENCES `house_db`.`product_stock` (`id`)\
        ON DELETE NO ACTION\
        ON UPDATE NO ACTION,\
    CONSTRAINT `fk_device_has_product_stock_device1`\
        FOREIGN KEY (`device_id`)\
        REFERENCES `house_db`.`device` (`id`)\
        ON DELETE NO ACTION\
        ON UPDATE NO ACTION)\
');

console.log('Success: Database Created!');

connection.end();
