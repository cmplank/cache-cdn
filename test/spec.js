
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

    describe("when running with good config", () => {
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

    describe("when running with good config - download off", () => {
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
                    .then(() => expect.fail(null, null, "Cdn files were downloaded (but shouldn't have been)"))
                    .catch((err) => {
                        if (err.code !== 'ENOENT') throw err;
                    });
            });
        });
    });
});