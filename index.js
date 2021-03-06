"use strict";

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));
const requestPromise = require("request-promise");
const crypto = require("crypto");

const cacheCdn = options => {
    try {
        if (!options) options = {};
        validateOptions(options);
        var sourceFile = options.sourceFile;
        var destinationFile = options.destinationFile;
        var downloadLibs = (options.downloadLibs != null) ? options.downloadLibs : true;
        var configFile = options.configFile || "cdn.json";
    } catch (err) {
        return Promise.reject(err);
    }

    // Lookup config in cdn.json
    let mainPromise = fs.readFileAsync(configFile, "utf8").then(data => {
        let config = JSON.parse(data);
        config = formatDependencies(config);
        validateConfig(config);
        let promiseStack = [];

        if (downloadLibs) {
            promiseStack.push(downloadCdnLibs(config));
        }

        if (sourceFile) {
            promiseStack.push(addCdnEntriesToHtml(config, sourceFile, destinationFile));
        }

        return Promise.all(promiseStack);
    });

    return mainPromise;
};

function validateOptions(options) {
    if (options.sourceFile && typeof options.sourceFile !== "string") {
        throw new Error("option.sourceFile must be a string");
    }

    if (options.destinationFile && typeof options.destinationFile !== "string") {
        throw new Error("option.destinationFile must be a string");
    }

    if ((options.sourceFile || options.destinationFile)
        && !(options.destinationFile && options.sourceFile)) {
        throw new Error("You must include both options.sourceFile and options.destinationFile or neither");
    }

    if (options.downloadLibs && typeof options.downloadLibs !== "boolean") {
        throw new Error("option.downloadLibs must be a boolean");
    }
}

function formatDependencies(config) {
    Object.entries(config).forEach(([blockName, block]) => {
        block.dependencies = block.dependencies.map(dependency => {
            if (dependency.url && dependency.filename) {
                return dependency;
            }
            return {
                url: dependency,
                filename: dependency.substring(dependency.lastIndexOf("/") + 1)
            };
        });
    });

    return config;
}

function validateConfig(config) {
    // Throw error when duplicate filenames would be created in shared downloadDirectory
    let filenamesByDirectory = new Map();
    Object.values(config).forEach(block => {
        // Add Map entry for each new directory
        if (!filenamesByDirectory.has(block.downloadDirectory)) {
            filenamesByDirectory.set(block.downloadDirectory, []);
        }
        // Add filenames to list (per matching directory)
        Array.prototype.push.apply(
            filenamesByDirectory.get(block.downloadDirectory),
            block.dependencies.map(dep => dep.filename)
        );
    })

    filenamesByDirectory.forEach(filenamesArray => {
        if (filenamesArray.length > (new Set(filenamesArray)).size) {
            throw new Error("Detected multiple filenames to be downloaded into the same folder. "
                + "Disambiguate filenames by specifying one dependency with url and filename. "
                + "See documentation for details.");
        }
    });
}

function downloadCdnLibs(config) {

    return readCdnLockFile()
        .then(cdnLock => removeCdnLockEntriesNotInConfig(cdnLock, config))
        .then(cdnLock => {

            // Convert config blocks into promises to download
            return Promise.all(
                Object.values(config).map(block => {

                    // Create directory if none exists
                    return mkdirp(block.downloadDirectory).then(() => {

                        // Download files from cdn.json as needed
                        return Promise.all(
                            block.dependencies.map(dep => {
                                let filepath = block.downloadDirectory + "/" + dep.filename;

                                return shouldDownloadDependency(dep, filepath, cdnLock)
                                    .then(shouldDownload => {
                                        if (shouldDownload) {
                                            return downloadDependency(dep, filepath, cdnLock);
                                        }
                                    });
                            })
                        )
                    })
                })
            ).then(() => {
                cdnLock.sort(sortByUrl);
                return fs.writeFileAsync("cdn-lock.json", JSON.stringify(cdnLock, null, 4));
            });
        });
}

function readCdnLockFile() {
    return fs.readFileAsync("cdn-lock.json", "utf8")
        .then(contents => {
            let cdnLock = JSON.parse(contents);
            // Iterate through blocks/files
            // Remove entries whose url/filename matches don't exist in cdn.json
            return cdnLock;
        })
        .catch(err => {
            // If the file isn't there, return empty array
            if (err.code === "ENOENT") return [];
            // Otherwise, freak out
            throw err;
        });
}

function removeCdnLockEntriesNotInConfig(cdnLock, config) {
    let mockCdnLock = [];

    Object.values(config).forEach(block => {
        block.dependencies.forEach(dep => {
            mockCdnLock.push({
                url: dep.url,
                filename: dep.filename
            });
        });
    });
    return cdnLock.filter(lock => {
        return mockCdnLock.some(mLock => mLock.url === lock.url && mLock.filename === lock.filename);
    });
}

function shouldDownloadDependency(dep, filepath, cdnLock) {
    let matchingLock = cdnLock.find(lock => lock.url === dep.url && lock.filename === dep.filename);

    if (!matchingLock) {
        return Promise.resolve(true);
    }

    // check if local file hash matches saved hash from cdn-lock.json
    //   for the same url and filename combo
    return hashFile(filepath)
        // swallow error for file not found
        .catch(err => err.code)
        // If file not found or hashes don't match, return true
        .then(hash => hash === "ENOENT" || hash !== matchingLock.hash);
}

function downloadDependency(dep, dest, cdnLock) {
    return downloadFile(dep.url, dest)
        .then(content => {
            dep.hash = createHash(content);
            updateCdnLockList(cdnLock, dep);
        });
}

function updateCdnLockList(cdnLock, dep) {
    let existingLock = cdnLock.find(lock => lock.url === dep.url && lock.filename === dep.filename);
    if (existingLock) {
        let removeIndex = cdnLock.indexOf(existingLock);
        cdnLock.splice(removeIndex, 1);
    }
    cdnLock.push(dep);
}

function hashFile(filepath) {
    return fs.readFileAsync(filepath, "utf8")
        .then(contents => createHash(contents));
}

function createHash(string) {
    return crypto.createHash("md5").update(string).digest("hex");
}

function downloadFile(url, destinationFile) {
    return requestPromise(url).then(content => {
        return fs.writeFileAsync(destinationFile, content)
            .then(() => content);
    });
}

function sortByUrl(a, b) {
    return a.url.toUpperCase()
        .localeCompare(b.url.toUpperCase());
}

function addCdnEntriesToHtml(config, sourceFile, destinationFile) {
    return fs.readFileAsync(sourceFile, "utf8").then(htmlFileContents => {

        // Iterate through cdn.json properties (e.g. "js", "css")
        Object.values(config).forEach(block => {
            let [preTemplate, postTemplate] = block.replaceTemplate.split("@");
            let templatedCdnEntries = block.dependencies
                .map((dependency) => preTemplate + dependency.url + postTemplate)
                .join("\n");

            htmlFileContents = htmlFileContents.replace(block.replaceString, templatedCdnEntries);
        });

        return mkdirp(destinationFile.substring(0, destinationFile.lastIndexOf("/"))).then(() => {
            return fs.writeFileAsync(destinationFile, htmlFileContents, "utf8");
        });
    });
}

module.exports = cacheCdn;