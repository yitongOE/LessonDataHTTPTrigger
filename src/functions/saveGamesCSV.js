const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");

app.http("saveGamesCSV", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {

      const {
        gameKey,
        configCSV,
        contentCSV,
        contentType
      } = await request.json();

      if (!gameKey || !configCSV) {
        return { status: 400, body: "Missing data" };
      }

      const blobServiceClient =
        BlobServiceClient.fromConnectionString(
          process.env.LESSONDATA_STORAGE_CONNECTION_STRING
        );

      const containerClient =
        blobServiceClient.getContainerClient("lessondata");

      await containerClient.createIfNotExists();

      // write config csv
      const configPath =
        `current/games/${gameKey}/config.csv`;

      const configBlob =
        containerClient.getBlockBlobClient(configPath);

      await configBlob.uploadData(
        Buffer.from(configCSV),
        {
          blobHTTPHeaders: {
            blobContentType: "text/csv; charset=utf-8"
          },
          overwrite: true
        }
      );

      // Write content csv
      if (contentCSV && contentType) {

        const contentPath =
          `current/games/${gameKey}/${contentType}.csv`;

        const contentBlob =
          containerClient.getBlockBlobClient(contentPath);

        await contentBlob.uploadData(
          Buffer.from(contentCSV),
          {
            blobHTTPHeaders: {
              blobContentType: "text/csv; charset=utf-8"
            },
            overwrite: true
          }
        );
      }

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
