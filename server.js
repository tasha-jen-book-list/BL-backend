'use strict';

const env = require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const client = require('./db-client');

app.get('/books', (request, response) => {
    client.query(`
    SELECT id, title, author, isbn, image_url, description 
    FROM books;
    `)
        .then(result => response.send(result.rows))
        .catch(err => {
            console.error(err);
            response.sendStatus(500);
        });
});

app.get('/books/:id', (request, response) => {
    const id = request.params.id;
    
    client.query(`
        SELECT id, title, author, isbn, image_url, description 
        FROM books
        WHERE id=$1;
    `,
    [id]
    )
        .then(result => {
            if(result.rows.length === 0) response.sendStatus(404);
            else response.send(result.rows[0]);
        })
        .catch(err => {
            console.log(err);
            response.sendStatus(500);
        });
});

app.listen(PORT,() => {
    console.log('server running on port', PORT);
});

