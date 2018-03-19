'use strict';

const env = require('dotenv').config(); //eslint-disable-line
const DATABASE_URL = process.env.DATABASE_URL;

const pg = require('pg');
const express = require('express'); //eslint-disable-line

const client = new pg.Client(DATABASE_URL);
client.connect();
client.on('error', err => {
    console.error(err);
});
console.log('I run');
module.exports = client;