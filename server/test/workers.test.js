const Logger = require("../main/logger");
const Workers = require("../main/workers");
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

process.env.config = JSON.stringify(config);
process.env.configMain = JSON.stringify(configMain);

nock.disableNetConnect();
nock.enableNetConnect("127.0.0.1");

////////////////////////////////////////////////////////////////////////////////

describe("Test workers functionality", () => {
    let configMainCopy, rpcDataCopy;
    beforeEach(() => {
        configMainCopy = JSON.parse(JSON.stringify(configMain));
        rpcDataCopy = JSON.parse(JSON.stringify(testdata.getBlockTemplate()));
    });

    beforeEach(() => nock.cleanAll());
    afterAll(() => nock.restore());
    beforeAll(() => {
        if (!nock.isActive()) nock.activate();
        nock.enableNetConnect();
    });

    test("Test initialization of workers", () => {
        const logger = new Logger(configMainCopy);
        const workers = new Workers(logger);
        expect(typeof workers.configMain).toBe("object");
        expect(typeof workers.handlePromises).toBe("function");
        expect(typeof workers.setupWorkers).toBe("function");
    });

    test("Test worker stratum creation", (done) => {
        const consoleSpy = jest
            .spyOn(console, "log")
            .mockImplementation(() => {});
        const logger = new Logger(configMainCopy);
        const workers = new Workers(logger);
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
        workers.setupWorkers(() => {
            const stratum = workers.stratum;
            stratum.stratum.network.on("network.stopped", () => done());
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringMatching("is lower than the difficulty on port"),
            );
            stratum.stratum.network.stopNetwork();
            console.log.mockClear();
            done();
        });
    });
});
