require("dotenv").config();
import mongoose = require("mongoose");
import app from "./app";
import { verifyEmailConnection } from "./app/modules/email/email.service";

const startServer = async () => {
  try {
    await mongoose.connect(process.env.DB_URL as string);

    app.listen(process.env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`Server is running on port ${process.env.PORT}`);
    });

    // Verify SMTP connection (non-blocking — logs status only)
    await verifyEmailConnection();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error);
  }
};

startServer();
