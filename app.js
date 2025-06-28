require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { neon } = require('@neondatabase/serverless');

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const sql = neon(`postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require`);

async function getSpaces() {
    // spaces if a table in the database 
    // i want the data from the spaces table
    // this is a simple query to get all the data from the spaces table
    console.log("Fetching spaces from the database...");
    // await sql`CREATE TABLE IF NOT EXISTS spaces (id SERIAL PRIMARY KEY, name TEXT, location TEXT)`;
    // await sql`INSERT INTO spaces (name, location) VALUES ('Space 1', 'Location 1'), ('Space 2', 'Location 2') ON CONFLICT DO NOTHING
    // `;
    // const result = await sql`SELECT * FROM spaces`;
    // console.log(result);
    const result = await sql`SELECT * FROM spaces.spaces`;
    console.log(result);
}

app.use(cors());
app.use(express.json());
// Endpoint to get spaces from the database
app.get('/spaces', async (req, res) => {
    const spaces = await sql`SELECT * FROM spaces.spaces`;
    res.json(spaces);
});
// Endpoint to get a specific space by id
app.get('/spaces/:id', async (req, res) => {
    const {id} = req.params;
    const space = await sql`SELECT * FROM spaces.spaces WHERE id = ${id}`;
    if (space.length === 0) {
        return res.status(404).json({error:"Space not found"});
    }
    res.json(space[0]);
});




const createSpace = async () => {
    // example url with params -> /create-space
    const { id, price, per, rating, slots, createdId, location } = [21, 100, 0, 4.5, 10, 1, Array([18.434,23.434])];
    const result = await sql`INSERT INTO spaces.spaces (id, price, per, rating, slots, "createdId", location) VALUES (${id}, ${price}, ${per}, ${rating}, ${slots}, ${createdId}, ${location}) RETURNING *`;
    console.log("Space created:", result);
    return result;
}; 
// Endpoint to create a new space
app.post('/create-space', async (req, res) => {
    try {
        const result = await createSpace();
        res.status(201).json(result);
    } catch (error) {
        console.error("Error creating space:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/', (req, res) => {
    res.send("Hello World! Node JS Server is running.\n Using Neon Database.");

});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})



