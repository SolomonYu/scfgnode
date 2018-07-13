//Author: Solomon Yu
//June 2018
//For cmpt 276 Dine Together Project
//Team members: Savtoz, Justin, Austin, Raad



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

var timeStats = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

//viewing the request in console
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


  }
}

//sends whatever object(toLoad) is passed through this function
function loadThisThing(req,res,next,toLoad){
  console.log(toLoad);
  console.log("above object loaded");
  res.send(toLoad);
  res.end();
}


//updates database.. assume user also is updated locally, in interest of time
//atm, this is just for testing
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
//for testing purposes only, to be removed in final version
app.get('/displayall', function(req,res,next){
  var userArray;
  postings.find({}).toArray()
  .then(function(tempArray){
    userArray = tempArray;
    loadThisThing(req,res,next,userArray);
  });
});

app.get('/test/', function(req,res,next){
  var givenLatitude = 10;
  var givenLongitude = 10;
  var kmApart = 100;
  var destLatitude = 9.9;
  var destLongitude = 9.9;
  var result = calculateDistance(givenLatitude,givenLongitude,kmApart,destLatitude,destLongitude); 
  res.send(result);
  console.log(result);
  res.end();
});

app.get('/test2/', function(req,res,next){
  var d = new Date();
  timeStats[d.getHours()] += 1;
  console.log(timeStats);
  res.send(timeStats);
  res.end();
});

//creating a post, takes a posting object as a json from client
app.post('/makePost', function(req,res,next){
  console.log(req.body);

  var samplePost = {
    email: req.body.email,
    time: req.body.time,
    fullName: req.body.fullName,
    distance: req.body.distance,
    latitude: req.body.latitude,
    longitude: req.body.longitude
  };
 var existingPosts = 1;
  var existingPosts = postings.remove({"email": req.body.email})
  .then(function(postResult){
      console.log("removing old posts");
      existingPosts = postResult;
      afterMakePost(req,res,next,existingPosts,samplePost);
     });

});


//to prevent async problems in making a post
function afterMakePost(req,res,next,existingPosts,samplePost){
  var userjson;
  var loadeduser;
  console.log("existingpotsts is: " + existingPosts);
  // if (existingPosts >= 1){
  //   console.log("Post already exists");
  // }
  // else{
    console.log("Post has been added");
    console.log(samplePost);
    postings.insertOne(samplePost, (err,result) => {
      if (err) console.log(err);
    });
  //}
    //load all posts info
    var userArray;
    postings.find({}).toArray()
    .then(function(tempArray){
      userArray = tempArray;
      loadAndFilterArray(req,res,next,userArray,samplePost);
    });
}

//return either true or false based on whether desination is within kmApart
  function calculateDistance(givenLatitude,givenLongitude,kmApart,destLatitude,destLongitude){
    var latlongApart = kmApart/111.133;
    console.log("calcdistance entered: " + givenLatitude);
    console.log(destLatitude);
    console.log(kmApart);
    if (Math.abs(givenLongitude - destLongitude) <= latlongApart){
      console.log("lat okay");
      if(Math.abs(givenLatitude - destLatitude) <= latlongApart){
        console.log("long okay");
        return true;
      }
    } 
    return false;
  }

//making only nearby users show up, will also filter diet restrictions in future
  function loadAndFilterArray(req,res,next,userArray,samplePost){
  console.log(userArray);
  console.log("Number of items in array: " + userArray.length);
  var newArray = [];
  for(var i = 0; i < userArray.length; i++){
    console.log("i = " + i);
    if (calculateDistance(samplePost.latitude,samplePost.longitude,samplePost.distance,userArray[i].latitude,userArray[i].longitude)){
      if(userArray[i].email != samplePost.email){
        newArray.push(userArray[i]);
        console.log("post pushed");
      }
      
    }
  }
  console.log("New array:"); 
  console.log(newArray);

  //adding to time statistics:
  var d = new Date();
  timeStats[d.getHours()] += 1;
  console.log(timeStats);

  res.send(newArray);
  res.end();
}






//dealing with 404 page
app.use(function (req, res, next) {
  res.status(404).send("Error!");
});


http.createServer(app).listen(port);
console.log('running on port',port);