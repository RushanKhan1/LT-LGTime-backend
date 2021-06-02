const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
require("dotenv").config();



let SaltRounds = 5;

mongoose.connect("mongodb+srv://" + process.env.DB_USER + ":" + process.env.DB_PASS + "@cluster0.2zug1.mongodb.net/listiee?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true});

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
    image: String
}); 

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});


const Post = mongoose.model("Post", postSchema);
const User = mongoose.model("User", userSchema); 


const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));

app.use(express.static("public"));


app.use(cors());

app.use(express.json());

app.route("/posts") // chained route handlers

   .get((req, res) => {
       Post.find({}, (err, docs) => {
	   if(err){
	       console.log(err);
	   }
	   else {
	       res.status(201).json(docs);
	   }
       })
   })

   .post((req, res, next) => {

       // verifying the user.       
       jwt.verify(req.header("token"), "somestring", (err, decoded) => {
	   if (err) { res.status(500).json(err) }
	   else if (decoded === undefined) {
	       res.status(401).json({ "message": "Authentication Failed" });
	   }
	   else {
	       const post = new Post({
		   title: req.body.title,
		   content: req.body.content,
		   image: req.body.image
	       })
	       post.save((err) => {
		   if(err){
		       res.status(501).json(err)
		   }
		   else {
		       res.status(201).json({
			   "message": "New post added"
		       })
		   }
	       })
	       
	       
	   }
	   
       } );




   })

app.route("/posts/:id")
   .delete((req, res) => {

 jwt.verify(req.header("token"), "somestring", (err, decoded) => {
	   if (err) { console.log(err); res.status(501).json(err) }
	   else if (decoded === undefined) {
	       res.status(401).json({ "message": "Authentication Failed" });
	   }
	   else {
	       Post.deleteOne({_id: req.params.id}, (err) => {
		   if(!err){
		       res.status(201).json("Deleted the post: " + req.params.id);
	   }
		   else {
		       console.log(err)
		   }
	       })
	   }
 }
 )	
       

       
  })


app.route("/signup")
   .post((req, res) => {

	   console.log(req.body.email + " " + req.body.password)

      
let Token;

       const payload = {
	   user: {
	       email: req.body.email 
	   }
       }

       jwt.sign(
	   payload, "somestring", {
	       expiresIn: 1000
	   },
	   (err, token) => {
	       if (err) res.status(501).json(err);
	       else Token = token// token to be stored on client side
	   }
       )

 // checking if user already exists
       
       User.countDocuments({email: req.body.email}, (err, count) => {
	   if(err){
		   throw err;
	   }
	   else {
	       if (count > 0) {

		   res.status(401).json({
		       "message": "User already exists",
		   })
	       }
	       else {


		   let salt = bcrypt.genSaltSync(SaltRounds);
		   let hash = bcrypt.hashSync(req.body.password, salt);
		       

		   let user = new User({
		       email: req.body.email,
		       password: hash
		   })

		   user.save((err) => {
		       if(err){
			   res.status(402).json(err)
		       }
		       else {
			   res.status(201).json({
			       "message": "User Added",
				"token": Token
			   })
		       }
		   })

	       }
	       
	   }	
       }
       )

   })



app.route("/login")
   .post((req, res) => {


	   let Token;
       const payload = {
	   user: {
	       email: req.body.email 
	   }
       }

       jwt.sign(
	   payload, "somestring", {
	       expiresIn: 1000
	   },
	   (err, token) => {
	       if (err) res.status(501).json(err);
	       else Token = token;
	   }
       )


       
       


       // checking if the user exists	

       User.findOne({email: req.body.email}, (err, user) => {
	   if(err) {
	       res.status(501).json(err);
	   }	
	   else {
	       if(user) {
		   // match users password
		   let success = bcrypt.compareSync(req.body.password, user.password);
		   if(success) {
		       res.status(201).json({

			   "message": "Login Successful",
			       "token": Token


		       })


		   }
		   else {
		       res.status(401).json({
			   "message": "Wrong Password"})}
	       }
	       else res.status(401).json({
		   "message": "User doesn't exist"})


	   }
       })

   })



let port = process.env.PORT;
if(port == null || port == ""){
    port = 3000;
}

app.listen(port, function() {
    console.log("Server started successfully.");
});


