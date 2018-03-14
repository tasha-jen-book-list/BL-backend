'use strict';

const env = require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT || 3000;
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true}));

const client = require('./db-client');

function ensureAdmin(request, response, next) {
    // got token?
    const token = request.get('token') || request.query.token;
    if(!token) next({ status: 401, message: 'No token found' });

    // right token?
    else if(token !== ADMIN_PASSPHRASE) next({ status: 403, message: 'Unauthorized' });
    
    // you can pass
    else next();
}

app.get('/admin', (request, response) => {
    ensureAdmin(request, response, err => {
        response.send({ admin: !err });
    });
});

app.put('/books/:id', (request, response, next) => {
    client.query(`
        UPDATE books
        SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5
        WHERE id=$6
        RETURNING title, author, isbn, image_url, description, id;
    `,
    [
        request.body.title,
        request.body.author,
        request.body.isbn,
        request.body.image_url,
        request.body.description,
        request.body.id
    ])
        .then(result => {
            response.send(result.rows[0]);
        })
        .catch(next);

});

app.delete('/books/:id', (request, response, next) => {
    const id = request.params.id;

    client.query(`
        DELETE FROM books
        WHERE id=$1;
    `,
    [id])
        .then(result => {
            response.send({removed: result.rowCount !== 0});
        })
        .catch(next);
});


app.get('/books', (request, response, next) => {
    client.query(`
    SELECT id, title, author, isbn, image_url, description 
    FROM books;
    `)
        .then(result => response.send(result.rows))
        .catch(next);
});

app.get('/books/:id', (request, response, next) => {
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
        .catch(next);
});

app.post('/books', (request, response, next) => {
    const body = request.body;

    client.query(`
        INSERT INTO books (title, author, isbn, image_url, description)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, title, author, isbn, image_url, description;
    `,
    [
        body.title,
        body.author,
        body.isbn,
        body.image_url,
        body.description
    ]
    )
        .then(result => response.send(result.rows[0]))
        .catch(next);
});

// eslint-disable-next-line
app.use((err, request, response, next) => {
    console.error(err);

    if(err.status) {
        response.status(err.status).send({ error: err.message });
    }
    else {
        response.sendStatus(500);
    }
});


app.listen(PORT,() => {
    console.log('server running on port', PORT);
});

