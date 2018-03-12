'use strict';

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));
const downloadFile = Promise.promisify(require("download-file"));

const downloadCdn = (options) => {
    validateOptions(options);
    let sourceFile = options.sourceFile;
    let destinationFile = options.destinationFile;
    let downloadLibs = (options.downloadLibs != null) ? options.downloadLibs : true;
    let configFile = options.configFile || "cdn.json";

    // Lookup config in cdn.json
    let mainPromise = fs.readFileAsync(configFile, 'utf8').then((data) => {
        let config = JSON.parse(data);
        config = parseDependencies(config);
        let promiseStack = [];

        if (downloadLibs) {
            Array.prototype.push.apply(promiseStack, alwaysDownloadCdnLibs(config));
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
    Object.keys(config).forEach(function (blockName) {
        let block = config[blockName];
        block.dependencies = block.dependencies.map((url) => {
            return {
                url: url,
                filename: url.substring(url.lastIndexOf('/') + 1)
            };
        });
    });

    return config;
}

// TODO: Only download libs as needed
function alwaysDownloadCdnLibs(config) {
    let promiseStack = [];

    // Iterate through config blocks
    Object.values(config).forEach(function (block) {
        promiseStack.push(
            // Create folder if none exists
            mkdirp(block.downloadDirectory).then(() => {
                // Download sourceFile from cdn into it
                let downloadPromises = block.dependencies.map(function (dependency) {
                    return downloadFile(dependency.url, {
                        directory: block.downloadDirectory,
                        filename: dependency.filename
                    });
                });

                return Promise.all(downloadPromises);
            })
        );
    });

    return promiseStack;
}

function addCdnEntriesToHtml(config, sourceFile, destinationFile) {
    return fs.readFileAsync(sourceFile, 'utf8').then((htmlFileContents) => {

        // Iterate through cdn.json properties (e.g. "js", "css")
        Object.values(config).forEach(function (block) {
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