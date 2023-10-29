const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
// Send token from client to server
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000
require('dotenv').config()
const app = express()


// Send token from client to server
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())

// Send token from client to server
app.use(cookieParser())

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ghkhwep.mongodb.net/?retryWrites=true&w=majority`;
// const uri = 'mongodb://localhost:27017/'

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const logger = async (req, res, next) => {
    // console.log('called', req.hostname, req.originalUrl) //show the path
    next()
}

const varifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    // console.log("value", token)
    if (!token) {
        return res.status(401).send({ message: 'Unauthorized' })
    }
    jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(402).send({ message: 'Forbidden' })
        }
        // console.log('Value in the token', decoded)
        req.user = decoded
        next()
    })
}

async function run() {
    try {

        // await client.connect();


        const productCollection = client.db("ElectronicsProduct").collection("products")
        const categoryCollection = client.db("ElectronicsProduct").collection("categories")
        const selectedCollection = client.db("ElectronicsProduct").collection("selectecProducts")

        // auth related API

        app.post('/jwt', async (req, res) => {
            const user = req.body
            // console.log(user)
            // generate token
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '3h' })
            // res.send(token)
            // console.log(token)


            // store token at the client side  
            // server to client
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    // sameSite: 'none'  //makes problem
                })
                .send({ success: true })
        })

        app.get('/products', async (req, res) => {
            const cursor = productCollection.find()
            const result = await cursor.toArray()
            // console.log("tocken from the client side", req.cookies.token)
            res.send(result)
        })
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

        app.get('/categories', async (req, res) => {
            const cursor = categoryCollection.find()
            const result = await cursor.toArray()
            res.send(result)
        })
        app.get('/products/brand/:brandName', async (req, res) => {
            const category = req.params.brandName
            const query = { brandName: category }
            const product = productCollection.find(query)
            const result = await product.toArray()
            res.send(result)
        })



        app.post('/products', async (req, res) => {
            const product = req.body
            const result = await productCollection.insertOne(product)
            // console.log(result)
            res.send(result)
        })

        // add product in cart
        app.post('/carts', async (req, res) => {
            const cart = req.body
            const result = await selectedCollection.insertOne(cart)
            res.send(result)
        })

        app.put('/products/:id', async (req, res) => {
            const id = req.params.id
            const product = req.body
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedProduct = {
                $set: {
                    brandName: product.brandName,
                    name: product.name,
                    price: product.price,
                    rating: product.rating,
                    shortDescription: product.shortDescription,
                    type: product.type


                }
            }
            const result = await productCollection.updateOne(filter, updatedProduct, options)
            res.send(result)
        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

        // for card data

        app.get('/carts', logger, varifyToken, async (req, res) => {
            
            const cursor = selectedCollection.find()
            const result = await cursor.toArray()
            // console.log(result)
            res.send(result)
        })

        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await selectedCollection.deleteOne(query)
            res.send(result)
        })
        app.delete('/carts', async (req, res) => {
            const query = req.body
            const result = await selectedCollection.deleteMany(query)
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Server runnning...........")
})
app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})
