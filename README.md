# download-cdn

[![Build Status](https://travis-ci.org/cmplank/download-cdn.svg?branch=master)](https://travis-ci.org/cmplank/download-cdn)
[![Coverage Status](https://coveralls.io/repos/github/cmplank/download-cdn/badge.svg?branch=master)](https://coveralls.io/github/cmplank/download-cdn?branch=master)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/78430de6c5614086b481693f14de3206)](https://www.codacy.com/app/cmplank/download-cdn?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=cmplank/download-cdn&amp;utm_campaign=Badge_Grade)

Manage your cdn libs in one place. Download them for local use (e.g. unit tests) and write the cdn scripts/links to your html.

## Getting Started

- This library requires node ^7.0.0

In order to keep a single listing of cdn libraries in your project, download-cdn combines two features:
- downloading cdn dependencies
- writing cdn script/link tags into your html

## Setup

First, create a cdn.json file in the root of your project. This file will contain a list of dependencies by type (typically js and css). 

```json

{
    "js": {
        "replaceString": "<!-- cdn-js-libs -->",
        "replaceTemplate": "<script src='@' defer></script>",
        "downloadDirectory": "tmp/js",
        "dependencies": [
            "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"
        ]
    },
    "css": {
        "replaceString": "<!-- cdn-css-libs -->",
        "replaceTemplate": "<link href='@'>",
        "downloadDirectory": "tmp/css",
        "dependencies": [
            "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
        ]
    }
}

```

This file is configured to download the 3 listed dependencies into respective tmp/js and tmp/css directories in your project. It will also replace tokens (values of "replaceString") with script/link tags containing your dependencies.

Second, add the replaceString values to your index.html

```html

<html>
<head>
    <!-- cdn-js-libs -->
    <!-- cdn-css-libs -->
</head>
<body> ... </body>
</html>

```

Third, import download-cdn and call it with a source (your html file) and destination.

```javascript

const downloadCdn = require("../download-cdn");

let options = {
    sourceFile: "app/index.html",
    destinationFile: "dist/index.html"
};

downloadCdn(options);

```

Result:

```html

<html>
<head>
    <script src='https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js' defer></script>
    <script src='https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js' defer></script>
    <link href='https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css'>
</head>
<body> ... </body>
</html>

```


## Available Options

**sourceFile**

Type: `string` Default Value: `null`

Source html file to inject cdn dependencies into. Must contain the replaceString matching that in cdn.json.

**destinationFile**

Type: `string` Default Value: `null`

Once cdn entries are injected, they are written to the destinationFile.

**downloadLibs**

Type: `boolean` Default Value: `true`

Flag for enabling/disabling the downloading of cdn dependencies.

**configFile**

Type: `string` Default Value: `cdn.json`

Allows an alternate location and/or name for cdn.json file.





## Options for cdn.json File

**replaceString**

Type: `string` Example: `"<!-- cdn-js-libs -->"`

A string token which will be found in the sourceFile and replaced with an array of "replaceTemplate" values before being written to the destinationFile.

**replaceTemplate**

Type: `string` Example: `"<script src='@' defer></script>"`

The value of replaceTemplate will be used to generate each needed cdn tag in your html file. As "dependencies" are iterated over, the `@` symbol is replaced with each dependency url.

**downloadDirectory**

Type: `string` Example: `tmp/js`

Source html file which contains a replaceString matching that in cdn.json.

**dependencies**

Type: `array` Example: `["https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"]`

Array full of urls to cdn libraries. In the event that you end up with two files with the same name being downloaded into the same directory (e.g. tmp/js), you can replace one of the strings with an object that has `url` and `filename` properties. The url will be the same as before, but you choose the alternate filename you want to use. The following is an example:

```javascript
    ...
        "dependencies": [
            {"url": "https://cdnjs.cloudflare.com/ajax/libs/jquery/2.0.0/jquery.min.js", "filename": "jquery2.min.js"},
            "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"
        ]
    ...
```





## Acknowledgements

I want to give a special thanks to F1LT3R as this project was heavily inspired by [grunt-cdn-switch](https://github.com/F1LT3R/grunt-cdn-switch) and to dimmreaper who [forked that repo](https://github.com/dimmreaper/grunt-cdn-switch) to better serve my needs.