const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

app.http("restoreSafeCSV", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const { target } = await request.json();

      if (!target) {
        return { status: 400, body: "Missing target" };
      }

      const blobServiceClient =
        BlobServiceClient.fromConnectionString(
          process.env.LESSONDATA_STORAGE_CONNECTION_STRING
        );

      const container =
        blobServiceClient.getContainerClient("lessondata");

      // ========= Admin =========
      if (target === "AdminData") {

        const sourceBlob =
          container.getBlockBlobClient(`safe/AdminData.csv`);

        const destBlob =
          container.getBlockBlobClient(`current/AdminData.csv`);

        const download = await sourceBlob.download();
        const buffer = await streamToBuffer(download.readableStreamBody);

        await destBlob.uploadData(buffer, {
          overwrite: true,
          blobHTTPHeaders: {
            blobContentType: "text/csv; charset=utf-8"
          }
        });

        return { status: 200 };
      }

      // ========= Games =========
      const safePrefix =
        `safe/games/${target}/`;

      const currentPrefix =
        `current/games/${target}/`;

      let found = false;

      for await (const blob of container.listBlobsFlat({
        prefix: safePrefix
      })) {

        found = true;

        const fileName =
          blob.name.replace(safePrefix, "");

        const safeBlob =
          container.getBlockBlobClient(blob.name);

        const currentBlob =
          container.getBlockBlobClient(
            currentPrefix + fileName
          );

        const download =
          await safeBlob.download();

        const buffer =
          await streamToBuffer(download.readableStreamBody);

        await currentBlob.uploadData(buffer, {
          overwrite: true,
          blobHTTPHeaders: {
            blobContentType: "text/csv; charset=utf-8"
          }
        });
      }

      if (!found) {
        return { status: 400, body: "No safe version found" };
      }

      return { status: 200 };

    } catch (err) {
      context.log(err);
      return { status: 500, body: String(err) };
    }
  }
});

// helper
async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", d => chunks.push(d));
    readableStream.on("end", () => resolve(Buffer.concat(chunks)));
    readableStream.on("error", reject);
  });
}
