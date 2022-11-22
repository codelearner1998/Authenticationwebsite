require('dotenv').config()

const express = require("express")
const bodyParser = require("body-parser")
const mongoose = require("mongoose")
const ejs = require("ejs");
const session = require('express-session');
const passport = require("passport")
const passportLocal = require("passport-local");
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;




const app = express();


app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static("public"));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'This is My Secret',
    resave: false,
    saveUninitialized: false,
    
  }))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/secrets") 

const userSchema = mongoose.Schema({
    email: "String",
    password: "String",
    googleId : "String",
    secret : "String"

});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());


passport.serializeUser(function(user, done) {
    done(null, user.id);
    // if you use Model.id as your idAttribute maybe you'd want
    // done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID: process.env.clientID,
    clientSecret: process.env.clientSecret,
    callbackURL: "http://localhost:3000/auth/google/secretweb"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));








app.get("/", function (req, res) {
    res.render("home")
})

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }));


  app.get("/auth/google/secretweb", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });  

app.get("/register", function (req, res) {
    res.render("register")
});
app.get("/login", function (req, res) {
    res.render("login")
})

app.get("/submit", function (req, res) {
    if (req.isAuthenticated ()) { 
        res.render("submit")
    } else {
        res.redirect("/login")
    }
})

app.post("/submit",function (req,res) {
    const submittedSecret=req.body.secret;


    const foundSubmituser = req.user.id

    
    User.findById(foundSubmituser, function (err , foundIt) {
        if (err) {
            console.log(err);
        } else {
            if (foundIt) {
                foundIt.secret = submittedSecret;
                foundIt.save(function () {
                    res.redirect("/secrets")
                });
            };
        }
    })



});


app.get("/secrets", function (req, res) {
// if (req.isAuthenticated ()) { 
//     res.render("secrets")
// } else {
//     res.redirect("/login")
// }

User.find({"secret":{$ne:null}},function (err,foundIt) {
    if (err) {
        console.log(err);
    } else {
        if (foundIt) {
            res.render("secrets",{userwithSecrets:foundIt})
        } 
    }
})



   
})

app.get("/logout", function (req, res) {

    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/")
        }
    })
    
})


app.post("/register",function (req,res) {

    User.register({username:req.body.username}, req.body.password, function(err, user) {

        if (err) {
            console.log(err);
            res.redirect("/register")
            
        } else {
            passport.authenticate('local')(req ,res ,function () {
                res.redirect("/secrets")
            })
            
               
                                  
        }

    })
    
    // const newUser = new User ({
    //     email :   req.body.username  ,
    //     password : md5(req.body.password)   
    // })

    // newUser.save(function (err) {
    //     if (err) {
    //         console.log(err);
           
    //     } else {
    //         res.redirect("secrets")
    //     }
    // })



})

app.post("/login",function (req,res) {

    const userName = req.body.username
    const pass =     req.body.password


    const loginUser = new User ({
        username :  userName,
        password : pass
    })



    req.login(loginUser,function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate('local')(req ,res ,function () {
                res.redirect("/secrets")
            })
        }
    })


    // User.findOne({email : userName},function (err , foundIt) {
    //     if (err) {
    //         console.log(err);
            
    //     } else {
            
    //             if (foundIt.password === pass) {
    //                 res.redirect("secrets")
    //             } else {
    //                 res.send("Please Enter correct Password")
    //             }
                
            
            
    //     }
    // })
    
})





app.listen("3000", function (req, res) {
    console.log("Server started on port 3000");
})