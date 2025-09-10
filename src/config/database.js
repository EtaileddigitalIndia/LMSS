const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongod;

const connectDB = async () => {
  try {
    let mongoURI;
    
    if (process.env.NODE_ENV === "production") {
      mongoURI = process.env.MONGODB_URI_PROD;
    } else if (process.env.MONGODB_URI && process.env.MONGODB_URI !== "mongodb://localhost:27017/global_lms") {
      mongoURI = process.env.MONGODB_URI;
    } else {
      // Use in-memory MongoDB for development when local MongoDB is not available
      console.log("🔄 Starting in-memory MongoDB for development...");
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'global_lms'
        },
        binary: {
          downloadTimeout: 180000, // 3 minutes timeout
          version: '6.0.4' // Use a more stable version
        }
      });
      mongoURI = mongod.getUri();
      console.log("✅ In-memory MongoDB started");
    }

    if (!mongoURI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    // Enhanced connection options for MongoDB Atlas (removed deprecated options)
    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      retryWrites: true, // Enable retryable writes for Atlas
      w: "majority", // Write concern for Atlas
    };

    // Add retry logic for Atlas connection
    let retries = 5;
    let connected = false;

    while (retries > 0 && !connected) {
      try {
        const conn = await mongoose.connect(mongoURI, connectionOptions);
        connected = true;

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(`🗄️  Database: ${conn.connection.name}`);

        // Handle connection events
        mongoose.connection.on("error", (err) => {
          console.error("❌ MongoDB connection error:", err);
        });

        mongoose.connection.on("disconnected", () => {
          console.log("⚠️  MongoDB disconnected");
        });

        mongoose.connection.on("reconnected", () => {
          console.log("🔄 MongoDB reconnected");
        });

        // Graceful shutdown
        process.on("SIGINT", async () => {
          console.log("🛑 Shutting down gracefully...");
          await mongoose.connection.close();
          if (mongod) {
            await mongod.stop();
            console.log("✅ In-memory MongoDB stopped");
          }
          console.log("✅ MongoDB connection closed through app termination");
          process.exit(0);
        });

        process.on("SIGTERM", async () => {
          console.log("🛑 Received SIGTERM, shutting down gracefully...");
          await mongoose.connection.close();
          if (mongod) {
            await mongod.stop();
            console.log("✅ In-memory MongoDB stopped");
          }
          console.log("✅ MongoDB connection closed through app termination");
          process.exit(0);
        });
      } catch (error) {
        retries--;
        console.error(
          `❌ MongoDB connection attempt failed (${5 - retries}/5):`,
          error.message
        );

        if (retries > 0) {
          console.log(
            `🔄 Retrying in 5 seconds... (${retries} attempts remaining)`
          );
          await new Promise((resolve) => setTimeout(resolve, 5000));
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.error(
      "💡 Please check your MongoDB Atlas connection string and network connectivity"
    );
    process.exit(1);
  }
};

module.exports = connectDB;
