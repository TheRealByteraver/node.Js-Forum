var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require("body-parser"),// insert the JSON body parser middleware into express
    methodOverride = require('method-override'); // for PUT and DELETE http method simulation
    
    
/*var forumColors = [
    "red",
    "orange",
    "yellow",
    "olive",
    "green",
    "teal",
    "blue",
    "violet",
    "purple",
    "pink",
    "brown",
    "grey",
    "black"
];*/
    

// MODELS
// ======

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    handle: String,
    avatar: String,         // url to the image
    dateJoined: String,
    privilegeType: String,  // administrator, moderator, poster, unregistered reader
    postCount: Number
});
var User = mongoose.model("User", UserSchema);

var MainCategorySchema = new mongoose.Schema({
    name: String,
    color: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    subCategories: [
        {
            id: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "SubCategory"
            },
            name: String
        }
    ]
});
var MainCategory = mongoose.model("MainCategory", MainCategorySchema);

var SubCategorySchema = new mongoose.Schema({
    name: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },posts: [
        {
            id:{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Post"
            },
            title: String
        }
    ]
});
var SubCategory = mongoose.model("SubCategory", SubCategorySchema);

var PostSchema = new mongoose.Schema({
    title: String,
    message: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }  
    }
});
var Post = mongoose.model("Post", PostSchema);
    
mongoose.connect("mongodb://localhost:27017/forum", { useNewUrlParser: true });
mongoose.set('useFindAndModify', false); // get rid of deprecation warnings

var app = express();
app.set('view engine', 'ejs');  
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({ extended:true }));
app.use(methodOverride("_method"));

// ROUTES
// ======

// main landing route /
app.get("/",function(req,res){
    res.redirect("/categories");
});

// main category INDEX ROUTE
app.get("/categories",function(req,res){
    MainCategory.find({},function(err,mainCategories){
       if(err) {
           console.log(err);
       } else {
           res.render("categories/landing",{mainCategories:mainCategories});
       }
    });
});

// main category NEW ROUTE
app.get("/categories/new",function(req,res){
    res.render("categories/new");
});

// main category CREATE ROUTE
app.post("/categories",function(req,res){
    MainCategory.create({
      name: req.body.name,
      color: req.body.color
    },function(err, category) { 
      if(err) {
        console.log("error occured during creation of category");  
      } else {
      }
    });
    res.redirect("/categories");
});

// main category SHOW ROUTE: info about one particular main category:
app.get("/categories/:id",function(req,res){
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
      } else {
          res.render("categories/show",{foundMainCategory:foundMainCategory});
      }
   });
});

// main category EDIT ROUTE: show edit form for one particular main category:
app.get("/categories/:id/edit",function(req,res){
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
      } else {
          res.render("categories/edit",{foundMainCategory:foundMainCategory});
      }
   });
});

// main category UPDATE ROUTE: update one particular main category and redirect to INDEX:
app.put("/categories/:id",function(req,res){
    var updatedMainCategory = {
        name: req.body.name,
        color: req.body.color
    }
    MainCategory.findByIdAndUpdate(req.params.id,updatedMainCategory,function(err,foundMainCategory){
      if(err) {
          console.log(err);
      } else {
      }
   });
   res.redirect("/categories");
});

// main category DELETE ROUTE: delete the main category
app.delete("/categories/:id",function(req,res){
    MainCategory.findById(req.params.id,function(err,foundMainCategory) {
      if(err) {
          console.log(err);
      } else {
        foundMainCategory.subCategories.forEach(function(subCategory) {
            console.log( typeof(subCategory._id) );
            console.log( typeof( req.params.id ) );
            SubCategory.findByIdAndRemove( subCategory._id,function(err) {
                console.log("subcategory delete error: " + err);
            });    
        }); 
        MainCategory.findByIdAndRemove(req.params.id,function(err) {
            console.log("main category delete error: " + err);
        });
      }
   });
   res.redirect("/categories");
});


// ******************
// subcategory routes
// ******************

// subcategory NEW ROUTE: show "add subcategory" form
app.get("/categories/:id/new",function(req,res){
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
          res.redirect("/categories");
      } else {
          res.render("subcategories/new",{foundMainCategory:foundMainCategory});
      }
   });    
});

// subcategory CREATE ROUTE: add the new subcategory to the main category
app.post("/categories/:id",function(req,res){ 
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
          res.redirect("/categories");
      } else {
          var subCategory = {
              name: req.body.name
          }
          SubCategory.create(subCategory,function(err,subCategory){
             if(err) {
                 console.log(err);
             } else {
                 /*
                 comment.author.id = request.user._id;
                 comment.author.username = request.user.username;
                 comment.save(); 
                 */
                 subCategory.save();
                 foundMainCategory.subCategories.push(subCategory);
                 foundMainCategory.subCategories[foundMainCategory.subCategories.length - 1].name = subCategory.name;
                 foundMainCategory.save();
             }
          });
      }
   }); 
   res.redirect("/categories/" + req.params.id);
});

// subcategory SHOW ROUTE
app.get("/categories/:id/:sub_id",function(req,res){
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
          res.redirect("/categories");
      } else {
          SubCategory.findById(req.params.sub_id,function(err,foundSubCategory){
              if(err) {
                  console.log(err);
                  res.redirect("/categories/" + req.params.id);
              } else {
                  res.render("categories/showsub",{foundMainCategory:foundMainCategory,foundSubCategory:foundSubCategory});
              }
          });
      }
   });
});

// subcategory EDIT ROUTE
app.get("/categories/:id/:sub_id/edit",function(req,res){
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
          res.redirect("/categories");
      } else {
          SubCategory.findById(req.params.sub_id,function(err,foundSubCategory){
              if(err) {
                  console.log(err);
                  res.redirect("/categories/" + req.params.id);
              } else {
                  res.render("categories/editsub",{foundMainCategory:foundMainCategory,foundSubCategory:foundSubCategory});
              }
          });          
      }
   });
});

// subcategory UPDATE ROUTE
app.put("/categories/:id/:sub_id",function(req,res){
   MainCategory.findById(req.params.id,function(err,foundMainCategory){
      if(err) {
          console.log(err);
          res.redirect("/categories");
      } else {
          var updatedSubCategory = {
              name:req.body.name
          }
          //console.log(req.body.name);
          SubCategory.findByIdAndUpdate(req.params.sub_id,updatedSubCategory,function(err,foundSubCategory){
              if(err) {
                  console.log(err);
              } else {
                  var i;
                  //console.log("orig id = " + req.params.sub_id);
                  for( i = 0; i < foundMainCategory.subCategories.length; i++ ) {
                      //console.log("subcat nr " + i + " id = " + foundMainCategory.subCategories[i]._id);
                      if( foundMainCategory.subCategories[i]._id == req.params.sub_id ) {
                          foundMainCategory.subCategories[i].name = updatedSubCategory.name;
                          //console.log("subcat name = " + foundMainCategory.subCategories[i].name);
                          //console.log("i = " + i);
                          break;
                      }
                  }
                  foundMainCategory.save();
              }
          });  
          
          res.redirect("/categories/" + req.params.id);
      }
   });
});

app.listen(process.env.PORT,process.env.IP,function(){
    console.log('forum server has started');
});

// subcategory SHOW ROUTE:

