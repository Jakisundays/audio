const StreamTest = () => {
  const testStreaming = async () => {
    try {
      const x = await fetch("/api/test-point");
      if (!x.body) {
        console.log("Response has no body");
        return;
      }
      const reader = x.body.getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log("Stream has ended");
          break;
        }

        const text = new TextDecoder().decode(value);
        // console.log("Received chunk:", text);
      }
    } catch (error) {
      console.error({ error });
    }
  };
  return (
    <button onClick={testStreaming} className="btn btn-secondary">
      Stream Test
    </button>
  );
};

export default StreamTest;
