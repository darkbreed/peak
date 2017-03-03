var express = require('express')
	, app = express()
	, path = require('path')
	, config = require('./config.json')
	, Converter = require("csvtojson").Converter
	, morgan = require("morgan")
	, nunjucks = require('nunjucks')
	, dropboxHelper = require('./dropboxHelper.js')
	, blogHelper = require('./blogHelper.js')
	, authors = require('./authors.json')
	, IMAGE_DIR = '/images'
	, ERROR_404 = 'error/404.html'
	, VIEW_EXTENSION = '.html'
	, POST_TEMPLATE_DIRECTORY = 'post-types/';

//Confgure the template engine
nunjucks.configure('views', {
  autoescape: true,
  express   : app
});

//Configure Morgan logging
//app.use(morgan('combined'));

//Set up the static content directories for client side assets
app.use('/static',express.static(__dirname + '/static'));
app.use('/images',express.static(__dirname + IMAGE_DIR));

var faviconFix = function(req, res, next){
	if(req.params.type === 'favicon.ico'){
		res.send(200);
	}else{
		next();
	}
}

/**
 * 1. Home
 * Load the homepage. Can be specified in the config file
 **/
app.get('/', function(req, res){
	
	blogHelper.loadPosts({pageNumber: 1, contentType:'blog'}, function(data){
		var page = blogHelper.pageObject();
		page.posts = data.results;
		page.pager = data.page;
		res.render(config.templates.listview, page);
	});

});

/**
 * 2. Custom pages 
 * These need to be defined here as the router will get them confused with post types
 * if they are declared afterwards.
 **/
app.get('/peaks/list', function(req,res){

	var page = blogHelper.pageObject();
	res.render('peaks.html',page);

});

app.get('/peaks/timeline', function(req,res){
	res.render('timeline.html');
});


/**
 * 3. Blog components
 * Archive list
 **/
app.get('/archives/:year', function(req, res){

	blogHelper.getArchive(function(archive){

		var page = blogHelper.pageObject();
		var year = req.params.year;

		if(archive[year]){
			page.posts = archive[req.params.year].posts;
		}else{
			page.posts = null;
		}
		
		res.render(config.templates.listview,page);

	});

});

app.get('/authors/:shortname', function(req, res){

	var page = blogHelper.pageObject();
	page.author = authors[req.params.shortname];

	res.render(config.templates.author, page);
	
});

/**
 * RSS feeds by type
 * Creates an RSS feed of all content for a given type
 **/
app.get('/feeds/:type', function(req, res){
	var options = { 
		contentType: req.params.type,
		pageNumber: req.query.page
	}
	blogHelper.loadPosts(options, function(data){
		res.contentType("application/rss+xml");
		res.render(config.templates.rss, {
			name: config.locals.name,
			url: config.locals.url,
			description: config.locals.description,
    		posts : data.results
  		});
	});
});

/**
 * Get all content by tag
 * Loads a paginated list of content by tag
 **/
app.get('/tags/:tag', faviconFix, function(req, res){

	blogHelper.loadPosts({pageNumber: req.query.page, tag: req.params.tag}, function(data){

		if(data.results.length){
			var page = blogHelper.pageObject();
			page.posts = data.results;
			page.pager = data.page;
			res.render(config.templates.listview,page);
		}else{
			res.render(ERROR_404);
		}
	});

});

/**
 * 5. Post types Get all content by type - This has to be defined after any custom routes, pages etc.
 * Loads a paginated list of all content in one of the content/ sub directories
 **/
app.get('/:type', faviconFix, function(req, res){
	
	console.log(req);

	blogHelper.loadPosts({contentType: req.params.type, pageNumber: req.query.page,limit: req.query.limit}, function(data){
		
		if(data){
			var page = blogHelper.pageObject();
			page.posts = data.results;
			page.pager = data.pager;
			page.contentType = data.contentType;

			if(req.params.type === 'directory'){
				res.render(config.templates.directory,page);
			}else{
				res.render(config.templates.listview,page);
			}
		}else{
			res.render(ERROR_404);
		}

	});

});

/**
 * Get Entry detail
 * Loads a single article and renders it using the template specified in the articles markdown
 **/
app.get('/:type/:entry', faviconFix, function(req, res){
	
	blogHelper.loadPost(req, function(post){
		
		if(post){
			var page = blogHelper.pageObject();
			page.post = post;
			res.render(POST_TEMPLATE_DIRECTORY+post.meta.postType+VIEW_EXTENSION, page);
		}else{
			res.render(ERROR_404);
		}

	});
	
});

var server_port = process.env.PORT || 3000;

var server = app.listen(server_port, function() {
    console.log('Listening on port %d', server.address().port);
});