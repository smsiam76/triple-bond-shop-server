const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.fc0jkus.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
console.log('undifiend', process.env.ACCESS_TOKEN_SECRET);
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // collection name
        const userCollection = client.db("tbsDB").collection("users");
        const productCollection = client.db("tbsDB").collection("products");
        const cartCollection = client.db("tbsDB").collection("carts");
        const checkOutCollection = client.db("tbsDB").collection("checkout")
        const completeOrderCollection = client.db("tbsDB").collection("completeOrders")


        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1];
            console.log('token verify token', token);
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })

        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }

        // users related api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'user already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await userCollection.findOne(query)
            res.send(result);
        })
        app.patch('users/:email', async (req, res) => {
            const email = req.params.email;
            const { name } = req.body;
            console.log({ name, email });
            const filter = { email: email }
            const updateDoc = {
                $set: { name: name }
            }
            const options = { returnOriginal: false };
            const updateUser = await userCollection.findOneAndUpdate(filter, updateDoc, options)
            res.send(updateUser)
        })
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const user = await userCollection.findOne(filter);
            const newRole = user.role === 'admin' ? 'user' : 'admin'
            const updateDoc = {
                $set: {
                    role: newRole
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })
        app.patch('/users/disabled/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const user = await userCollection.findOne(filter);
            const newStauts = user.status === 'disabled' ? 'active' : 'disabled'
            const updateDoc = {
                $set: {
                    status: newStauts
                }
            }
            const result = await userCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.get('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.findOne(query);
            res.send(result);
        })

        // all products
        app.post('/products', async (req, res) => {
            const productInfo = req.body;
            const result = await productCollection.insertOne(productInfo);
            res.send(result);
        })
        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray();
            res.send(result)
        })
        // get single products
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productCollection.findOne(query);
            res.send(result);
        })
        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/products/:id', async (req, res) => {
            const updateData = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    name: updateData.name,
                    description_1: updateData.description_1,
                    description_2: updateData.description_2,
                    thumbnail: updateData.thumbnail,
                    images: updateData.images,
                    brand: updateData.brand,
                    model: updateData.model,
                    type: updateData.type,
                    price: updateData.price,
                    category: updateData.category,
                    warranty: updateData.warranty,
                    inventory: updateData.inventory,
                    specifications: updateData.specifications,
                    features: updateData.features,
                    others: updateData.others,
                }
            }
            const result = await productCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        // cart related api
        app.post('/cart', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        })
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.findOne(query);
            res.send(result);
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result);
        })
        app.delete('/carts/many/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteMany(query)
            res.send(result);
        })

        // checkout api
        app.post('/checkout', async (req, res) => {
            const checkOutItem = req.body;
            const result = await checkOutCollection.insertOne(checkOutItem);
            res.send(result);
        })
        app.get('/checkout', verifyToken, verifyAdmin, async (req, res) => {
            const result = await checkOutCollection.find().toArray();
            res.send(result);
        })
        app.get('/checkout/details/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await checkOutCollection.findOne(query)
            res.send(result);
        })
        app.patch('/checkout/delivery/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    delivery: 'complete'
                }
            }
            const result = await checkOutCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.patch('/checkout/status/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    status: 'active'
                }
            }
            const result = await checkOutCollection.updateOne(filter, updateDoc)
            res.send(result);
        })
        app.get('/checkout/email', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await checkOutCollection.find(query).toArray();
            res.send(result);
        })
        app.delete('/checkout/details/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await checkOutCollection.deleteOne(query);
            res.send(result)
        })

        // payment or complete order
        app.post('/completeOrders', verifyToken, verifyAdmin, async (req, res) => {
            const completeOrder = req.body;
            const result = await completeOrderCollection.insertOne(completeOrder);
            res.send(result);
        })
        app.get('/completeOrders', verifyToken, verifyAdmin, async (req, res) => {
            const result = await completeOrderCollection.find().toArray();
            res.send(result);
        })

        // all stats and analytics
        app.get('/adminStats', verifyToken, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const products = await productCollection.estimatedDocumentCount();
            const orders = await checkOutCollection.estimatedDocumentCount();
            const completeOrders = await completeOrderCollection.estimatedDocumentCount();

            const result = await completeOrderCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: {
                            $sum: '$payment'
                        }
                    }
                }
            ]).toArray();
            const revenue = result.length > 0 ? result[0].totalRevenue : 0;

            res.send({
                users, products, orders, revenue, completeOrders
            })
        })

        app.get('/orderStats', async (req, res) => {
            const result = await completeOrderCollection.aggregate([
                // {
                //     $unwind: '$productId'
                // },
                // {
                //     $lookup: {
                //         from: 'products',
                //         localField: 'productId',
                //         foreignField: '_id',
                //         as: 'habijabi'
                //     }
                // },
                {
                    $unwind: "$manageOrder.cartItems" // Unwind cartItems array
                },
                {
                    $group: {
                        _id: '$manageOrder.cartItems.productId',
                        quantity: { $sum: { $toInt: '$manageOrder.cartItems.quantity' } },
                        revenue: { $sum: '$manageOrder.cartItems.price' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        orderNo: '$_id',
                        quantity: '$quantity',
                        revenue: '$revenue'
                    }
                }
            ]).toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})