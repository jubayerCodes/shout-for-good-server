import http = require("http");
import mongoose = require("mongoose");
import app = require("./app");

let server: http.Server;

const startServer = async () => {
  try {
    await mongoose.connect(process.env.DB_URL as string);

    server = app.listen(process.env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server is running on port ${process.env.PORT}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
};

startServer();
