const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const port = process.env.PORT;
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.omdlsoo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//middlewares
app.use(express.json())
app.use(cors());

//mongodb
async function run() {
    try {
        await client.connect()
        const usersCollection = client.db('JOBBOX').collection('users');

        //get all the users
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find({}).toArray();
            res.send(result)
        })
        //get specific user
        app.get('/user/:email', async (req, res, next) => {
            const email = req.params.email;
            const result = await usersCollection.findOne({ email: email })
            if (result) {
              return  res.send({ status: true, data: result })
            }
            res.send({ status: false })

        })
        //post a user from his/her registration
        app.post('/user', async (req, res) => {
            const userData = req.body;
            const result = await usersCollection.insertOne(userData);
            res.status(200).send(result);
        })

    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("<h1>Hello from JOB BOX server!</h1>")
})
app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})