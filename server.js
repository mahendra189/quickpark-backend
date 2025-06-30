require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;
const { neon } = require('@neondatabase/serverless');

const uuid = require('uuid'); // Importing uuid to generate unique IDs
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    console.error("Database environment variables are missing. Please check your .env file.");
    process.exit(1);
}

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
    const spaces = await getAllSpaces();
    res.json(spaces);
});

// Endpoint to get a specific space by id
app.get('/spaces/:id', async (req, res) => {
    const { id } = req.params;
    const space = await sql`SELECT * FROM spaces.spaces WHERE id = ${id}`;
    if (space.length === 0) {
        return res.status(404).json({ error: "Space not found" });
    }
    res.json(space[0]);
});




// const createSpace = async (id, vehicle, price, per, rating, slots, createdId, location) => {
//     // example url with params -> /create-space
//     // const { id, price, per, rating, slots, createdId, location } = {id: 21, price: 100, per: 0, rating: 4.5, slots: 10, createdId: 1, location: Array([18.434,23.434])};
//     const result = await sql`INSERT INTO spaces.spaces (id, vehicle, price, per, rating, slots, "createdId", location) VALUES (${id}, ${vehicle}, ${price}, ${per}, ${rating}, ${slots}, ${createdId}, ${location}) RETURNING *`;
//     return result;
// }; 

const createSpace = async (id, vehicle, price, per, rating, slots, createdId, location) => {
    const [lat, lon] = location; // Assuming location = [latitude, longitude]
    const result = await sql`
        INSERT INTO spaces.spaces (
            id, vehicle, price, per, rating, slots, "createdId", location
        ) VALUES (
            ${id}, ${vehicle}, ${price}, ${per}, ${rating}, ${slots}, ${createdId},
            ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        ) RETURNING *`;
    return result;
};



const findNearbySpaces = async (lat, lon, vehicle) => {
    const radiusMeters = 5000;
    const result = await sql`
        SELECT 
            id, vehicle, price, per, rating, slots,
            ST_Y(location::geometry) AS latitude,
            ST_X(location::geometry) AS longitude,
            ST_Distance(location, ST_MakePoint(${lon}, ${lat})::geography) AS distance
        FROM spaces.spaces
        WHERE 
            ST_DWithin(location, ST_MakePoint(${lon}, ${lat})::geography, ${radiusMeters})
            AND vehicle = ${vehicle}
        ORDER BY distance ASC;
    `;
    return result.map(row => ({
        ...row,
        coords: {
            latitude: row.latitude,
            longitude: row.longitude,
        },
        distance: row.distance
    }));
};

const getAllSpaces = async () => {
    const result = await sql`
    SELECT 
      id, vehicle, price, per, rating, slots,
      ST_Y(location::geometry) AS latitude,
      ST_X(location::geometry) AS longitude
    FROM spaces.spaces;
  `;

    return result.map(row => ({
        ...row,
        coords: {
            latitude: row.latitude,
            longitude: row.longitude,
        }
    }));
};




// Endpoint to create a new space
app.post('/create-space', async (req, res) => {
    try {
        console.log("Creating space with data:", req.body);
        // {
        //     "vehicle": vehicle.type,
        //     "price": vehicle.charge.value,
        //     "per": vehicle.charge.type,
        //     "rating": 5,
        //     "slots": vehicle.count,
        //     "createdId": user?.uid || 0,
        //     "location": [18.434, 23.434]
        //   }
        const id = Math.floor(100000 + Math.random() * 900000);



        const result = await createSpace(id, req.body.vehicle, req.body.price, req.body.per, req.body.rating, req.body.slots, req.body.createdId, req.body.location);
        res.status(201).json(result);
    } catch (error) {
        console.error("Error creating space:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});





// Endpoint to find nearby spaces
app.get('/find-nearby-spaces', async (req, res) => {
    try {
        const { lat, lon, vehicle } = req.query;
        // Example URL: /find-nearby-spaces?lat=18.434&lon=23.434
        console.log("Finding nearby spaces for coordinates:", lat, lon);
        if (!lat || !lon) {
            return res.status(400).json({ error: "Latitude and longitude are required." })
        }
        const nearbySpaces = await findNearbySpaces(lat, lon, vehicle);
        if (nearbySpaces.length === 0) {
            return res.status(404).json({ message: "No nearby spaces found." })
        }
        res.status(200).json(nearbySpaces);

    }
    catch (error) {
        console.error("Error finding nearby spaces:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});






// create user

const createUser = async (name, email, mobile) => {
    const result = await sql`
        INSERT INTO users.users (name, email, mobile)
        VALUES (${name}, ${email}, ${mobile})
        RETURNING id, name, email, mobile
    `;
    return result;
}
app.post('/create-user',async (req, res) => {
    const {name,email,mobile} = req.body;
    console.log(name,email,mobile)
    const response  = await createUser(name,email,mobile)
    return res.status(200).json(response)

})



app.post('/update-user', async (req, res) => {
    const { id, name, email, mobile } = req.body;
    console.log(id,name,email,mobile)
    try {
        const response = await sql`
            UPDATE users.users
            SET name = ${name}, email = ${email}, mobile = ${mobile}
            WHERE id = ${id}
            RETURNING id, name, email, mobile
        `;
        res.status(200).json(response);
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/get-user',async (req,res) => {
    const {email} = req.query;
    console.log(email)
    const response = await sql`SELECT * FROM users.users WHERE email = ${email}`
    if (response) {
        return res.status(200).json(response)

    }
    else {
        return res.status(400)
    }

})



app.get('/history-user',async (req,res) => {
    try {

        const {id} = req.query;
        const response = await sql`SELECT * FROM history.history WHERE user_id=${id}`
        return res.status(200).json(response)
    }
    catch (err) {
        console.log("error getting user history: ",err)
        return res.status(400)
    }


})
app.get('/history-space',async (req,res) => {
    try {

        const {space_id} = req.query;
        const response = await sql`SELECT * FROM history.history WHERE space_id=${space_id}`
        return res.status(200).json(response)
    }
    catch (err) {
        console.log("error getting space history: ",err)
        return res.status(400)
    }


})


app.post("/add-history",async (req,res) => {
    try {

        const {id,date,space_id} = req.body;
        const response = await sql`INSERT INTO history.history (user_id,date,space_id) VALUES (${id},${date},${space}) RETURNING user_id , date, space_id`
        return res.status(200).json(response)
    }
    catch (err) {
        console.log("Error in inserting history",err)
        return res.status(400)
    }
})
// add space history






app.get('/', (req, res) => {
    res.send("Hello World! Node JS Server is running.\n Using Neon Database.");

});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})



