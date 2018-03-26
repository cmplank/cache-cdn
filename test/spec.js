
let expect = require("chai").expect;
let downloadCdn = require("../download-cdn");

let Promise = require("bluebird");
let rimraf = Promise.promisify(require("rimraf"));
let fs = Promise.promisifyAll(require("fs"));

describe("download cdn", () => {

    let jqueryFile = "tmp/js/jquery.min.js";
    let jquery2File = "tmp/js/jquery2.min.js";
    let bootstrapFile = "tmp/css/bootstrap.min.css";

    let badJqueryFile = 'test-resources/jquery.min.js';

    beforeEach(() => {
        // delete tmp directory and cdn-lock.json
        return Promise.all([
            rimraf("tmp"),
            rimraf("cdn-lock.json")
        ]);
    });

    it("fails when options.sourceFile is not accompanied by destinationFile", () => {
        let options = { sourceFile: "file.txt" };
        let normalCall = () => downloadCdn(options);
        expect(normalCall).to.throw();
    });

    it("fails when options.downloadLibs is not a boolean", () => {
        let options = { downloadLibs: ["my/directory"] };
        let normalCall = () => downloadCdn(options);
        expect(normalCall).to.throw();
    });

    it("fails when running with bad config: duplicate filenames: download ON", () => {
        let options = {
            configFile: "cdn.bad.json",
            downloadLibs: true
        };
        let downloadErrorMessage = "Cdn files were downloaded (but shouldn't have been because config was bad)";

        return downloadCdn(options)
            .then(() => expect.fail(null, null, downloadErrorMessage))
            .catch(err => {
                if (err.message === downloadErrorMessage) throw err;
            });
    });

    describe("when running with index.html insertion config", () => {
        let options = {
            downloadLibs: false,
            sourceFile: "app/index.html",
            destinationFile: "tmp/index.html"
        };

        it("adds cdn references to index.html", () => {
            return downloadCdn(options).then(() => {
                return Promise.all([
                    fs.readFileAsync(options.destinationFile, 'utf8'),
                    fs.readFileAsync("expected/index.html", 'utf8')
                ]).then(([destinationContents, expectedContents]) => {
                    expect(destinationContents).to.equal(expectedContents);
                });
            });
        });
    });

    describe("when running with download OFF", () => {
        let options = {
            downloadLibs: false,
            sourceFile: "app/index.html",
            destinationFile: "tmp/index.html"
        };

        it("does not download cdn references", () => {
            return downloadCdn(options).then(() => {
                return Promise.all([
                    fs.accessAsync(jqueryFile),
                    fs.accessAsync(jquery2File),
                    fs.accessAsync(bootstrapFile)
                ])
                    .then(() => expect.fail(null, null, "Cdn files were downloaded (but shouldn't have been because download was turned off)"))
                    .catch(err => {
                        if (err.code !== 'ENOENT') throw err;
                    });
            });
        });
    });

    describe("when running with download ON", () => {
        let options = {};

        describe("and cdn-lock.json has no entries", () => {
            it("and no files are downloaded - downloads cdn references", () => {
                return downloadCdn(options).then(() => {
                    return Promise.all([
                        fs.accessAsync(jqueryFile),
                        fs.accessAsync(jquery2File),
                        fs.accessAsync(bootstrapFile)
                    ]);
                });
            });

            it("and wrong file is already local - downloads correct file", () => {
                let dlCdnPromise = new Promise((resolve, reject) => {
                    fs.copyFile(badJqueryFile, jqueryFile, () => {
                        resolve(downloadCdn(options));
                    });
                });

                return dlCdnPromise.then(() => {
                    return Promise.all([
                        fs.readFileAsync(jqueryFile, 'utf8'),
                        fs.readFileAsync(badJqueryFile, 'utf8')
                    ]).then(([jqContents, badJqContents]) => {
                        if (jqContents === badJqContents) throw Error("Bad JQuery was not overwritten");
                    });
                });
            });
        });


    });

    function hashFile(filepath) {
        return fs.readFileAsync(filepath, 'utf8')
            .then(contents => createHash(contents));
    }

    function createHash(string) {
        return crypto.createHash('md5').update(string).digest('hex');
    }

    // TODO: Test conditions such as:
    // 2. cdn-lock.json has no entries, but files are present which would conflict
    // 1. cdn-lock.json has entries, but files are not present
    // 3. cnd-lock.json has entry which matches a local file, but hash is different
    // 4. cdn-lock.json has entries and files are present - ensure no download
});