import Tiers from "./model.js";

// Add options to import sheet
Hooks.on("renderAdventureImporter", (app, [html]) => {
	// If there are no tiers exit
	if (!app.adventure.getFlag("tiers", "tiers")) return;

	/**
	 *Render the HTML displaying the tiers selection	 *
	 * @param {number} [current=1] - The currently selected tier
	 */
	async function render(current = 1) {
		const tier = Tiers.numbers[current];
		const { min, max } = tier;

		const template = await renderTemplate("modules/tiers/templates/tiers.hbs", {
			// Get the list of all the tiers in the correct format for the selectOptions Handlebars helper
			tiers: Object.keys(Tiers.numbers).reduce((accumulator, current) => {
				accumulator[current] = current;
				return accumulator;
			}, {}),
			tier: {
				min,
				max,
				current,
			},
		});

		// Find an existing element to replace or insert a new one after the Contents section
		let element = html.querySelector(".adventure-options");
		if (element) {
			element.outerHTML = template;
		} else {
			html.querySelector(".adventure-contents").insertAdjacentHTML("afterend", template);
		}
		element = html.querySelector(".adventure-options");

		app.setPosition();

		// Re-render whenever a new tier is selected
		element
			.querySelector("select[name='tier']")
			.addEventListener("change", () => render(element.querySelector("select[name='tier']").value));
	}

	render();
});
