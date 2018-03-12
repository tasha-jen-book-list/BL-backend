'use strict';

const client = require('../db-client');
const books = require(`./books.json`);

Promise.all(books.map(book => {
    return client.query(`
        INSERT INTO books
        (title, author, isbn, image_url, description)
        VALUES ($1, $2, $3, $4, $5);
    `,
    [book.title, book.author, book.isbn, book.image_url, book.description
    ]);
}))

    .then(
        (response) => console.log(response),
        err => console.error(err)
    )
    .then(() => client.end());