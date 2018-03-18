'use strict';

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));
const requestPromise = require("request-promise");

const downloadCdn = options => {
    validateOptions(options);
    let sourceFile = options.sourceFile;
    let destinationFile = options.destinationFile;
    let downloadLibs = (options.downloadLibs != null) ? options.downloadLibs : true;
    let configFile = options.configFile || "cdn.json";

    // Lookup config in cdn.json
    let mainPromise = fs.readFileAsync(configFile, 'utf8').then(data => {
        let config = JSON.parse(data);
        config = parseDependencies(config);
        validateConfig(config);
        let promiseStack = [];

        if (downloadLibs) {
            promiseStack.push(alwaysDownloadCdnLibs(config));
        }

        if (sourceFile) {
            promiseStack.push(addCdnEntriesToHtml(config, sourceFile, destinationFile));
        }

        return Promise.all(promiseStack);
    });

    return mainPromise;
};

function validateOptions(options) {
    if (!options || Object.keys(options).length === 0) {
        throw new Error("No options provided, so do nothing");
    }

    if (options.sourceFile && typeof options.sourceFile !== 'string') {
        throw new Error("option.sourceFile must be a string");
    }

    if (options.destinationFile && typeof options.destinationFile !== 'string') {
        throw new Error("option.destinationFile must be a string");
    }

    if ((options.sourceFile || options.destinationFile)
        && !(options.destinationFile && options.sourceFile)) {
        throw new Error("You must include both options.sourceFile and options.destinationFile or neither");
    }

    if (options.downloadLibs && typeof options.downloadLibs !== 'boolean') {
        throw new Error("option.downloadLibs must be a boolean");
    }
}

function parseDependencies(config) {
    Object.keys(config).forEach(blockName => {
        let block = config[blockName];
        block.dependencies = block.dependencies.map(dependency => {
            if (dependency.url && dependency.filename) {
                return dependency;
            }
            return {
                url: dependency,
                filename: dependency.substring(dependency.lastIndexOf('/') + 1)
            };
        });
    });

    return config;
}

function validateConfig(config) {
    // Throw error when duplicate filenames exist in shared downloadDirectory
    let filenamesByDirectory = new Map();
    Object.values(config).forEach(block => {
        if (!filenamesByDirectory.has(block.downloadDirectory)) {
            filenamesByDirectory.set(
                block.downloadDirectory,
                block.dependencies.map(dep => dep.filename)
            );
        } else {
            Arrays.apply.push(
                filenamesByDirectory.get(block.downloadDirectory),
                block.dependencies.map(dep => dep.filename)
            );
        }
    })

    filenamesByDirectory.forEach(filenamesArray => {
        if (filenamesArray.length > (new Set(filenamesArray)).size) {
            throw new Error("Detected multiple filenames to be downloaded into the same folder. "
                + "Disambiguate filenames by specifying one dependency with url and filename. "
                + "See documentation for details.");
        }
    });
}

// TODO: Only download libs as needed
function alwaysDownloadCdnLibs(config) {
    let promiseStack = [];

    // 1. Get modified date of config file
    // 2. While iterating through blocks/files (for downloading)
    //   a. Get modified date of file
    //   b. Only download file if modified date of file is < cdn.json

    // 1. Lookup cdn-lock.json if exists (url, filename, hash), else create
    //   a. Iterate through blocks/files
    //   b. Remove entries whose url/filename matches don't exist in cdn.json
    // 2. While iterating through blocks/files (for downloading)
    //   a. If url/filename match exists
    //     i. Hash file
    //     ii. if hash matches, do nothing
    //   b. (from a or ii) else download file, hash, and add entry
    // 2. After iterating all, write cdn-lock.json

    // Iterate through config blocks
    Object.values(config).forEach(block => {

        // Create folder if none exists
        let mkdirPromise = mkdirp(block.downloadDirectory).then(() => {
            // Download sourceFile from cdn into it
            return Promise.all(
                block.dependencies.map(dependency => {
                    return downloadFile(dependency.url, block.downloadDirectory + "/" + dependency.filename);
                })
            );
        })

        promiseStack.push(mkdirPromise);
    });

    return Promise.all(promiseStack);
}

function downloadFile(url, destinationFile) {
    return requestPromise(url).then(response => {
        return fs.writeFileAsync(destinationFile, response);
    });
};

function addCdnEntriesToHtml(config, sourceFile, destinationFile) {
    return fs.readFileAsync(sourceFile, 'utf8').then(htmlFileContents => {

        // Iterate through cdn.json properties (e.g. "js", "css")
        Object.values(config).forEach(block => {
            let [preTemplate, postTemplate] = block.replaceTemplate.split("@");
            let templatedCdnEntries = block.dependencies
                .map((dependency) => preTemplate + dependency.url + postTemplate)
                .join("\n");

            htmlFileContents = htmlFileContents.replace(block.replaceString, templatedCdnEntries);
        });

        return mkdirp(destinationFile.substring(0, destinationFile.lastIndexOf("/"))).then(() => {
            return fs.writeFileAsync(destinationFile, htmlFileContents, 'utf8');
        });
    });
}

module.exports = downloadCdn;