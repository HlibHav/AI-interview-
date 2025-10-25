import { IdentityTransform } from "./identity_transform.js";
function isStreamReaderReleaseError(e) {
  const allowedMessages = [
    "Invalid state: Releasing reader",
    "Invalid state: The reader is not attached to a stream"
  ];
  if (e instanceof TypeError) {
    return allowedMessages.some((message) => e.message.includes(message));
  }
  return false;
}
class DeferredReadableStream {
  transform;
  writer;
  sourceReader;
  constructor() {
    this.transform = new IdentityTransform();
    this.writer = this.transform.writable.getWriter();
  }
  get stream() {
    return this.transform.readable;
  }
  get isSourceSet() {
    return !!this.sourceReader;
  }
  /**
   * Call once the actual source is ready.
   */
  setSource(source) {
    if (this.isSourceSet) {
      throw new Error("Stream source already set");
    }
    this.sourceReader = source.getReader();
    this.pump();
  }
  async pump() {
    let sourceError;
    try {
      while (true) {
        const { done, value } = await this.sourceReader.read();
        if (done) break;
        await this.writer.write(value);
      }
    } catch (e) {
      if (isStreamReaderReleaseError(e)) return;
      sourceError = e;
    } finally {
      if (sourceError) {
        this.writer.abort(sourceError);
        return;
      }
      this.writer.releaseLock();
      try {
        await this.transform.writable.close();
      } catch (e) {
      }
    }
  }
  /**
   * Detach the source stream and clean up resources.
   */
  async detachSource() {
    if (!this.isSourceSet) {
      throw new Error("Source not set");
    }
    this.sourceReader.releaseLock();
  }
}
export {
  DeferredReadableStream,
  isStreamReaderReleaseError
};
//# sourceMappingURL=deferred_stream.js.map