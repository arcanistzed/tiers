import Tiers from "./model.js";

// Add button to exporter
Hooks.on("renderAdventureExporter", (app, [html]) => {
	const { uuid } = app.adventure;
	const button = document.createElement("button");
	button.innerHTML = `<i class="fa-solid fa-star"></i> ${game.i18n.localize("tiers.collector.title")}`;
	button.type = "button";
	html.querySelector("footer").prepend(button);
	app.setPosition();

	// Render a new Tiers Collector with the data from the current adventure
	button.onclick = async () => {
		const adventure = await fromUuid(uuid);
		const tiers = new Tiers();
		await tiers.updateSource(adventure.getFlag("tiers", "tiers"));
		new TiersCollector(tiers, adventure).render(true);
	};
});

export default class TiersCollector extends FormApplication {
	constructor(tiers = new Tiers(), adventure = null, options = {}) {
		super(tiers, options);

		// Manage a tiers object and an adventure
		this.object = tiers instanceof Tiers ? tiers : new Tiers();
		this.adventure = adventure;
	}

	/** @inheritdoc */
	static get defaultOptions() {
		return mergeObject(super.defaultOptions, {
			title: "tiers.collector.title",
			id: "tiers-collector",
			template: "modules/tiers/templates/collector.hbs",
			classes: ["tiers-collector"],
			width: Math.max((window.innerWidth * 1) / 3, 600),
			resizable: true,
			dragDrop: [{ dropSelector: ".documents" }], // Allow dropping on the documents area
		});
	}

	/**
	 * An alias for the Tiers object
	 * @type {Tiers}
	 */
	get tiers() {
		return this.object;
	}

	/** @inheritdoc */
	getData(options = {}) {
		return {
			// Do not use mergeObject because it will expand the dotted adventure UUIDs
			...super.getData(options),

			// Process all of the data for all tiers
			tiers: Object.entries(this.tiers.toObject()).reduce((accumulator, [key, value]) => {
				// Add a property to tokens with their stringified data
				value.tokens = value.tokens.map(t => ({ ...t, stringified: JSON.stringify(t, null, 2) }));
				// Replace document UUIDs with enriched HTML
				value.documents = value.documents.map(uuid => TextEditor.enrichHTML(`@UUID[${uuid}]`));
				// Add an object to the accumulator array with the tier number and it's data
				accumulator.push({ key, value });
				return accumulator;
			}, []),

			adventure: this.adventure,

			// Get the list of all adventures in the correct format for the selectOptions Handlebars helper
			adventures: Object.fromEntries(
				game.packs
					.filter(p => p.metadata.type === "Adventure")
					.map(pack =>
						pack.index.map(index => [
							[`Compendium.${pack.metadata.id}.${index._id}`],
							`${pack.metadata.label}: ${index.name}`,
						])
					)
					.flat()
			),
		};
	}

	/** @inheritdoc */
	_getHeaderButtons() {
		const buttons = super._getHeaderButtons();
		// Add a header button to log the current state of the Tiers object
		// https://github.com/League-of-Foundry-Developers/foundryvtt-devMode/pull/50
		Hooks.callAll("getDevModeHeaderButtons", this, buttons);
		return buttons;
	}

	/** @inheritdoc */
	activateListeners([html]) {
		super.activateListeners(this.element);

		html.addEventListener("click", ({ target }) => {
			const action = target.closest("[data-action]")?.dataset.action;
			const tier = target.closest("[data-tier]")?.dataset.tier;
			const id = target.closest("[data-id]")?.dataset.id;

			switch (action) {
				case "addSelectedTokens":
					this.tiers.updateSource({
						[tier]: {
							tokens: [
								...this.tiers[tier].tokens,

								// Add all controlled tokens with the ID of the current scene
								...canvas.tokens.controlled.map(t =>
									mergeObject(t.document.toObject(), { sceneId: canvas.scene.id })
								),
							]
								// Deduplicate by ID
								.filter((value, index, array) => array.findIndex(t => t._id === value._id) === index),
						},
					});
					this.render();
					this.setPosition();
					break;
				case "remove":
					this.tiers.updateSource(
						{
							[tier]: {
								// Filter out the token whose delete button was clicked on
								tokens: this.tiers[tier].tokens.filter(t => t._id !== id),
							},
						},
						// Do not merge the update to the array recursively
						{ recursive: false }
					);
					this.render();
					this.setPosition();
					break;
			}
		});

		// Delete documents with right click
		html.addEventListener("contextmenu", ({ target }) => {
			if (!target.matches(".content-link[data-uuid]")) return;
			const { uuid } = target.dataset;
			const tier = target.closest("[data-tier]")?.dataset.tier;

			this.tiers.updateSource({
				[tier]: {
					// Filter out the document whose delete button was clicked on
					documents: this.tiers[tier].documents.filter(d => d !== uuid),
				},
			});
			this.render();
			this.setPosition();
		});
	}

	/** @inheritdoc */
	async _updateObject(_event, formData) {
		// Get the adventure to update
		const adventure = this.adventure ?? (await fromUuid(formData.adventure));
		// Update the adventure with the data from the tiers object
		await adventure.setFlag("tiers", "tiers", this.tiers.toObject());
	}

	/** @inheritdoc */
	_onDrop(event) {
		const { target } = event;
		const { tier } = target.closest("[data-tier]")?.dataset;
		const data = TextEditor.getDragEventData(event);
		const { uuid } = data;
		// Do not proceed if the dragged element doesn't have a UUID or if it's a compendium
		if (!uuid || uuid.includes("Compendium")) return;
		this.tiers.updateSource({
			[tier]: {
				// Add the dropped document UUID to the list of documents and deduplicate
				documents: [...new Set([...(this.tiers[tier]?.documents ?? []), uuid])],
			},
		});
		this.render();
		this.setPosition();
	}
}
