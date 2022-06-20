// Remove Documents from import that are for other tiers
Hooks.on("preImportAdventure", (adventure, formData, toCreate, toUpdate) => {
	const tiers = adventure.getFlag("tiers", "tiers");
	const { tier = null } = formData;
	// Do not proceed if the adventure doesn't have tiers
	if (!tiers || !tier) return;

	// Get all documents that should be excluded because they are from other tiers
	const otherDocuments = Object.entries(tiers)
		.filter(([k]) => k != tier)
		.map(([, v]) => v.documents)
		.flat();

	// Go through all documents that are being created or updated
	[toCreate, toUpdate].forEach(data => {
		// For each type of document
		for (const type in data) {
			// Get all documents of that type to be excluded
			const otherDocumentsOfType = otherDocuments.filter(uuid => uuid.includes(type));
			// Filter out those documents by their UUID
			data[type] = data[type].filter(document => !otherDocumentsOfType.find(uuid => uuid.includes(document._id)));
		}
	});
});

// Create tokens after adventure import
Hooks.on("importAdventure", async (adventure, formData, created, updated) => {
	const tiers = adventure.getFlag("tiers", "tiers");
	const { tier = null } = formData;
	const { Scene: scenes, Actor: actors } = { ...created, ...updated };
	// Do not proceed if the adventure doesn't have tiers or scenes
	if (!tiers || !tier || !scenes) return;

	// Get all tokens for this tier
	const tokens = tiers[tier].tokens;

	// Group the tokens by scene and enrich them with actor data
	const enrichedTokens = [];
	for (const token of tokens) {
		const scene = scenes.find(s => s.id === token.sceneId);
		enrichedTokens[scene] = [
			(await actors.find(a => a.id === token.actorId)?.getTokenData(token)) ?? token,
			...(enrichedTokens[scene] ?? []),
		];
	}

	// Create the tokens
	for (const scene of scenes) {
		await scene.createEmbeddedDocuments("Token", enrichedTokens[scene]);
	}

	ui.notifications.info(game.i18n.format("tiers.notifications.import", { tier }));
});
