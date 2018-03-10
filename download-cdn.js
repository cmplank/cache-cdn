'use strict';

const fs = require('fs');

const downloadCdn = (options) => {
	if (!options || Object.keys(options).length === 0) {
		throw new Error("No options provided, so do nothing");
	}

	let filesToProcess = options.filesToProcess;
	if (filesToProcess && !Array.isArray(filesToProcess)) {
		throw new Error("option.filesToProcess must be an array");
	}

	let downloadLibs = options.downloadLibs;
	if (downloadLibs && typeof downloadLibs !== 'boolean') {
		throw new Error("option.downloadLibs must be a boolean");
	}

	// Iterate through blocks
	//   Download Libs if needed
	//   Process Files if needed

	// todo: Add cdn-lock.json and use to ensure fresh downloads when lib versions change

};

module.exports = downloadCdn;