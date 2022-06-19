// Remove Documents from import that are for other tiers
Hooks.on("preImportAdventure", (adventure, formData, toCreate, toUpdate) => {
	const tiers = adventure.getFlag("tiers", "tiers");
	const { tier = null } = formData;
	if (!tiers || !tier) return;

	const otherDocuments = Object.entries(tiers)
		.filter(([k]) => k != tier)
		.map(([, v]) => v.documents)
		.flat();

	[toCreate, toUpdate].forEach(data => {
		for (const type in data) {
			const otherDocumentsOfType = otherDocuments.filter(uuid => uuid.includes(type));
			data[type] = data[type].filter(document => !otherDocumentsOfType.find(uuid => uuid.includes(document._id)));
		}
	});
});

// Create tokens after adventure import
Hooks.on("importAdventure", async (adventure, formData, created, updated) => {
	const tiers = adventure.getFlag("tiers", "tiers");
	const { tier = null } = formData;
	const { Scene: scenes, Actor: actors } = { ...created, ...updated };
	if (!tiers || !tier || !scenes) return;

	const tokens = tiers[tier].tokens;

	const enrichedTokens = [];

	for (const token of tokens) {
		const scene = scenes.find(s => s.id === token.sceneId);
		enrichedTokens[scene] = [
			(await actors.find(a => a.id === token.actorId)?.getTokenData(token)) ?? token,
			...(enrichedTokens[scene] ?? []),
		];
	}

	for (const scene of scenes) {
		await scene.createEmbeddedDocuments("Token", enrichedTokens[scene]);
	}

	ui.notifications.info(game.i18n.format("tiers.notifications.import", { tier }));
});
