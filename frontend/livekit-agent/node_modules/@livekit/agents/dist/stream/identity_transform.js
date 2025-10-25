import { TransformStream } from "node:stream/web";
class IdentityTransform extends TransformStream {
  constructor() {
    super(
      {
        transform: (chunk, controller) => controller.enqueue(chunk)
      },
      // By default the transfor stream will buffer only one chunk at a time.
      // In order to follow the python agents channel.py, we set set the capaciy to be effectively infinite.
      { highWaterMark: Number.MAX_SAFE_INTEGER },
      { highWaterMark: Number.MAX_SAFE_INTEGER }
    );
  }
}
export {
  IdentityTransform
};
//# sourceMappingURL=identity_transform.js.map