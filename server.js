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
var users;
var postings;
MongoClient.connect(dburl, function(err, client){
  if (err) console.log(err);
  console.log('database connected');
  database = client.db('scfgdatabase'); // use
  users = database.collection('users'); // db.documents
  postings = database.collection('postings');

  //collection.deleteMany();
});



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
app.use(express.json());


//For signing in: See if user exists, if not, then put a new user into db
//at the moment, also use this for getting user info
app.post('/signin', function(req,res,next){
  var userToFind = req.body.email;
  var existingusers = users.find({"email": userToFind}).count()
  .then(function(login){
      console.log("checking if user exists");
      existingusers = login;
      existCheck(req,res,next,existingusers,userToFind);
    });

});

function existCheck(req,res,next,existingusers,userToFind){
  var userjson;
  var loadeduser;
  if (existingusers >= 1){
    console.log("user already exists");
    //load user info
    users.findOne({"email": userToFind})
    .then(function(tempuser){
      loadeduser = tempuser;
      loadThisThing(req,res,next,loadeduser);
    });

    //res.end(); 
  }
  else{
    console.log("Player has been registered");
    var sampleUser = {
      fullName: req.body.fullName,
      email: req.body.email,
      description: ""
    };
    console.log(sampleUser);
    //put player into database
    users.insertOne(sampleUser, (err,result) => {
      if (err) console.log(err);
    });
    //load user info
    users.findOne({"email": userToFind})
    .then(function(tempuser){
      loadeduser = tempuser;
      loadThisThing(req,res,next,loadeduser);
    });

    //res.end();

  }
}

function loadThisThing(req,res,next,toLoad){
  console.log(toLoad);
  console.log("above object loaded");
  res.send(toLoad);
  res.end();
}


//updates database.. assume user also is updated locally, in interest of time
app.get('/updateinfo/', function(req,res,next){
  var fieldToUpdate = "name";
  var aspectToUpdate = "newname";
  var userToUpdate = "solomon@yes.com";
  var updateStatus;

  var toSearchfor = { "email": userToUpdate };
  var toSet = { $set: { name : aspectToUpdate } };

  users.update(toSearchfor,toSet, function(err,res){
    if(err) throw err;
    console.log("user updated");
  });
  res.send(aspectToUpdate);
  res.end();
});


///show all users in database
app.get('/displayall', function(req,res,next){
  var userArray;
  postings.find({}).toArray()
  .then(function(tempArray){
    userArray = tempArray;
    loadThisThing(req,res,next,userArray);
  });
});

app.get('/test/', function(req,res,next){
  res.send("everything working");
  console.log("test initiated");
  res.end();
});

app.post('/makePost', function(req,res,next){
  var samplePost = {
    email: res.body.email,
    time: res.body.time,
    distance: res.body.distance,
    latitude: res.body.latitude,
    longitude: res.body.longitude
  };

    postings.insertOne(samplePost, (err,result) => {
      if (err) console.log(err);
    });
    //load user info
    var userArray;
    postings.find({}).toArray()
    .then(function(tempArray){
    userArray = tempArray;
    loadThisThing(req,res,next,userArray);
  });

});







//dealing with 404 page
app.use(function (req, res, next) {
  res.status(404).send("*notices your error page* OwO what's this?");
});


http.createServer(app).listen(port);
console.log('running on port',port);