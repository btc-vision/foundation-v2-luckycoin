const Logger = require("../main/logger");
const Stratum = require("../main/stratum");
const config = require("../../configs/example");
const configMain = require("../../configs/main.js");
const nock = require("nock");
const testdata = require("../../daemon/test/daemon.mock");

config.primary.address = "ltc1qya20xua0rgq9jdteffkt83xr4aq082gruc2gry";
config.primary.recipients[0].address = "LRJeNFbLC28wA4hYfiV2Dyjb6hK9pLTD5y";
config.primary.daemons = [
    {
        host: "127.0.0.1",
        port: "9332",
        username: "foundation",
        password: "foundation",
    },
];

nock.disableNetConnect();
nock.enableNetConnect("127.0.0.1");

////////////////////////////////////////////////////////////////////////////////

describe("Test stratum functionality", () => {
    let configCopy, configMainCopy, rpcDataCopy;
    beforeEach(() => {
        configCopy = JSON.parse(JSON.stringify(config));
        configMainCopy = JSON.parse(JSON.stringify(configMain));
        rpcDataCopy = JSON.parse(JSON.stringify(testdata.getBlockTemplate()));
    });

    beforeEach(() => nock.cleanAll());
    afterAll(() => nock.restore());
    beforeAll(() => {
        if (!nock.isActive()) nock.activate();
        nock.enableNetConnect();
    });

    test("Test initialization of stratum", () => {
        const logger = new Logger(configMainCopy);
        const stratum = new Stratum(logger, configCopy, configMainCopy);
        expect(typeof stratum.config).toBe("object");
        expect(typeof stratum.setupStratum).toBe("function");
    });

    test("Test stratum pool setup [1]", (done) => {
        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});
        const logger = new Logger(configMainCopy);
        const stratum = new Stratum(logger, configCopy, configMainCopy);
        nock("http://127.0.0.1:9332")
            .post("/", (body) => body.method === "getpeerinfo")
            .reply(
                200,
                JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: null,
                }),
            );
        nock("http://127.0.0.1:9336")
            .post("/", (body) => body.method === "getpeerinfo")
            .reply(
                200,
                JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: null,
                }),
            );
        nock("http://127.0.0.1:9332")
            .post("/")
            .reply(
                200,
                JSON.stringify([
                    {
                        id: "nocktest",
                        error: null,
                        result: {
                            isvalid: true,
                            address:
                                "ltc1qya20xua0rgq9jdteffkt83xr4aq082gruc2gry",
                        },
                    },
                    {
                        id: "nocktest",
                        error: null,
                        result: { networkhashps: 0 },
                    },
                    {
                        id: "nocktest",
                        error: null,
                        result: { chain: "main", difficulty: 0 },
                    },
                    {
                        id: "nocktest",
                        error: null,
                        result: { protocolversion: 1, connections: 1 },
                    },
                ]),
            );
        nock("http://127.0.0.1:9332")
            .persist()
            .post("/", (body) => body.method === "getblocktemplate")
            .reply(
                200,
                JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: rpcDataCopy,
                }),
            );
        stratum.setupStratum(() => {
            stratum.stratum.network.on("network.stopped", () => done());
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching("is lower than the difficulty on port"),
            );
            stratum.stratum.network.stopNetwork();
            console.log.mockClear();
        });
    });

    test("Test stratum pool setup [2]", (done) => {
        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});
        const logger = new Logger(configMainCopy);
        const stratum = new Stratum(logger, configCopy, configMainCopy);
        nock("http://127.0.0.1:9332")
            .post("/", (body) => body.method === "getpeerinfo")
            .reply(
                200,
                JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: null,
                }),
            );
        nock("http://127.0.0.1:9336")
            .post("/", (body) => body.method === "getpeerinfo")
            .reply(
                200,
                JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: null,
                }),
            );
        nock("http://127.0.0.1:9332")
            .post("/")
            .reply(
                200,
                JSON.stringify([
                    {
                        id: "nocktest",
                        error: null,
                        result: {
                            isvalid: true,
                            address:
                                "ltc1qya20xua0rgq9jdteffkt83xr4aq082gruc2gry",
                        },
                    },
                    {
                        id: "nocktest",
                        error: null,
                        result: { networkhashps: 0 },
                    },
                    {
                        id: "nocktest",
                        error: null,
                        result: { chain: "main", difficulty: 0 },
                    },
                    {
                        id: "nocktest",
                        error: null,
                        result: { protocolversion: 1, connections: 1 },
                    },
                ]),
            );
        nock("http://127.0.0.1:9332")
            .persist()
            .post("/", (body) => body.method === "getblocktemplate")
            .reply(
                200,
                JSON.stringify({
                    id: "nocktest",
                    error: null,
                    result: rpcDataCopy,
                }),
            );
        stratum.forkId = "0";
        stratum.setupStratum(() => {
            stratum.stratum.network.on("network.stopped", () => done());
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching("is lower than the difficulty on port"),
            );
            stratum.stratum.network.stopNetwork();
            console.log.mockClear();
        });
    });
});
