
let expect = require("chai").expect;
let downloadCdn = require("../download-cdn");

let Promise = require("bluebird");
let rimraf = Promise.promisify(require("rimraf"));
let fs = Promise.promisifyAll(require("fs"));

describe("download cdn", () => {

    let jsFile = "tmp/js/jquery.min.js";
    let cssFile = "tmp/css/bootstrap.min.css";

    beforeEach(() => {
        // delete tmp directory
        return rimraf("tmp");
    });

    it("fails when no options passed", () => {
        let noOptionsCall = () => downloadCdn();
        expect(noOptionsCall).to.throw();
    });

    it("fails when empty options passed", () => {
        let options = {};
        let emptyOptionsCall = () => downloadCdn(options);
        expect(emptyOptionsCall).to.throw();
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

    describe("when running with good config: download ON", () => {
        let options = {
            sourceFile: "app/index.html",
            destinationFile: "tmp/index.html"
        };

        let promise;

        beforeEach(() => {
            promise = downloadCdn(options);
        });

        it("downloads cdn references", () => {
            return promise.then(() => {
                return Promise.all([
                    fs.accessAsync(jsFile),
                    fs.accessAsync(cssFile)
                ]);
            });
        });

        it("adds cdn references to index.html", () => {
            return promise.then(() => {
                return Promise.all([
                    fs.readFileAsync(options.destinationFile, 'utf8'),
                    fs.readFileAsync("expected/index.html", 'utf8')
                ]).then(([destinationContents, expectedContents]) => {
                    expect(destinationContents).to.equal(expectedContents);
                });
            });
        });
    });

    // TODO: Test conditions such as:
    // 1. cdn-lock.json has entries, but files are not present
    // 2. cdn-lock.json has no entries, but files are present which would conflict
    // 3. cnd-lock.json has entry which matches a local file, but hash is different
    // 4. cdn-lock.json has entries and files are present - ensure no download

    describe("when running with good config: download OFF", () => {
        let options = {
            downloadLibs: false,
            sourceFile: "app/index.html",
            destinationFile: "tmp/index.html"
        };

        it("does not download cdn references", () => {
            return downloadCdn(options).then(() => {
                return Promise.all([
                    fs.accessAsync(jsFile),
                    fs.accessAsync(cssFile)
                ])
                    .then(() => expect.fail(null, null, "Cdn files were downloaded (but shouldn't have been because download was turned off)"))
                    .catch(err => {
                        if (err.code !== 'ENOENT') throw err;
                    });
            });
        });
    });
});