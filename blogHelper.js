var fs = require('fs')
	, md = require('meta-marked')
	, path = require('path')
	, config = require('./config.json') 
	, Paginator = require('paginator')
	, junk = require('junk')
	, moment = require('moment')
	, authors = require('./authors.json')
	, gravatar = require('gravatar')
	, paginator = new Paginator(config.settings.articlesPerPage,config.settings.pagerLinks);

var exports = module.exports = {};

exports.pageObject = function(){
	return config.page;
}

//Blog Helpers
/**
 * Article archive
 * Generates an archive object. All content by year.
 **/
exports.getArchive = function(callback){

	var archive = new Object();

	//get all posts
	this.loadPosts({}, function(data){

		var posts = data.results;

		posts.forEach(function(result){

			var year = moment(result.meta.date).format("YYYY");

			//Have we got the year already?
			if(!archive[year]){

				archive[year] = {
					posts: new Array()
				};

				if(archive[year].posts.indexOf(result.meta.title) == -1){
					archive[year].posts.push(result);
				}

			//If we have add the post to the array
			}else{

				if(archive[year].posts.indexOf(result.meta.title) == -1){
					archive[year].posts.push(result);
				}

			}

		});

		callback(archive);

	});
}

/**
 * Takes an options object containing...
 * contentType: type of posts to load
 * tag: filter results by tag
 * order: ASC
 * pageNumber: paginates the results, supply the required page number. Leave empty for all.
 * ... and returns a list of posts ordered by date (ASC by default)
 **/
exports.loadPosts = function(options, callback){

	var dir;

	if(options.hasOwnProperty('contentType')){
		if(options.contentType){
			dir = __dirname+'/content/'+options.contentType;
		}
	}else{
		dir = __dirname+'/content';
	}

	var posts = new Array();

	//Walk the directory looking for '.md' files to parse
	walk(dir, 'md', function(err, files){

		if(files){

			//Each file has yaml meta data, parse the file to get this.
			files.forEach(function(file){

				var post = module.exports.createPostObjectFromFile(file, options);

				//Add the post to the results
				if(options.hasOwnProperty('tag')){
					if(post.meta.tags.indexOf(options.tag) != -1){
						posts.push(post);
					}
				}else{
					posts.push(post);
				}

			});

			//Sort the posts by date
			posts.sort(function(a,b){
				return new Date(b.meta.postDate) - new Date(a.meta.postDate);
			});

			//If we are paginating the list, manipulate the array here
			if(options.pageNumber){

				var pager = paginator.build(posts.length,options.pageNumber);
			
				if(posts.length > config.settings.articlesPerPage){
					posts = posts.slice(pager.first_result,pager.last_result);
				}

				var contentType = options.contentType ? options.contentType : null;

				callback({pager:pager, results:posts, contentType:contentType});

			//or if we don't, just send everything
			}else{
				callback({results:posts});
			}
		}else{
			callback();
		}

	});
}

exports.createPostObjectFromFile = function(file, options){
	//Create a post object
	var post = md(fs.readFileSync(file, "utf8"));	
	var components = file.split(path.sep);
	components.pop();
	components = components.slice(components.length - 3);
	
	var articleDir = components.join('/');
	post.meta.url = articleDir;

	//We need to create the URL for the post, but  need to check the PATH to see if the 
	//file exists.
	var baseURL = process.env.APP_BASE_URL;
	var environmentURL = baseURL+":"+process.env.PORT;
	var featureImagePath = "/content/"+articleDir+"/featureImage.jpg"
	var featureImageURL = environmentURL+featureImagePath;

	if(fs.existsSync("."+featureImagePath)){
		post.meta.featureImage = featureImagePath;
	}

	var author = authors[post.meta.author];

	var fileStats = fs.statSync("./content/"+articleDir+"/index.md");
	post.meta.displayDate = moment(post.meta.postDate).format(config.settings.postDisplayDateFormat);
	post.meta.author = author;
	post.meta.author.gravatarUrl = gravatar.url(author.email, {s: '200', r: 'pg', d: '404'});

	if(options){
		post.contentType = options.contentType ? options.contentType : null;
	} 

	return post;
}

exports.loadPost = function(req, callback){

	var dir = __dirname+'/content/'+req.params.type+'/'+req.params.year+'/'+req.params.entry;

	fs.readdir(dir, function(err, files){

		if(err || !files){
			
			//Send nothing back 
			callback();

		}else{

			files = files.filter(junk.not);

			for(var file in files){

				if(getExtension(files[file]) === 'md'){

					var file = dir+'/'+files[file];
					var post = module.exports.createPostObjectFromFile(file);

					callback(post);
					
				}
			}
		}
	});
}

/**
 * Directory walker
 * Finds all files with a given extension in a directory structure 
 **/
var walk = function(dir, extension, done) {

  var results = [];

  //Read the directory
  fs.readdir(dir, function(err, list) {
    
    if (err) return done(err);
    
    var pending = list.length;
    
    //If no files then return null
    if (!pending) return done(null, results);
    
    //Else list the files
    list.forEach(function(file) {
      file = dir + '/' + file;

      fs.stat(file, function(err, stat) {
        
        //Check to see if this is a sub directory
        if (stat && stat.isDirectory()) {

          	//Walk the sub directory
          	walk(file, extension, function(err, res) {
          		
          		if(getExtension(res.toString()) == extension){
          			results = results.concat(res);
          		}

            	if (!--pending) done(null, results);
          
          	});

        } else {
          
          if(getExtension(file) == extension){
          	results.push(file);
          }

          if (!--pending) done(null, results);
        }
      
      });
    });
  });
};

/**
 * Get file extension
 * Utility method to get the extension of a given file
 **/
var getExtension = function(filename) {

	if(typeof(filename) === 'string'){
		var ext = path.extname(filename||'').split('.');
    	return ext[ext.length - 1];
	}else{
		return null;
	}

}