#Node blogging engine

##Installation

1. Clone the repository
2. Run `npm install`


###Blog post format
Blog posts are created using a combination of YAML and Markdown

Example:
---
title: Post title
author: Post author - this needs to match up with a key in authors.json
featureImageUrl: ""
tags: ["tag"] - An array of strings
postType: post 
intro: Intro text
... 

Main body markdown

### Development
1. Run `grunt watch`
2. `nodemon app.js`