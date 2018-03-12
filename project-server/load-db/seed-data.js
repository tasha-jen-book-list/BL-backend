'use strict'

const client = require('../db-client');

client.query(`

`)
    .then(
        () => console.log('db task successful'),
        err => console.error(err)
    )
    .then(() => client.end());