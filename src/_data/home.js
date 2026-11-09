import site from "./site.js";
import assets from "./assets.js";
import { buildHomeData } from "../lib/home-data.js";

export default buildHomeData(site, assets);
