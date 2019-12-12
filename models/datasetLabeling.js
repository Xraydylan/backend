const mongoose = require('mongoose');
const Label = require('./datasetLabel').schema;


const DatasetLabeling = new mongoose.Schema({
	labelingId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Labeling'
	},
	instructions: {
		type: [Label],
		default: []
	},
	creator: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Service'
	}
});

module.exports = {
	model: mongoose.model('DatasetLabeling', DatasetLabeling),
	schema: DatasetLabeling
};
