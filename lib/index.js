"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.ZeroPoolLibState = exports.HistoryTransactionType = exports.HistoryRecord = exports.ZeropoolClient = void 0;
const comlink_1 = require("comlink");
const libzeropool_rs_wasm_web_1 = __importDefault(require("libzeropool-rs-wasm-web"));
const file_cache_1 = require("./file-cache");
var client_1 = require("./client");
Object.defineProperty(exports, "ZeropoolClient", { enumerable: true, get: function () { return client_1.ZeropoolClient; } });
var history_1 = require("./history");
Object.defineProperty(exports, "HistoryRecord", { enumerable: true, get: function () { return history_1.HistoryRecord; } });
Object.defineProperty(exports, "HistoryTransactionType", { enumerable: true, get: function () { return history_1.HistoryTransactionType; } });
class ZeroPoolLibState {
}
exports.ZeroPoolLibState = ZeroPoolLibState;
async function init(wasmPath, workerPath, snarkParams) {
    const fileCache = await file_cache_1.FileCache.init();
    const worker = (0, comlink_1.wrap)(new Worker(workerPath));
    await worker.initWasm(wasmPath, {
        txParams: snarkParams.transferParamsUrl,
        treeParams: snarkParams.treeParamsUrl,
    });
    await (0, libzeropool_rs_wasm_web_1.default)(wasmPath);
    const transferVk = await (await fetch(snarkParams.transferVkUrl)).json();
    const treeVk = await (await fetch(snarkParams.treeVkUrl)).json();
    return {
        fileCache,
        worker,
        snarkParams: {
            transferVk,
            treeVk,
        }
    };
}
exports.init = init;
//# sourceMappingURL=index.js.map