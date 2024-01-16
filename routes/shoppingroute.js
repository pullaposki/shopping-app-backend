const express = require("express");
const itemModel = require("../models/item");

let router = express.Router();

// Get all user items of an user
router.get("/shopping",function(req,res) {
	
	// a query object that holds the current session's user
	let query = {"user":req.session.user}
	
	// execute a find operation using the query object
	itemModel.find(query).then(function(items) {
		return res.status(200).json(items)
	}).catch(function(err) {
		console.log(err);
		return res.status(500).json({"Message":"Internal server error"});
	})
})

// Save an item
router.post("/shopping",function(req,res) {
	if(!req.body) {
		return res.status(400).json({"Message":"Bad request"})
	}
	if(!req.body.type) {
		return res.status(400).json({"Message":"Bad request"})
	}
	
	// create item from request
	let item = new itemModel({
		type:req.body.type,
		count:req.body.count,
		price:req.body.price,
		user:req.session.user
	})
	
	// save() is a mongoose method used to store a document. This function returns a Promise
	item.save().then(function(item) {
		return res.status(201).json(item)
	}).catch(function(err) {
		console.log(err);
		return res.status(500).json({"Message":"Internal server error"});
	})
})

// Deleta an item
router.delete("/shopping/:id",function(req,res) {
	
	// deletes the document where the _id matches req.params.id
	itemModel.deleteOne({"_id":req.params.id,"user":req.session.user}).then(function(stats) {
		console.log(stats);
		return res.status(200).json({"Message":"Success"})
	}).catch(function(err) {
		console.log(err);
		return res.status(500).json({"Message":"Internal server error"});
	})
})

router.put("/shopping/:id",function(req,res) {
	if(!req.body) {
		return res.status(400).json({"Message":"Bad request"})
	}
	if(!req.body.type) {
		return res.status(400).json({"Message":"Bad request"})
	}
	let item = {
		type:req.body.type,
		count:req.body.count,
		price:req.body.price,
		user:req.session.user
	}
	itemModel.replaceOne({"_id":req.params.id,"user":req.session.user},item).then(function(stats) {
		console.log(stats);
		return res.status(200).json({"Message":"Success"})
	}).catch(function(err) {
		console.log(err);
		return res.status(500).json({"Message":"Internal server error"});
	})
})

module.exports = router;