import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URL;
    if (!uri) {
      throw new Error("Missing MONGO_URI or MONGODB_URL in environment variables");
    }
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
