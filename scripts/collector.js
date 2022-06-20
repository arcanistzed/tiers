import Tiers from "./model.js";

// Add button to exporter
Hooks.on("renderAdventureExporter", (app, [html]) => {
	const { uuid } = app.adventure;
	const button = document.createElement("button");
	button.innerHTML = `<i class="fa-solid fa-star"></i> Tiers`;
	button.type = "button";
	html.querySelector("footer").prepend(button);
	button.onclick = async () => {
		const adventure = await fromUuid(uuid);
		const tiers = new Tiers();
		await tiers.updateSource(adventure.getFlag("tiers", "tiers"));
		new TiersCollector(tiers, adventure).render(true);
	};
	app.setPosition();
});

export default class TiersCollector extends FormApplication {
	constructor(tiers = new Tiers(), adventure = null, options = {}) {
		super(tiers, options);
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
			width: Math.max(window.innerWidth * 1 / 3, 600),
			resizable: true,
			dragDrop: [{ dropSelector: ".documents" }],
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
			...super.getData(options),
			tiers: Object.entries(this.tiers.toObject()).reduce((accumulator, [key, value]) => {
				value.tokens = value.tokens.map(t => ({ ...t, stringified: JSON.stringify(t, null, 2) }));
				value.documents = value.documents.map(uuid => TextEditor.enrichHTML(`@UUID[${uuid}]`));
				accumulator.push({ key, value });
				return accumulator;
			}, []),
			adventure: this.adventure,
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
								tokens: this.tiers[tier].tokens.filter(t => t._id !== id),
							},
						},
						{ recursive: false }
					);
					this.render();
					this.setPosition();
					break;
			}
		});

		html.addEventListener("contextmenu", ({ target }) => {
			if (!target.matches(".content-link[data-uuid]")) return;
			const { uuid } = target.dataset;
			const tier = target.closest("[data-tier]")?.dataset.tier;

			this.tiers.updateSource({
				[tier]: {
					documents: this.tiers[tier].documents.filter(d => d !== uuid),
				},
			});
			this.render();
			this.setPosition();
		});
	}

	/** @inheritdoc */
	async _updateObject(_event, formData) {
		const adventure = this.adventure ?? (await fromUuid(formData.adventure));
		await adventure.setFlag("tiers", "tiers", this.tiers.toObject());
	}

	/** @inheritdoc */
	_onDrop(event) {
		const { target } = event;
		const tier = target.closest("[data-tier]")?.dataset.tier;
		const data = TextEditor.getDragEventData(event);
		const { uuid } = data;
		if (!uuid || uuid.includes("Compendium")) return;
		this.tiers.updateSource({
			[tier]: {
				documents: [...new Set([...(this.tiers[tier]?.documents ?? []), uuid])],
			},
		});
		this.render();
		this.setPosition();
	}
}
