import Tiers from "./model.js";
import TiersCollector from "./collector.js";
import "./choice.js";
import "./importer.js";

Hooks.on(
	"init",
	() =>
		(game.modules.get("tiers").api = {
			Tiers,
			TiersCollector,
		})
);
