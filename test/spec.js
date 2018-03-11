
let expect = require("chai").expect;
let downloadCdn = require("../download-cdn");

let Promise = require("bluebird");
let rimraf = Promise.promisify(require("rimraf"));
let fs = Promise.promisifyAll(require("fs"));

describe("download cdn", function () {

    let jsFile = "tmp/js/jquery.min.js";
    let cssFile = "tmp/css/bootstrap.min.css";

    beforeEach(function () {
        // delete tmp directory
        return rimraf("tmp");
    });

    it("fails when no options passed", function () {
        let noOptionsCall = () => downloadCdn();
        expect(noOptionsCall).to.throw();
    });

    it("fails when empty options passed", function () {
        let options = {};
        let emptyOptionsCall = () => downloadCdn(options);
        expect(emptyOptionsCall).to.throw();
    });

    it("fails when options.filesToProcess is not an array", function () {
        let options = { filesToProcess: "file.txt" };
        let normalCall = () => downloadCdn(options);
        expect(normalCall).to.throw();
    });

    it("fails when options.downloadLibs is not a boolean", function () {
        let options = { downloadLibs: ["my/directory"] };
        let normalCall = () => downloadCdn(options);
        expect(normalCall).to.throw();
    });

    it("downloads my cdn entries", function () {
        let options = {
            downloadLibs: true,
            filesToProcess: ["app/index.html", "moreFilez"]
        };
        return promise = downloadCdn(options).then(function () {
            let jsPromise = fs.accessAsync(jsFile);
            let cssPromise = fs.accessAsync(cssFile);

            expect(2 + 2).to.equal(4);

            return Promise.all([jsPromise, cssPromise]);
        });
    });
});