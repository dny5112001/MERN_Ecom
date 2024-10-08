const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { strict } = require("assert");
const { connected } = require("process");
// const { allowedNodeEnvironmentFlags } = require('process');

app.use(express.json());
app.use(cors());

// Database connection with mongodb
mongoose.connect(
  "Add your own api"
);

//API creation
app.get("/", (req, res) => {
  res.send("Express APP is running");
});

//Image Storage Engine
const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

const upload = multer({ storage: storage });

//creating upload endpoint for images

app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `http://localhost:${port}/images/${req.file.filename}`,
  });
});

//Schema for creating products

const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id = 1;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    // console.log(last_product_array)
    let last_product = last_product_array[0];
    // console.log(last_product)
    id = last_product.id + 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  console.log(product);
  await product.save();
  console.log("saved");
  res.json({
    success: 1,
    name: req.body.name,
  });
});

// Creating API for deleting products

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("removed");
  res.json({
    success: 1,
    name: req.body.name,
  });
});

// Creating API for getting all products

app.get("/allproducts", async (req, res) => {
  let products = await Product.find({});
  console.log("all products fetched");
  res.send(products);
});

//  Schema creating for user model

const Users = mongoose.model("Users", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },

  date: {
    type: Date,
    default: Date.now,
  },
});

// Creating End point for registering the user

app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "Existing user found with same email id",
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }
  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });
  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };
  // const secret = process.env.JWT_SECRET || 'default_secret';

  // if (!secret) {
  //     throw new Error('JWT secret is not defined');
  // }

  const token = jwt.sign(data, "secret_ecom");

  res.json({
    success: true,
    token,
  });
});

// Creating endpoint for user login

app.post("/login", async (req, res) => {
  let user = await Users.findOne({ email: req.body.email });
  console.log(user);
  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "secret_ecom");
      res.json({ success: true, token });
    } else {
      res.json({
        success: false,
        errors: "Wrong Password",
      });
    }
  } else {
    res.json({ success: false, errors: "wrong Email id" });
  }
});

//  Creating Endpoint for the newcollection data

app.get("/newcollection", async (req, res) => {
  let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log("Newcollection fetched");
  res.send(newcollection);
});

// creating endpoint for popular in women section

app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popular_in_women = products.slice(0, 4);
  console.log("Popular in women fetched");
  res.send(popular_in_women);
});

//  creating middleware to fetch user

const fetchUser = async (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    res.status(401).send({
      errors: "Please authenticate using valid token",
    });
  } else {
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (err) {
      res
        .status(401)
        .send({ errors: "Please authenticate using a valid token" });
    }
  }
};

// creating the endpoints adding the cart data
app.post("/addtocart", fetchUser, async (req, res) => {
  console.log("added", req.body.itemId);
  try {
    let userdata = await Users.findOne({ _id: req.user.id });
    // console.log(userdata)
    userdata.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userdata.cartData }
    );
    userdata = await Users.findOne({ _id: req.user.id });
    console.log("added the product into cart");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server Error");
  }
});

// creating endpoint to remove the product data

app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);
  let userdata = await Users.findOne({ _id: req.user.id });
  if (userdata.cartData[req.body.itemId] > 0) {
    userdata.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate(
      { _id: req.user.id },
      { cartData: userdata.cartData }
    );
    res.send("Removed");
    console.log("removed");
  }
});

// creating endpoint for getting the cart data

app.post("/getcart", fetchUser, async (req, res) => {
  console.log("Getcart");
  let userData = await Users.findOne({ _id: req.user.id });
  // console.log(userData.cartData)
  res.json(userData.cartData);
});
app.listen(port, (error) => {
  if (!error) {
    console.log(`Server is running on port: ${port}`);
  } else {
    console.log(`Error : ${error}`);
  }
});
