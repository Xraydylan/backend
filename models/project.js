const mongoose = require('mongoose');
const Dataset = require('./dataset').model;
const Experiment = require('./experiment').model;
const LabelDefinition = require('./labelDefinition').model;
const LabelType = require('./labelType').model;
const Device = require('./device').model;
const Service = require('./service').model;
const Sensor = require('./sensor').model;
const Firmware = require('./firmware').model;
const DeviceApi = require('./deviceApi').model;

const Project = new mongoose.Schema({
	admin: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: [true, 'a project needs an admin'],
	},
	name: {
		type: String,
		required: [true, 'a project needs a name'],
	},
	users: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'User',
		default: [],
	},
	datasets: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Dataset',
		default: [],
	},
	experiments: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Experiment',
		default: [],
	},
	labelDefinitions: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'LabelDefinition',
		default: [],
	},
	labelTypes: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'LabelType',
		default: [],
	},
	devices: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Device',
		default: [],
	},
	services: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Service',
		default: [],
	},
	sensors: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Sensor',
		default: [],
	},
	firmware: {
		type: [mongoose.Schema.Types.ObjectId],
		ref: 'Firmware',
		default: [],
	},
	enableDeviceApi: {
		type: Boolean,
		default: false,
	}
});

Project.index({ name: 1, admin: 1 }, { unique: true });

Project.path('name').validate(
	value => /^[\w, -]+$/.test(value),
	'Invalid project name'
);

Project.pre('remove', async function (next) {
	await Dataset.deleteMany({ _id: { $in: this.datasets } });
	await Experiment.deleteMany({ _id: { $in: this.experiments } });
	await LabelDefinition.deleteMany({ _id: { $in: this.labelDefinitions } });
	await LabelType.deleteMany({ _id: { $in: this.labelTypes } });
	await Device.deleteMany({ _id: { $in: this.devices } });
	await Service.deleteMany({ _id: { $in: this.services } });
	await Sensor.deleteMany({ _id: { $in: this.sensors } });
	await Firmware.deleteMany({ _id: { $in: this.firmware } });
	await DeviceApi.deleteMany({projectId: this._id});
	next();
});

module.exports = {
	model: mongoose.model('Project', Project),
	schema: Project,
};
