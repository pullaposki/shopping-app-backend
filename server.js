const express = require("express");
const mongoose = require("mongoose");
const shoppingRoute = require("./routes/shoppingroute");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const userModel = require("./models/user");
const sessionModel = require("./models/session");

let app = express();

const mongo_url = process.env.MONGODB_URL;
const mongo_user = process.env.MONGODB_USER;
const mongo_password = process.env.MONGODB_PASSWORD;
const url = "mongodb+srv://"+mongo_user+":"+mongo_password+"@"+mongo_url+"/shoppingdatabase?retryWrites=true&w=majority"

app.use(express.json());

mongoose.connect(url).then(
	() => console.log("Connected to MongoDB"),
	(err) => console.log("Failed to connect to MongoDB. Reason",err)
)

//MIDDLEWARES

const time_to_live_diff = 3600000;

createToken = () => {
	let token = crypto.randomBytes(64);
	return token.toString("hex");
}

isUserLogged = (req,res,next) => {
	if(!req.headers.token) {
		return res.status(403).json({"Message":"Forbidden"})
	}
	
	//If the token exists, it uses the sessionModel to find a session from the database where the token is same as the token provided in the request header.
	sessionModel.findOne({"token":req.headers.token}).then(function(session) {
		if(!session) {
			return res.status(403).json({"Message":"Forbidden"})
		}
		let now = Date.now();
		if(now > session.ttl) {
			sessionModel.deleteOne({"_id":session._id}).then(function() {
				return res.status(403).json({"Message":"Forbidden"})
			}).catch(function(err) {
				console.log(err);
				return res.status(403).json({"Message":"Forbidden"})
			})
		} else {
			session.ttl = now + time_to_live_diff;
			req.session = {};
			req.session.user = session.user;
			session.save().then(function() {
				return next();
			}).catch(function(err) {
				console.log(err);
				return next();
			})
		}
	}).catch(function(err) {
		console.log(err);
		return res.status(403).json({"Message":"Forbidden"})
	})
}

//LOGIN API

app.post("/register",function(req,res) {
	if(!req.body) {
		return res.status(400).json({"Message":"Bad request"})
	}
	if(!req.body.username || !req.body.password) {
		return res.status(400).json({"Message":"Bad request"})
	}
	if(req.body.username < 4 || req.body.password < 8) {
		return res.status(400).json({"Message":"Bad request"})
	}
	
	// bcrypt.hash(req.body.password,14,function(err,hash) {...}) : This line is calling the bcrypt.hash function, which is an asynchronous function used to hash the plaintext password. "14" is the number of rounds to use when generating a salt.
	bcrypt.hash(req.body.password,14,function(err,hash) {
		if(err) {
			console.log(err);
			return res.status(500).json({"Message":"Internal Server Error"})
		}
		let user = new userModel({
			"username":req.body.username,
			"password":hash
		})
		
		// This instantiates a new userModel object with the hashed password and the username from the request body and then calls the save method on the model to store it in the database. This operation is asynchronous and returns a Promise.
		user.save().then(function(){
			return res.status(200).json({"Message":"Register Success"})
		}).catch(function(err) {
			if(err.code === 11000) {
				return res.status(409).json({"Message":"Username is already in use"})
			}
			console.log(err);
			return res.status(500).json({"Message":"Internal Server Error"});
		})
	})
})

app.post("/login",function(req,res) {
	if(!req.body) {
		return res.status(400).json({"Message":"Bad request"})
	}
	if(!req.body.username || !req.body.password) {
		return res.status(400).json({"Message":"Bad request"})
	}
	if(req.body.username < 4 || req.body.password < 8) {
		return res.status(400).json({"Message":"Bad request"})
	}
	userModel.findOne({"username":req.body.username}).then(function(user) {
		if(!user) {
			return res.status(401).json({"Message":"Unauthorized"})
		}
		
		// If the user does exist, it then uses the bcrypt.compare() method to check if the provided password matches the hashed password stored in the database
		bcrypt.compare(req.body.password,user.password,function(err,success) {
			if(err) {
				console.log(err);
				return res.status(500).json({"Message":"Internal Server Error"})
			}
			if(!success) {
				return res.status(401).json({"Message":"Unauthorized"})
			}
			
			let token = createToken();
			let now = Date.now();
			let session = new sessionModel({
				"user":req.body.username,
				"ttl":now+time_to_live_diff,
				"token":token
			})
			session.save().then(function(session) {
				return res.status(200).json({"token":token})
			}).catch(function(err) {
				console.log(err);
				return res.status(500).json({"Message":"Internal Server Error"})
			})
		})
	}).catch(function(err) {
		console.log(err);
		return res.status(500).json({"Message":"Internal Server Error"})
	})
})

app.post("/logout",function(req,res) {
	// it checks if the token is present in the headers of the request
	if(!req.headers.token) {
		return res.status(404).json({"Message":"Not found"})
	}
	
	// query sessionModel to delete one document that matches {"token":req.headers.token}
	// Deletes the first document that matches conditions from the collection
	sessionModel.deleteOne({"token":req.headers.token}).then(function() {
		return res.status(200).json({"Message":"Logged out"})
	}).catch(function(err) {
		console.log(err);
		return res.status(500).json({"Message":"Internal Server Error"})
	})
})

app.use("/api",isUserLogged,shoppingRoute);

let port = process.env.PORT || 3000;

app.listen(port);

console.log("Running in port",port);

