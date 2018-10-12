var express = require('express'),
    mongoose = require('mongoose'),
    bodyParser = require("body-parser"),// insert the JSON body parser middleware into express
    methodOverride = require('method-override'), // for PUT and DELETE http method simulation
    expressSanitizer = require('express-sanitizer');
    
    
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
app.use(expressSanitizer());

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
      name: req.sanitize(req.body.name),
      color: req.sanitize(req.body.color)
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
        name: req.sanitize(req.body.name),
        color: req.sanitize(req.body.color)
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
            if(subCategory.posts) {
                subCategory.posts.forEach(function(post){
                    Post.findByIdAndRemove( post._id,function(err){
                        if(err) {
                            console.log("post delete error: " + err);
                        }                    
                    });
                });
            }
            SubCategory.findByIdAndRemove( subCategory._id,function(err) {
                if(err) {
                    console.log("subcategory delete error: " + err);
                }
            });    
        }); 
        MainCategory.findByIdAndRemove(req.params.id,function(err) {
            if(err) {
                console.log("main category delete error: " + err);
            }
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
          res.render("categories/newsub",{foundMainCategory:foundMainCategory});
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
              name: req.sanitize(req.body.name)
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
                 // apparently pushing the id only or the whole subCategory instead makes no difference...?
                 foundMainCategory.subCategories.push( subCategory /* ._id */ );
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
              name:req.sanitize(req.body.name)
          }
          SubCategory.findByIdAndUpdate(req.params.sub_id,updatedSubCategory,function(err,foundSubCategory){
              if(err) {
                  console.log(err);
              } else {
                  var i;
                  for( i = 0; i < foundMainCategory.subCategories.length; i++ ) {
                      if( foundMainCategory.subCategories[i]._id == req.params.sub_id ) {
                          foundMainCategory.subCategories[i].name = updatedSubCategory.name;
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

// sub category DELETE ROUTE: delete the main category
app.delete("/categories/:id/:sub_id",function(req,res){
    MainCategory.findById(req.params.id,function(err,foundMainCategory) {
        if(err) {
          console.log(err);
          res.redirect("/categories/");
        } else {
            var i;
            for( i = 0; i < foundMainCategory.subCategories.length; i++ ) {
                if( foundMainCategory.subCategories[i]._id == req.params.sub_id ) {
                    foundMainCategory.subCategories.splice( i,1 );
                    break;
                }
            }
            foundMainCategory.save();
            SubCategory.findById(req.params.sub_id,function( err,foundSubCategory ) {
                if(err) {
                    console.log("sub category delete error: " + err);
                } else {
                    if(foundSubCategory.posts) {
                        foundSubCategory.posts.forEach(function(post){
                            Post.findByIdAndRemove( post._id,function(err){
                                if(err) {
                                    console.log("post delete error: " + err);
                                }                    
                            });
                        });
                    }
                }
            });
            SubCategory.findByIdAndRemove(req.params.sub_id,function( err ) {
                if(err) {
                    console.log("sub category delete error: " + err);
                }
            });
            res.redirect("/categories/" + req.params.id);            
        }
    });
});

// ***********
// POST ROUTES 
// ***********

// Post NEW ROUTE: show "add new post" form
app.get("/categories/:id/:sub_id/new",function(req,res){
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
                  res.render("categories/newpost",{foundMainCategory:foundMainCategory,foundSubCategory:foundSubCategory});
              }
          });          
      }
   });    
});

// Post CREATE ROUTE: save the newly created post
app.post("/categories/:id/:sub_id",function(req,res){
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
                    var post = {
                        title  : req.sanitize(req.body.title),
                        message: req.sanitize(req.body.message)
                    }
                    Post.create(post,function(err,createdPost){
                        if(err) {
                            console.log("error creating post: " + err);
                            res.redirect("/categories/" + req.params.id + "/" + req.params.sub_id);
                        } else {
                            createdPost.save();
                            foundSubCategory.posts.push( createdPost );
                            foundSubCategory.posts[foundSubCategory.posts.length - 1].title = createdPost.title;
                            foundSubCategory.save();                  
                            res.redirect("/categories/" + req.params.id + "/" + req.params.sub_id);                           
                        }
                    });

                }
            });          
        }
    });
});

// Post SHOW ROUTE:
app.get("/categories/:id/:sub_id/:post_id",function(req,res){
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
                  Post.findById(req.params.post_id,function(err,foundPost){
                      if(err) {
                          console.log("error finding Post: " + err);
                          res.redirect("/categories/" + req.params.id + "/" + req.params.sub_id);
                      } else {
                          res.render("categories/showpost",{foundMainCategory:foundMainCategory,foundSubCategory:foundSubCategory,foundPost:foundPost});
                      }
                  });
              }
          });
      }
   });
});

// Post EDIT ROUTE
app.get("/categories/:id/:sub_id/:post_id/edit",function(req,res) {
    MainCategory.findById(req.params.id,function(err,foundMainCategory) {
        if(err) {
            console.log(err);
            res.redirect("/categories");
        } else {
            SubCategory.findById(req.params.sub_id,function(err,foundSubCategory) {
                if(err) {
                    console.log(err);
                    res.redirect("/categories/" + req.params.id);
                } else {
                    Post.findById(req.params.post_id,function(err,foundPost) {
                        if(err) {
                            console.log("error finding Post: " + err);
                            res.redirect("/categories/" + req.params.id + "/" + req.params.sub_id);
                        } else {
                            res.render("categories/editpost",{foundMainCategory:foundMainCategory,foundSubCategory:foundSubCategory,foundPost:foundPost});
                        }
                    });
                }
            });          
        }
    });
});

// Post UPDATE ROUTE
app.put("/categories/:id/:sub_id/:post_id",function(req,res) {
    MainCategory.findById(req.params.id,function(err,foundMainCategory) {
        if(err) {
            console.log(err);
            res.redirect("/categories");
        } else {
            SubCategory.findById(req.params.sub_id,function(err,foundSubCategory) {
                if(err) {
                    console.log(err);
                    res.redirect("/categories/" + req.params.id);
                } else {
                    var updatedPost = {
                        title: req.sanitize(req.body.title),
                        message: req.sanitize(req.body.message)
                    }
                    Post.findByIdAndUpdate(req.params.post_id,updatedPost,function(err,foundPost) {
                        if(err) {
                            console.log("error updating Post: " + err);
                        } else {
                            var i;
                            for( i = 0; i < foundSubCategory.posts.length; i++ ) {
                              if( foundSubCategory.posts[i]._id == req.params.post_id ) {
                                  foundSubCategory.posts[i].title = foundPost.title;
                                  break;
                              }
                            }
                            foundSubCategory.save();
                        }
                    });
                    res.redirect("/categories/" + req.params.id + "/" + req.params.sub_id);
                }
            });          
        }
    });
});

// Post DELETE ROUTE
app.delete("/categories/:id/:sub_id/:post_id",function(req,res) {
    MainCategory.findById(req.params.id,function(err,foundMainCategory) {
        if(err) {
            console.log(err);
            res.redirect("/categories");
        } else {
            SubCategory.findById(req.params.sub_id,function(err,foundSubCategory) {
                if(err) {
                    console.log(err);
                    res.redirect("/categories/" + req.params.id);
                } else {
                    var i;
                    for( i = 0; i < foundSubCategory.posts.length; i++ ) {
                        if( foundSubCategory.posts[i]._id == req.params.post_id ) {
                          foundSubCategory.posts.splice(i,1);
                          break;
                        }
                    }
                    foundSubCategory.save();
                    Post.findByIdAndRemove(req.params.post_id,function(err) {
                        if(err) {
                            console.log("error deleting Post: " + err);
                        }
                    });
                    res.redirect("/categories/" + req.params.id + "/" + req.params.sub_id);
                }
            });          
        }
    });
});

app.listen(process.env.PORT,process.env.IP,function(){
    console.log('forum server has started');
});


