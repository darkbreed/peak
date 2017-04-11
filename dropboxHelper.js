var Dropbox = require('dropbox');

//Configure Dropbox
var dbx = new Dropbox({ accessToken: process.env.dropboxToken});

var exports = module.exports = {};

exports.listFiles = function(success, failure){

	dbx.filesListFolder({path: ''}).then(function(response) {
	    
	    var entries = response.entries;

	    for(var object in entries){
	    	dbx.filesListFolder({path: entries[object].path_lower}).then(function(response){
	    		console.log(response);
	    	});

	    }


	  }).catch(function(error) {
	    
	    failure(error);
	  
	  });
}
