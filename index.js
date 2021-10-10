const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.taqt5.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(fileUpload());

const admin = require("firebase-admin");

var serviceAccount = require("./go-green-recycling-firebase-adminsdk-g8oba-77f95b308a.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const port = process.env.PORT || 7000;

app.get("/", (req, res) => {
  res.send("hello from db it's working working");
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const productCollection = client
    .db("go-green-recycling")
    .collection("products");
  const shipmentCollection = client
    .db("go-green-recycling")
    .collection("shipmentInfo");
  const adminCollection = client.db("go-green-recycling").collection("admins");
  const reviewCollection = client
    .db("go-green-recycling")
    .collection("reviews");
  const cartShipmentCollection = client
    .db("go-green-recycling")
    .collection("cartShipmentInfo");
  //add product collection
  app.post("/addProduct", (req, res) => {
    const file = req.files.file;
    const productName = req.body.name;
    const price = req.body.price;
    const description = req.body.description;

    const newImg = file.data;
    const encImg = newImg.toString("base64");
    const image = {
      contentType: file.mimetype,
      size: file.size,
      img: Buffer.from(encImg, "base64"),
    };

    productCollection
      .insertOne({ productName, description, price, image })
      .then((result) => {
        res.send(result.insertedCount > 0);
      });
  });

  //Get all products from database..

  app.get("/allProduct", (req, res) => {
    productCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  //Shipment Information post..
  app.post("/shipments", (req, res) => {
    const newOrder = req.body;
    console.log(newOrder);
    shipmentCollection.insertOne(newOrder).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  //Shipment Information post for Cart option..
  app.post("/cartProduct", (req, res) => {
    const newOrder = req.body;
    cartShipmentCollection.insertOne(newOrder).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });
  //Shipment Information get for Cart option..

  app.get("/showCartOrder", (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = bearer.split(" ")[1];
      
      // idToken comes from the client app
      admin
        .auth()
        .verifyIdToken(idToken)
        .then((decodedToken) => {
          const uid = decodedToken.uid;
          console.log(uid);
            if(uid){
              cartShipmentCollection.find({ email: req.query.email })
              .toArray((err, items) => {
                console.log(items);
                  res.send(items)
              })
            }
        })
        .catch((error) => {
          // Handle error
        });
    }
  });

  //Order Information matching by Id..
  app.get("/product/:id", (req, res) => {
    productCollection
      .find({ _id: ObjectId(req.params.id) })
      .toArray((err, items) => {
        res.send(items);
      });
  });

  //booklist for user
  app.get("/showCustomersOrder", (req, res) => {
 
              shipmentCollection.find({ email: req.query.email })
              .toArray((err, items) => {
                  res.send(items)
              })
            

   
  });

  //post a admin.

  app.post("/addAdmin", (req, res) => {
    const email = req.body.email;
    adminCollection.insertOne({ email }).then((result) => {
      console.log(result);
    });
  });
  //checked by admin...
  app.post("/isAdmin", (req, res) => {
    const email = req.body.email;
    adminCollection.find({ email: email }).toArray((err, admins) => {
      res.send(admins.length > 0);
    });
  });

  //customer all orders by admin..
  app.post("/orderlistByAdmin", (req, res) => {
    const email = req.body.email;
    adminCollection.find({ email: email }).toArray((err, email) => {
      if (email.length === 0) {
        console.log("email is empty");
      }

      shipmentCollection.find({}).toArray((err, documents) => {
        res.send(documents);
      });
    });
  });

  //delete a product from database.

  app.delete("/productDelete/:id", (req, res) => {
    productCollection
      .findOneAndDelete({ _id: ObjectId(req.params.id) })
      .then((document) => {
        res.redirect("/");
      });
  });

  //post a review  information.

  app.post("/addReview", (req, res) => {
    const file = req.files.file;
    const name = req.body.name;
    const designation = req.body.designation;
    const comment = req.body.comment;
    const newImg = file.data;
    const encImg = newImg.toString("base64");

    const image = {
      contentType: file.mimetype,
      size: file.size,
      img: Buffer.from(encImg, "base64"),
    };

    reviewCollection
      .insertOne({ name, designation, comment, image })
      .then((result) => {
        res.send(result.insertedCount > 0);
      });
  });

  //read reviews from database.
  app.get("/reviews", (req, res) => {
    reviewCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
