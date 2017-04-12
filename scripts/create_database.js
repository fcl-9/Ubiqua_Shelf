/**
 * Created by barrett on 8/28/14.
 */

var mysql = require('mysql');
var dbconfig = require('../config/database');

var connection = mysql.createConnection(dbconfig.connection);

connection.query('CREATE DATABASE ' + dbconfig.database);

connection.query('\
 CREATE TABLE IF NOT EXISTS `house_db`.`device` (\
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\
    `device_name` VARCHAR(45) NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
    PRIMARY KEY (`id`),\
    UNIQUE INDEX `id_UNIQUE` (`id` ASC))\
');


connection.query('\
    CREATE TABLE IF NOT EXISTS `house_db`.`users` (\
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\
    `username` VARCHAR(45) NOT NULL,\
    `password` VARCHAR(45) NOT NULL,\
    `name` VARCHAR(45) NOT NULL,\
    `email` VARCHAR(45) NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
    PRIMARY KEY (`id`),\
    UNIQUE INDEX `id_UNIQUE` (`id` ASC))\
');

connection.query('\
    CREATE TABLE IF NOT EXISTS `house_db`.`product` (\
    `id` INT UNSIGNED NOT NULL,\
    `name` VARCHAR(255) NOT NULL,\
    `default_weight` FLOAT NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
    `state` ENUM("DISABLE", "TOBUY", "ONSTOCK") NOT NULL,\
    `description` VARCHAR(255) NOT NULL,\
    PRIMARY KEY (`id`),\
    UNIQUE INDEX `id_UNIQUE` (`id` ASC))\
 ');

connection.query('\
    CREATE TABLE IF NOT EXISTS `house_db`.`product_item` (\
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,\
    `actual_weight` FLOAT NOT NULL,\
    `expiration_date` DATE NOT NULL,\
    `previous_weight` FLOAT NOT NULL,\
    `updated_on` DATETIME NOT NULL,\
    `device_id` INT UNSIGNED NOT NULL,\
    `product_id` INT UNSIGNED NOT NULL,\
    PRIMARY KEY (`id`),\
    UNIQUE INDEX `id_UNIQUE` (`id` ASC),\
    INDEX `fk_product_item_device1_idx` (`device_id` ASC),\
    INDEX `fk_product_item_product1_idx` (`product_id` ASC),\
    CONSTRAINT `fk_product_item_device1`\
        FOREIGN KEY (`device_id`)\
        REFERENCES `house_db`.`device` (`id`)\
        ON DELETE NO ACTION\
        ON UPDATE NO ACTION,\
    CONSTRAINT `fk_product_item_product1`\
        FOREIGN KEY (`product_id`)\
        REFERENCES `house_db`.`product` (`id`)\
        ON DELETE NO ACTION\
        ON UPDATE NO ACTION)\
');


connection.query('\
    CREATE TABLE IF NOT EXISTS `house_db`.`device_has_users` (\
    `device_id` INT UNSIGNED NOT NULL,\
    `users_id` INT UNSIGNED NOT NULL,\
    PRIMARY KEY (`device_id`, `users_id`),\
    INDEX `fk_device_has_users_users1_idx` (`users_id` ASC),\
    INDEX `fk_device_has_users_device1_idx` (`device_id` ASC),\
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
console.log('Success: Database Created!');

connection.end();
