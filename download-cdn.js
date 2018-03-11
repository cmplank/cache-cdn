'use strict';

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));
const downloadFile = Promise.promisify(require("download-file"));

const downloadCdn = (options) => {
	validateOptions(options);
	let filesToProcess = options.filesToProcess;
	let downloadLibs = options.downloadLibs;

	// Lookup config in cdn.json
	let mainPromise = fs.readFileAsync("cdn.json", 'utf8').then((data) => {
		let config = JSON.parse(data);
		config = parseDependencies(config);
		let blockPromises = [];

		// Iterate through config blocks
		Object.values(config).forEach(function (block) {

			// Download Libs
			if (downloadLibs) {
				blockPromises.push(alwaysDownloadCdnLibs(block));
			}

			// Process Html File
			if (filesToProcess) {
				blockPromises.push(replaceStringWithCdnEntries(block, filesToProcess));
			}
		});

		return Promise.all(blockPromises);
	});

	return mainPromise;
};

function validateOptions(options) {
	if (!options || Object.keys(options).length === 0) {
		throw new Error("No options provided, so do nothing");
	}

	if (options.filesToProcess && !Array.isArray(options.filesToProcess)) {
		throw new Error("option.filesToProcess must be an array");
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
function alwaysDownloadCdnLibs(block) {
	// Create folder if none exists
	return mkdirp(block.downloadDirectory).then(() => {
		// Download files from cdn into it
		let filePromises = block.dependencies.map(function (dependency) {
			return downloadFile(dependency.url, {
				directory: block.downloadDirectory,
				filename: dependency.filename
			});
		});

		return Promise.all(filePromises);
	});
}

function replaceStringWithCdnEntries(block, filesToProcess) {
	// Replace "replaceString" with files in format "replaceFormat"
}

module.exports = downloadCdn;