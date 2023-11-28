const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
    username: 'api',
    key: process.env.MAIL_GUN_API_KEY,
});

const port = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://zippy-praline-a2f0eb.netlify.app'
    ],
    credentials: true
}));
app.use(express.json());
// app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mwjflvc.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        //jwt
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        //middle wares
        const verifyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        };

        //verify admin after token
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        };




        //property collection
        const propertyCollection = client.db("propertyDB").collection("property");
        app.get('/property', async (req, res) => {
            const result = await propertyCollection.find().toArray();
            res.send(result);
        });

        app.get('/property/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { property_image: 1, property_title: 1, agent_name: 1, agent_email: 1, property_description: 1, property_location: 1, price_range: 1, verification_status: 1, agent_image: 1 },
            };
            const result = await propertyCollection.findOne(query, options);
            res.send(result);
        });

        app.post("/property", async (req, res) => {
            const order = req.body;
            const result = await propertyCollection.insertOne(order);
            res.send(result);
        });

        app.patch('/property/:id', async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    property_title: data.property_title,
                    property_image: data.property_image,
                    property_location: data.property_location,
                    agent_name: data.agent_name,
                    agent_email: data.agent_email,
                    agent_image: data.agent_image,
                    price_range: data.price_range,
                    verification_status: data.verification_status,
                    property_description: data.property_description
                }
            }

            const result = await propertyCollection.updateOne(filter, updatedDoc)
            res.send(result);
        });


        app.delete('/property/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await propertyCollection.deleteOne(query);
            res.send(result);
        });



        //wished collection
        const wishedCollection = client.db("wishedPropertyDB").collection("wishedProperty");
        app.post("/wishedProperty", async (req, res) => {
            const order = req.body;
            const result = await wishedCollection.insertOne(order);
            res.send(result);
        });

        app.get("/wishedProperty", async (req, res) => {
            const result = await wishedCollection.find().toArray();
            res.send(result);
        });

        app.get('/wishedProperty/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { property_title: 1, property_image: 1, agent_name: 1, agent_email: 1, property_location: 1, price_range: 1 },
            };
            const result = await wishedCollection.findOne(query, options);
            res.send(result);
        });

        app.delete('/wishedProperty/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await wishedCollection.deleteOne(query);
            res.send(result);
        });

        //review collection
        const reviewCollection = client.db("reviewDB").collection("review");
        app.get("/review", async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        });

        app.post("/review", async (req, res) => {
            const order = req.body;
            const result = await reviewCollection.insertOne(order);
            res.send(result);
        });

        app.delete('/review/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await reviewCollection.deleteOne(query);
            res.send(result);
        });

        //user collection 
        const userCollection = client.db("userDb").collection("user");
        app.post('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.get("/user", async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        app.patch('/user/:id', async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: data.name,
                    email: data.email,
                    profile: data.profile,
                    role: data.role
                }
            }

            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result);
        });


        //admin verify
        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'Admin';
            }
            res.send({ admin });
        });

        //agent verify
        app.get('/user/agent/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let agent = false;
            if (user) {
                agent = user?.role === 'Agent';
            }
            res.send({ agent });
        });


        //user verify
        app.get('/user/general/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let general = false;
            if (user) {
                general = user?.role !== 'Agent' || user?.role !== 'Admin';
            }
            res.send({ agent });
        });


        //offered collection
        const offeredCollection = client.db("offeredDB").collection("offered");
        app.post("/offeredProperty", async (req, res) => {
            const order = req.body;
            const result = await offeredCollection.insertOne(order);
            res.send(result);
        });

        app.get("/offeredProperty", async (req, res) => {
            const result = await offeredCollection.find().toArray();
            res.send(result);
        });

        app.get('/offeredProperty/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { propertyName: 1, propertyLocation: 1, property_image: 1, agentName: 1, buyerName: 1, buyerEmail: 1, offeredAmount: 1, orderedDate: 1, status: 1 },
            };
            const result = await offeredCollection.findOne(query, options);
            res.send(result);
        });

        app.patch('/offeredProperty/:id', async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    propertyName: data.propertyName,
                    propertyLocation: data.propertyLocation,
                    property_image: data.property_image,
                    agentName: data.agentName,
                    agentEmail: data.agentEmail,
                    buyerName: data.buyerName,
                    buyerEmail: data.buyerEmail,
                    offeredAmount: data.offeredAmount,
                    orderedDate: data.orderedDate,
                    status: data.status
                }
            }

            const result = await offeredCollection.updateOne(filter, updatedDoc)
            res.send(result);
        });


        //advertise collection
        const advertiseCollection = client.db("advertiseDB").collection("advertise");
        app.post("/advertiseProperty", async (req, res) => {
            const order = req.body;
            const result = await advertiseCollection.insertOne(order);
            res.send(result);
        });

        app.get("/advertiseProperty", async (req, res) => {
            const result = await advertiseCollection.find().toArray();
            res.send(result);
        });

        app.patch('/advertiseProperty/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    advertise_status: 'Advertised'
                }
            }
            const result = await advertiseCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.delete('/advertiseProperty/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await advertiseCollection.deleteOne(query);
            res.send(result);
        });

        app.get('/advertiseProperty/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const options = {
                projection: { property_image: 1, property_title: 1, agent_name: 1, agent_email: 1, property_description: 1, property_location: 1, price_range: 1, verification_status: 1, agent_image: 1 },
            };
            const result = await advertiseCollection.findOne(query, options);
            res.send(result);
        });


        // payment intent
        // app.post('/create-payment-intent', async (req, res) => {
        //     const { price } = req.body;
        //     const amount = parseInt(price * 100);
        //     console.log(amount, 'amount inside the intent')

        //     const paymentIntent = await stripe.paymentIntents.create({
        //         amount: amount,
        //         currency: 'usd',
        //         payment_method_types: ['card']
        //     });

        //     res.send({
        //         clientSecret: paymentIntent.client_secret
        //     })
        // });


        const paymentCollection = client.db("paymentDB").collection("payment");

        app.post("/payments", async (req, res) => {
            const order = req.body;
            const result = await paymentCollection.insertOne(order);
            res.send(result);
        });

        app.get('/payments', async (req, res) => {
            const query = { email: req.params.email }
            // if (req.params.email !== req.decoded.email) {
            //     return res.status(403).send({ message: 'forbidden access' });
            // }
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        });

        app.get("/payments", async (req, res) => {
            const result = await paymentCollection.find().toArray();
            res.send(result);
        });

        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment);

            //  carefully delete each item from the cart
            console.log('payment info', payment);
            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            };

            const deleteResult = await cartCollection.deleteMany(query);

            // mg.messages
            //     .create(process.env.MAIL_SENDING_DOMAIN, {
            //         from: "Mailgun Sandbox <postmaster@sandboxbdfffae822db40f6b0ccc96ae1cb28f3.mailgun.org>",
            //         to: ["jhankarmahbub7@gmail.com"],
            //         subject: "Bistro Boss Order Confirmation",
            //         text: "Testing some Mailgun awesomness!",
            //         html: `
            //     <div>
            //       <h2>Thank you for your order</h2>
            //       <h4>Your Transaction Id: <strong>${payment.transactionId}</strong></h4>
            //       <p>We would like to get your feedback about the food</p>
            //     </div>
            //   `
            //     })
            //     .then(msg => console.log(msg)) // logs response data
            //     .catch(err => console.log(err)); // logs any error`;

            res.send({ paymentResult, deleteResult });


        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('Food is coming')
})

app.listen(port, () => {
    console.log(`Food is running on port ${port}`);
})
