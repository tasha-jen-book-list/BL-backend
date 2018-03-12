'use strict'

const client = require('../db-client');

client.query(`
    DROP TABLE IF EXISTS books;
`)
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());