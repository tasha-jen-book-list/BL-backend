'use strict'

const client = require('../db-client');

client.query(`
    CREATE TABLE IF NOT EXIST books (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn CHAR(21),
        image_url VARCHAR(max),
        description VARCHAR(max)
    )
`)
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());