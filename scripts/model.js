const fields = foundry.data.fields;

export default class Tiers extends foundry.abstract.DataModel {
	/** @inheritdoc */
	static defineSchema() {
		// Extend the schema for tokens to add a required scene ID property
		const independentToken = () => {
			const schema = CONFIG.Token.documentClass.defineSchema();
			schema.sceneId = new fields.ForeignDocumentField(foundry.documents.BaseActor, {
				idOnly: true,
				required: true,
			});
			return schema;
		};

		// Define the schema for a single tier
		const tierSchema = () =>
			new fields.SchemaField({
				tokens: new fields.ArrayField(new EssentialSchemaField(independentToken())),
				documents: new fields.ArrayField(new fields.StringField()),
			});

		// Define the schema for all tiers
		return Object.keys(Tiers.numbers).reduce((accumulator, current) => {
			accumulator[current] = tierSchema();
			return accumulator;
		}, {});
	}

	/** Constants with the number of tiers and their level range */
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
		// Clean the data, adding in all non-essential properties
		const data = super.clean(value, options);

		// Get the initial value for all fields
		for (let [key, { initial }] of Object.entries(this.fields)) {
			// Resolve the initial value if it's a function
			initial = initial instanceof Function ? initial() : initial;
			if (
				// If the initial value is an object (and both are non-null)
				typeof initial === "object" && initial != null && data[key] != null
					? // Check if the difference is empty
					isObjectEmpty(diffObject(data[key], initial))
					: // If the initial value is not an object, check if it's the same
					data[key] === initial
			) {
				// Try to delete the field, or set it to undefined if it's not deletable
				try {
					delete data[key];
				} catch (error) {
					data[key] = undefined;
				}

			// If the difference betweens objects is not empty
			} else if (typeof initial === "object" && initial != null && data[key] != null) {
				// Set the field to the difference
				data[key] = diffObject(data[key], initial);
			}
		}
		return data;
	}
}
