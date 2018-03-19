'use strict';

const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_API_URL = process.env.GOOGLE_API_URL;

const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const sa = require('superagent');

const app = express();

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const client = require('./db-client');

// ***Admin authorization*** 
function ensureAdmin(request, response, next) {

    const token = request.get('token') || request.query.token;
    if(!token) next({ status: 401, message: 'No token found' });

    else if(token !== ADMIN_PASSPHRASE) next({ status: 403, message: 'Unauthorized' });
    
    else next();
}

app.get('/admin', (request, response) => {
    ensureAdmin(request, response, err => {
        response.send({ admin: !err });
    });
});


// Update to previously exsisting books on the book list
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

// Deletion of previously exsisting books on the book list
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

// Getting books for the book list from the database
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


// Sending information to the view from the database
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

// ****API search for books****
app.get('/volumes/find', (request, response, next) => {

    const search = request.query.q;
    if (!search) {return next({status: 400, message: 'search query not provided'});}

    sa.get(GOOGLE_API_URL)
        .query({
            q: search.trim(),
        })
        .then(res => {
            const array = res.body.items;
            const formatted = {

                total: array.length,
                books: array.map(book => {
                    return {
                        title: book.volumeInfo.title,
                        author: book.volumeInfo.authors, //returns an array
                        isbn: `ISBN_10 ${book.volumeInfo.industryIdentifiers[0].identifier}`,
                        image_url: book.volumeInfo.imageLinks.thumbnail,
                        description: book.volumeInfo.description
                    };
                })
            };
            response.send(formatted);
        })
        .catch(next);
});

app.put('/books/volumes/:isbn', (request, response, next) => {
    const isbn = request.params.isbn;

    sa.get(GOOGLE_API_URL)
        .query({
            q: `isbn:${isbn}`
        })
        .then(res => {
            const book = res.body.items[0].volumeInfo;
            console.log('frogs');
            return client.query(`
                INSERT INTO books (title, author, isbn, image_url, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, title, author, isbn, image_url, description;
            `,
            [
                book.title,
                book.authors, //returns an array
                `ISBN_13 ${book.industryIdentifiers[0].identifier}`,
                book.imageLinks.thumbnail,
                book.description
            ]
            )
                .then(result => response.send(result.rows[0]))
                .catch(next);
        });
});

// app.get('*', (request, response) => {
//     response.redirect(CLIENT_URL);

// });

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

