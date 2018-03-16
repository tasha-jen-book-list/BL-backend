'use strict';

const env = require('dotenv').config();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
const GOOGLE_API_URL = process.env.GOOGLE_API_URL;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
const sa = require('superagent');

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

app.put(`/books/:id`, (request, response, next) => {
    const body = request.body;
    
    client.query(`
        UPDATE books
        SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5
        WHERE id=$6
        RETURNING title, author, isbn, image_url, description, id;
    `,
    [
        body.title,
        body.author,
        body.isbn,
        body.image_url,
        body.description,
        request.params.id
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

app.get('/search', (request, response, next) => {

    const search = request.query.search;

    if (!search) {
        return next({status: 400, message: 'search query not provided'});
    }

    sa.get(GOOGLE_API_URL)
        .query({
            q: search.trim(),
        })
        .then(response => {
            const body = response.body;
            const formatted = {

                total: body.totalResults,
                books: body.Search.map(book => {
                    return {
                        title: book.volumeInfo.title,
                        //authors returns an array
                        author: book.volumeInfo.authors,
                        isbn: `ISBN ${book.industryIdentifiers[0].identifier}`,
                        image_url: book.imageLinks.small,
                        description: book.description
                    };
                })
            };
            response.send(formatted);
        })
        .catch(next);
});

app.put('/api/v1/books/import/:id', (request, response, next) => {
    const id = request.params.id;

    sa.get(GOOGLE_API_URL)
        .query({
            i: isbn,
            apikey: GOOGLE_API_KEY
        })
        .then(res => {
            const body = res.body;
            return client.query(`
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

