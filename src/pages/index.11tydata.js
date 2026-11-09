import fs from "node:fs";
import home from "../_data/home.js";

const meta = JSON.parse(fs.readFileSync(new URL("../../build/meta.json", import.meta.url), "utf8"));

export default {
  ...home,
  title: meta.title,
  description: meta.description,
  needsJs: true,
  schema: "LocalBusiness",
};
