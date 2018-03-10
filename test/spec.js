var expect = require("chai").expect;
var downloadCdn = require("../download-cdn");

describe("download cdn", function () {
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
        let options = {filesToProcess: "file.txt"};
        let normalCall = () => downloadCdn(options);
        expect(normalCall).to.throw();
    });

    it("fails when options.downloadLibs is not a boolean", function () {
        let options = {downloadLibs: ["my/directory"]};
        let normalCall = () => downloadCdn(options);
        expect(normalCall).to.throw();
    });

    it("downloads my cdn entries", function () {
        let options = {
            downloadLibs: true,
            filesToProcess: ["app/index.html", "moreFilez"]
        };
        let normalCall = () => downloadCdn(options);
        expect(normalCall).not.to.throw();
        expect(2 + 2).to.equal(4);
    });
});