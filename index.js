const express = require('express');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const port = process.env.PORT;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.omdlsoo.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//middleware
app.use(express.json())
app.use(cors());

//mongodb
async function run() {
    try {
        await client.connect()
        const usersCollection = client.db('JOBBOX').collection('users');
        const jobsCollection = client.db('JOBBOX').collection('job');
        const conversationCollection = client.db('JOBBOX').collection('conversation')
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
                return res.send({ status: true, data: result })
            }
            res.send({ status: false })

        })
        //post a user from his/her registration
        app.post('/user', async (req, res) => {
            const userData = req.body;
            const result = await usersCollection.insertOne(userData);
            res.status(200).send(result);
        })
        //post a job
        app.post('/job', async (req, res) => {
            const data = req.body;
            const result = await jobsCollection.insertOne(data);
            res.send(result);
        })
        //get all the jobs
        app.get('/jobs', async (req, res) => {
            const result = await jobsCollection.find({}).toArray();
            res.send({ status: true, data: result })
        })
        //get specific job
        app.get('/job/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await jobsCollection.findOne(filter);
            res.send({ status: true, data: result });
        })
        //update job applicants to that job
        app.patch('/apply', async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const filter = { _id: ObjectId(jobId) };
            const updatedDoc = {
                $push: {
                    applicants: { id: ObjectId(userId), email: email }
                }
            };
            const result = await jobsCollection.updateOne(filter, updatedDoc);
            if (result.acknowledged) {
                return res.send({ status: true, data: result })
            }
            res.send({ status: false })
        })
        //get applied jobs of an user
        app.get('/applied-jobs/:email', async (req, res) => {
            const email = req.params.email;
            const query = { applicants: { $elemMatch: { email: email } } };
            const cursor = jobsCollection.find(query).project({ applicants: 0 });
            const result = await cursor.toArray();
            res.send({ status: true, data: result })
        })
        // enable/disable/close a job
        app.patch('/closeJob', async (req, res) => {
            const jobId = req.body.jobId;
            const filter = { _id: ObjectId(jobId) }
            const selectedJob = await jobsCollection.findOne(filter);
            let newJobState = true;
            if (selectedJob.jobState) {
                newJobState = false
            }
            const updatedDoc = {
                $set: {
                    jobState: newJobState
                }
            };
            const result = await jobsCollection.updateOne(filter, updatedDoc);
            if (result.acknowledged) {
                return res.send({ status: true, data: result })
            }
            res.send({ status: false })
        })
        //get only the applied jobs
        app.get('/job-applicants', async (req, res) => {
            const filter = { "applicants": { $exists: true, $ne: [] } }
            const result = await jobsCollection.find(filter).toArray();
            res.send(result)
        })
        //get job-applied user
        app.get('/applicant/:id', async (req, res) => {
            const applicantId = req.params.id;
            const filter = { _id: ObjectId(applicantId) }
            const result = await usersCollection.findOne(filter);
            res.send({ status: true, data: result })
        })
        //insert question of user in that job
        app.patch('/query', async (req, res) => {
            const userId = req.body.userId;
            const jobId = req.body.jobId;
            const email = req.body.email;
            const question = req.body.question;
            const filter = { _id: ObjectId(jobId) };
            const updatedDoc = {
                $push: {
                    queries: {
                        id: ObjectId(userId),
                        email: email,
                        question: question,
                        reply: []
                    }
                }
            }
            const result = await jobsCollection.updateOne(filter, updatedDoc);
            if (result.acknowledged) {
                return res.send({ status: true, data: result })
            }
            res.send({ status: false })
        })
        //insert reply of employer in that job
        app.patch('/reply', async (req, res) => {
            const userId = req.body.userId;
            const reply = req.body.reply;
            const filter = { "queries.id": ObjectId(userId) };
            const updatedDoc = {
                $push: {
                    "queries.$[user].reply": reply
                },
            };
            const arrayFilter = {
                arrayFilters: [{ "user.id": ObjectId(userId) }]
            };
            const result = await jobsCollection.updateOne(filter, updatedDoc, arrayFilter);
            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
        })
        //conversation part
        //insert message of employer in that job
        app.patch('/employer-message', async (req, res) => {
            const jobId = req.body.jobId;
            const candidateId = req.body.candidateId;
            const candidateEmail = req.body.candidateEmail;
            const employerEmail = req.body.employerEmail;
            const employerMessage = req.body.employerMessage;
            const filter = { _id: ObjectId(jobId) };
            const updatedDoc = {
                $push: {
                    conversation: {
                        jobId,
                        candidateId: ObjectId(candidateId),
                        candidateEmail,
                        employerEmail,
                        employerMessage,
                        candidateMessage: []
                    }
                }
            }
            const result = await jobsCollection.updateOne(filter, updatedDoc);
            if (result.acknowledged) {
                return res.send({ status: true, data: result })
            }
            res.send({ status: false })
        })
        //candidate message
        app.patch('/candidate-message', async (req, res) => {
            const candidateId = req.body.candidateId;
            const candidateMessage = req.body.candidateMessage;
            const filter = { "conversation.candidateId": ObjectId(candidateId) };
            const updatedDoc = {
                $push: {
                    "conversation.$[user].candidateMessage": candidateMessage
                },
            };
            const arrayFilter = {
                arrayFilters: [{ "user.candidateId": ObjectId(candidateId) }]
            };
            const result = await jobsCollection.updateOne(filter, updatedDoc, arrayFilter);
            if (result.acknowledged) {
                return res.send({ status: true, data: result });
            }

            res.send({ status: false });
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