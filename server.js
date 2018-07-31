//Author: Solomon Yu
//June 2018
//For cmpt 276 Dine Together Project
//Team members: Savtoz, Justin, Austin, Raad
//This server handles the data for the users, postings, and stats the times users log in
//Data is stored externally on mlab
//Another server will be used for chat functionality



var http = require('http');
var express = require('express');
var path = require('path');
var MongoClient = require('mongodb').MongoClient;
var serverIndex = require('serve-index');
var io = require('socket.io')(http);
 
 //setting ports, intializing app
var app = express();
var port = process.env.PORT || 3000;
// app.set('port', port); 
// app.set('views', path.join(__dirname, 'views'));

var dburl = "mongodb://admin:123456a@ds018238.mlab.com:18238/scfgdatabase";
var database;
var users;
var postings;
var stats;
MongoClient.connect(dburl, function(err, client){
  if (err) console.log(err);
  console.log('database connected');
  database = client.db('scfgdatabase'); // use
  users = database.collection('users'); // db.documents
  postings = database.collection('postings');
  //stats = database.collection('stats');


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

//each element is how many logins on the ith hour
var timeStats = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

//viewing the request in console
app.use('/', function(req,res,next){
  console.log(req.method, 'request:', req.url, JSON.stringify(req.body));
  next();
});

app.use('/', express.static('./pub_html', options));
app.use(express.json());

//socket methods: used for chat rooms
io.on('connection', function(socket){
  console.log("Additional user connected");
  socket.on('disconnect', function(){
    console.log("User disconnected");
  });

  socket.on('chatMessage', function(msg){
    console.log('message: ' + msg);
    io.emit('chatMessage', msg);
  });
});

//testing site for socket functions:
app.get('/chatTest', function(req,res){
  res.sendFile(__dirname + '/chatTest.html');
});


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
      loadUserWithoutFriend(req,res,next,loadeduser);
    });

  }
  else{
    console.log("Player has been registered");
    var sampleUser = {
      fullName: req.body.fullName,
      email: req.body.email,
      description: "No description currently given",
      friends: []
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
      loadUserWithoutFriend(req,res,next,loadeduser);
    });


  }
}

//sending the same user object, but removing the friend element
function loadUserWithoutFriend(req,res,next,toLoad){
  console.log("loading user without friend");
	var nonFrienduser = {
		fullName: toLoad.fullName,
		email: toLoad.email,
		description: toLoad.description
	};
	res.send(toLoad);
  	res.end();
}

//sends whatever object(toLoad) is passed through this function
function loadThisThing(req,res,next,toLoad){
  console.log(toLoad);
  console.log("above object loaded");
  res.send(toLoad);
  res.end();
}


//updates a user's description
app.post('/updateDescription/', function(req,res,next){
  var newDescription = req.body.description;
  var userToUpdate = req.body.email;

  var toSearchfor = { "email": userToUpdate };
  var toSet = { $set: { description : newDescription } };

  users.update(toSearchfor,toSet, function(err,res){
    if(err) throw err;
    console.log("user description updated");
  });
//  res.send();
  res.end();
});

//updates a user's history with a single new friend, also
//checks if they already have that friend
app.post('/updateFriends/', function(req,res,next){
  console.log("updating friends");

  var newFriendId = req.body.friendId;
  var newFriendName = req.body.friendName
  var userToUpdate = req.body.userId;

  var loaddeduser;
  users.findOne({"email":userToUpdate})
  .then(function(tempuser){
  	loadeduser = tempuser;
  	afterUpdateFriend(req,res,next,loadeduser,newFriendId,newFriendName);
  });


});

function afterUpdateFriend(req,res,next,loadeduser,newFriendId,newFriendName){
	var allFriends = loadeduser.friends;
	var friendCount = allFriends.length;
  console.log("after update friend");
	var newFriendObject = {
		friendId: newFriendId,
		friendName: newFriendName
	}

	var isFriendFound = false;
	for (var i = 0; i < friendCount; i++){
		if(allFriends[i].friendId == newFriendId){
			isFriendFound = true;
		}
	}
	if (isFriendFound == false){
		allFriends.push(newFriendObject);
		console.log("new friend found");
    console.log(newFriendObject);
	}

  console.log("new friend list: " + allFriends);
	var toSearchfor = { "friends": req.body.userId };
  var toSet = { $set: { friends : allFriends } };

 	users.update(toSearchfor,toSet, function(err,res){
    	if(err) throw err;
    	console.log("user friends updated");
  	});

  res.end();

}

//gets all a user's friends
app.post('/findMyFriends/', function(req,res,next){
  var myEmail = req.body.email;
  var loadeduser;
  console.log("loading friends of " + myEmail);
  users.findOne({"email":myEmail}).then(function(tempuser){
  	loadeduser = tempuser;
  	afterFindFriend(req,res,next,loadeduser);
  });
});

function afterFindFriend(req,res,next,loadedUser){
	console.log(loadedUser.friends);
	res.send(loadedUser.friends);
	res.end();
}

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

//delete all of user's posts, where user is req.body.email
app.post('/deleteMyPost', function(req,res,next){
  var myPosts = postings.remove({"email": req.body.email})
  .then(function(postResult){
      console.log("removing my posts");
      myPosts = postResult;
      afterDelete(req,res,next,myPosts);
     });
});

function afterDelete(req,res,next,myPosts){
  console.log("deletion success");
  res.send(true);
  res.end();

}

//creating a post, takes a posting object as a json from client
app.post('/makePost', function(req,res,next){
  console.log(req.body);

  var samplePost = {
    email: req.body.email,
    time: req.body.time,
    date: req.body.date,
    fullName: req.body.fullName,
    distance: req.body.distance,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    preference: req.body.preference,
    //description: req.body.description
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
    if (Math.abs(givenLongitude - destLongitude) <= latlongApart){
      //console.log("lat okay");
      if(Math.abs(givenLatitude - destLatitude) <= latlongApart){
        //console.log("long okay");
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
        if(samplePost.preference == userArray[i].preference){
          newArray.push(userArray[i]);
          console.log("post pushed");
        }
      }
      
    }
  }
  console.log("New array:"); 
  console.log(newArray);

  //setting up timer for deletion
  console.log("setting timer for deletion");
  var secondsTilDelete;
  if (req.body.time > 90){
    //make max time 1 hour
    secondsTilDelete = 3600000;
  }
  else{
    secondsTilDelete = 60000*req.body.time;
  }
  //temp for testing
  //secondsTilDelete = 60000;
  setTimeout(deletePost, secondsTilDelete, req.body.email);


  //adding to time statistics:
  var d = new Date();
  timeStats[d.getHours()] += 1;
  console.log(timeStats);

  res.send(newArray);
  res.end();
}

function deletePost(email){
console.log("deletion in progress for: " + email);
postings.remove({"email": email});
console.log("deletion completed");
}

 
//view time stats, where time stats is an array
app.get('/getTimeStats', function (req,res,next){
  console.log("sending time stats to a user");
  res.send(timeStats);
  res.end();
});








//dealing with 404 page
app.use(function (req, res, next) {
  res.status(404).send("Error!");
});


http.createServer(app).listen(port);
console.log('running on port',port);