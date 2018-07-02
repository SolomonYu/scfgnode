//Author: Solomon Yu
//June 2018



var http = require('http');
var express = require('express');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var serverIndex = require('serve-index');
 
 //setting ports, intializing app
var app = express();
var port = process.env.PORT || 3000;
// app.set('port', port); 
// app.set('views', path.join(__dirname, 'views'));

var dburl = "mongodb://admin:123456a@ds018238.mlab.com:18238/scfgdatabase";
var database;
var collection;
MongoClient.connect(dburl, function(err, client){
  if (err) console.log(err);
  console.log('database connected');
  database = client.db('scfgdatabase'); // use
  collection = database.collection('documents'); // db.documents
  //collection.deleteMany();
});

var sampleUser = {
  name: "billybob",
  email: "billybob@yes.com",
  description: "i like chocolate milk",
  location: 1
};

//app
// parsing body
app.use(express.json());
app.use(express.urlencoded( { extended:false} ));

var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['htm','html'],
  index: "index.html"
}

app.use('/', function(req,res,next){
  console.log(req.method, 'request:', req.url, JSON.stringify(req.body));
  next();
});

app.use('/', express.static('./pub_html', options));
app.use('/files', serverIndex('pub_html/files', {'icons': true}));


//For signing in: See if user exists, if not, then put a new user into db
//at the moment, also use this for getting user info
app.get(/signin/, function(req,res,next){
  var usertofind = "billybob@yes.com"
  var existingusers = collection.find({"email": usertofind}).count()
  .then(function(login){
      console.log("checking if user exists");
      existingusers = login;
      existCheck(req,res,next,existingusers,usertofind);
    });

});

function existCheck(req,res,next,existingusers,usertofind){
  var userjson;
  var loadeduser;
  if (existingusers >= 1){
    console.log("user already exists");
    //load user info
    collection.findOne({"email": usertofind})
    .then(function(tempuser){
      loadeduser = tempuser;
      loadThisUser(req,res,next,loadeduser);
    });

    //res.end();
  }
  else{
    console.log("Player has been registered");
    console.log(sampleUser);
    //put player into database
    collection.insertOne(sampleUser, (err,resulet) => {
      if (err) console.log(err);
    });
    //load user info
    collection.findOne({"email": usertofind})
    .then(function(tempuser){
      loadeduser = tempuser;
      loadThisUser(req,res,next,loadeduser);
    });

    //res.end();

  }
}

function loadThisUser(req,res,next,loadeduser){
  console.log(loadeduser);
  console.log("loaded user info");
  console.log(req.query.id);
  res.send(loadeduser);
  res.end();
}


//updates database.. assume user also is updated locally, in interest of time
app.get(/updateinfo/, function(req,res,next){
  var fieldToUpdate = "name";
  var aspectToUpdate = "newname";
  var userToUpdate = "solomon@yes.com";
  var updateStatus;

  var toSearchfor = { "email": userToUpdate };
  var toSet = { $set: { name : aspectToUpdate } };

  collection.update(toSearchfor,toSet, function(err,res){
    if(err) throw err;
    console.log("user updated");
  });
  res.send(aspectToUpdate);
  res.end();
});


///show all users in database
app.get(/displayall/, function(req,res,next){
  var userArray;
  collection.find({}).toArray()
  .then(function(tempArray){
    userArray = tempArray;
    loadThisUser(req,res,next,userArray);
  });
});







//dealing with 404 page
app.use(function (req, res, next) {
  res.status(404).send("*notices your error page* OwO what's this?");
});


http.createServer(app).listen(port);
console.log('running on port',port);