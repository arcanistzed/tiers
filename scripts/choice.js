import Tiers from "./model.js";

// Add options to import sheet
Hooks.on("renderAdventureImporter", (app, [html]) => {
	// If there are no tiers exit
	if (!app.adventure.getFlag("tiers", "tiers")) return;

	async function render(current = 1) {
		const tier = Tiers.numbers[current];
		const { min, max } = tier;

		const template = await renderTemplate("modules/tiers/templates/tiers.hbs", {
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

		let element = html.querySelector(".adventure-options");
		if (element) {
			element.outerHTML = template;
		} else {
			html.querySelector(".adventure-contents").insertAdjacentHTML("afterend", template);
		}
		element = html.querySelector(".adventure-options");

		app.setPosition();

		element
			.querySelector("select[name='tier']")
			.addEventListener("change", () => render(element.querySelector("select[name='tier']").value));
	}

	render();
});
