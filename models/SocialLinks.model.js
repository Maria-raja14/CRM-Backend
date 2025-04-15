import mongoose from "mongoose";

const SocialLinkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String, required: true },
});

const SocialLink = mongoose.model("SocialLink", SocialLinkSchema);

export default SocialLink;
