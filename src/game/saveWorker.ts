import { prepareRebasedGameSave } from "./savePreparation";
import type {
  PrepareGameSaveRequest,
  PrepareGameSaveResponse,
} from "./saveWorkerProtocol";

interface SaveWorkerScope {
  onmessage: ((event: MessageEvent<PrepareGameSaveRequest>) => void) | null;
  postMessage: (message: PrepareGameSaveResponse) => void;
}

const workerScope = self as unknown as SaveWorkerScope;

workerScope.onmessage = ({ data }) => {
  workerScope.postMessage({
    id: data.id,
    result: prepareRebasedGameSave(data.state, data.gameNow, data.wallNow),
  });
};
