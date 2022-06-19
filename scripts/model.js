const fields = foundry.data.fields;

export default class Tiers extends foundry.abstract.DataModel {
	/** @inheritdoc */
	static defineSchema() {
		const independentToken = () => {
			const schema = CONFIG.Token.documentClass.defineSchema();
			schema.sceneId = new fields.ForeignDocumentField(foundry.documents.BaseActor, {
				idOnly: true,
				required: true,
			});
			return schema;
		};

		const tierSchema = () =>
			new fields.SchemaField({
				tokens: new fields.ArrayField(new EssentialSchemaField(independentToken())),
				documents: new fields.ArrayField(new fields.StringField()),
			});

		return Object.keys(Tiers.numbers).reduce((accumulator, current) => {
			accumulator[current] = tierSchema();
			return accumulator;
		}, {});
	}

	static numbers = {
		1: {
			min: 1,
			max: 4,
		},
		2: {
			min: 5,
			max: 10,
		},
		3: {
			min: 11,
			max: 16,
		},
		4: {
			min: 17,
			max: 20,
		},
	};
}

/** Only keep essential data that is not the same as the initial value */
class EssentialSchemaField extends fields.SchemaField {
	/** @override */
	clean(value, options) {
		const data = super.clean(value, options);
		for (let [key, { initial }] of Object.entries(this.fields)) {
			initial = initial instanceof Function ? initial() : initial;
			if (
				typeof initial === "object" && initial != null && data[key] != null
					? isObjectEmpty(diffObject(data[key], initial))
					: data[key] === initial
			) {
				delete data[key];
			} else if (typeof initial === "object" && initial != null && data[key] != null) {
				data[key] = diffObject(data[key], initial);
			}
		}
		return data;
	}
}
