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

      // =========================
      // ===== Admin Restore =====
      // =========================
      if (target === "AdminData") {

        const safeBlob =
          container.getBlockBlobClient("safe/AdminData.csv");

        const currentBlob =
          container.getBlockBlobClient("current/AdminData.csv");

        if (!(await safeBlob.exists())) {
          return { status: 400, body: "No safe AdminData found" };
        }

        const download = await safeBlob.download();
        const buffer =
          await streamToBuffer(download.readableStreamBody);

        await currentBlob.uploadData(buffer, {
          overwrite: true,
          blobHTTPHeaders: {
            blobContentType: "text/csv; charset=utf-8"
          }
        });

        return { status: 200 };
      }

      // =========================
      // ===== Typed Restore =====
      // =========================
      // Expected:
      // "games/WordSplash"
      // "marketplace/WordSplash"

      if (!target.includes("/")) {
        return { status: 400, body: "Invalid target format" };
      }

      const [type, key] = target.split("/");

      if (!type || !key) {
        return { status: 400, body: "Invalid target format" };
      }

      if (type !== "games" && type !== "marketplace") {
        return { status: 400, body: "Invalid target type" };
      }

      const baseSafe =
        `safe/${type}/${key}/`;

      const baseCurrent =
        `current/${type}/${key}/`;

      // =========================
      // ===== Games Panel =====
      // =========================
      if (type === "games") {

        const files = ["config.csv", "content.csv"];

        for (const file of files) {

          const safePath = baseSafe + file;
          const currentPath = baseCurrent + file;

          const safeBlob =
            container.getBlockBlobClient(safePath);

          if (!(await safeBlob.exists())) continue;

          const currentBlob =
            container.getBlockBlobClient(currentPath);

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

        return { status: 200 };
      }

      // =========================
      // ===== Marketplace Panel =====
      // =========================
      if (type === "marketplace") {

        const files = ["config.csv", "selected.csv"];

        for (const file of files) {

          const safePath = baseSafe + file;
          const currentPath = baseCurrent + file;

          const safeBlob =
            container.getBlockBlobClient(safePath);

          if (!(await safeBlob.exists())) continue;

          const currentBlob =
            container.getBlockBlobClient(currentPath);

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

        return { status: 200 };
      }

      return { status: 400, body: "Unhandled restore case" };

    } catch (err) {
      context.log(err);
      return { status: 500, body: String(err) };
    }
  }
});


// =========================
// ===== Helpers =====
// =========================

async function streamToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on("data", d => chunks.push(d));
    readableStream.on("end", () => resolve(Buffer.concat(chunks)));
    readableStream.on("error", reject);
  });
}