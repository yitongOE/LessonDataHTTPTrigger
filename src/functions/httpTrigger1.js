const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

app.http("saveGamesCSV", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const csv = await request.text();

      if (!csv || !csv.trim()) {
        return { status: 400, body: "Empty CSV" };
      }

      const blobServiceClient =
        BlobServiceClient.fromConnectionString(
          process.env.LESSONDATA_STORAGE_CONNECTION_STRING
        );

      const containerClient =
        blobServiceClient.getContainerClient("lessondata");

      await containerClient.createIfNotExists();

      const blobClient =
        containerClient.getBlockBlobClient("current/GameData.csv");

      await blobClient.uploadData(
        Buffer.from(csv),
        {
          blobHTTPHeaders: {
            blobContentType: "text/csv; charset=utf-8"
          },
          overwrite: true
        }
      );

      return {
        status: 200,
        jsonBody: { ok: true }
      };

    } catch (err) {
      context.log(err);
      return {
        status: 500,
        body: "Failed to write CSV"
      };
    }
  }
});
