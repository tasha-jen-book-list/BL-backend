'use strict';

const env = require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;

const pg = require('pg');
const express = require('express');

const client = new pg.Client(DATABASE_URL);
client.connect();
client.on('error', err => {
    console.error(err);
});

module.exports = client;