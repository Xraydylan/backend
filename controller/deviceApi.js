const Project = require("../models/project").model;
const crypto = require("crypto");
const Dataset = require("../models/dataset").model;
const DeviceApi = require("../models/deviceApi").model;

async function switchActive(ctx) {
  const { authId } = ctx.state;
  const body = ctx.request.body;
  const project = await Project.findOne({
    $and: [{ _id: ctx.header.project }, { admin: authId }],
  });

  if (!project) {
    ctx.body = { error: "No access to this project" };
    ctx.status = 400;
    return ctx;
  }

  project.enableDeviceApi = body.state;
  await project.save();
  ctx.body = { message: "Switch deviceApi" };
  ctx.status = 200;
  return ctx;
}

async function setApiKey(ctx) {
  const { authId } = ctx.state;
  const deviceApi = await DeviceApi.findOne({
    $and: [{ projectId: ctx.header.project }, { userId: authId }],
  });

  const deviceKey = crypto.randomBytes(64).toString("base64");
  if (deviceApi) {
    deviceApi.deviceApiKey = deviceKey;
  } else {
    const newDeviceApi = await DeviceApi({
      projectId: ctx.header.project,
      userId: authId,
      deviceApiKey: deviceKey,
    });
    await newDeviceApi.save();
  }

  ctx.status = 200;
  ctx.body = { deviceApiKey: deviceKey };
  return ctx;
}

async function getApiKey(ctx) {
  const { authId } = ctx.state;
  const deviceApi = await DeviceApi.findOne({
    $and: [{ projectId: ctx.header.project }, { userId: authId }],
  });
  if (deviceApi) {
    ctx.body = { deviceApiKey: deviceApi.deviceApiKey };
    ctx.status = 200;
  } else {
    ctx.body = { deviceApiKey: undefined };
    ctx.status = 200;
  }
  return ctx;
}

async function removeKey(ctx) {
  const { authId } = ctx.state;
  const deviceApi = await DeviceApi.findOne({
    $and: [{ projectId: ctx.header.project }, { userId: authId }],
  });

  if (!deviceApi) {
    ctx.body = { error: "No access to this project" };
    ctx.status = 400;
    return ctx;
  }

  deviceApi.remove();
  ctx.body = { message: "Disabled device api" };
  ctx.status = 200;
  return ctx;
}

async function initDatasetIncrement(ctx) {
  const body = ctx.request.body;
  const deviceApi = await DeviceApi.findOne({
    deviceApiKey: body.deviceApiKey,
  });
  if (!deviceApi) {
    ctx.body = { error: "Invalid key" };
    ctx.status = 403;
    return ctx;
  }
  const project = await Project.findOne(deviceApi.projectId);
  if (!project.enableDeviceApi) {
    ctx.body = { error: "This feature is disabled" };
    ctx.status = 403;
    return ctx;
  }

  const dataset = Dataset({
    userId: deviceApi.userId,
    start: 0,
    end: 0,
  });

  dataset.save();
  await Project.findByIdAndUpdate(deviceApi.projectId, {
    $push: { datasets: dataset._id },
  });

  const datasetKey = crypto.randomBytes(64).toString("base64");
  deviceApi.datasets.push({ dataset: dataset._id, datasetKey: datasetKey });
  await deviceApi.save();

  ctx.body = { datasetKey: datasetKey };
  ctx.status = 200;
  return ctx;
}

async function addDatasetIncrement(ctx) {
  const { datasetKey, time, datapoint, sensorname } = ctx.request.body;
  const deviceApi = await DeviceApi.findOne({
    "datasets.datasetKey": datasetKey,
  });
  if (!deviceApi) {
    ctx.body = { error: "Invalid key" };
    ctx.status = 403;
    return ctx;
  }

  const project = await Project.findOne(deviceApi.projectId);
  if (!project.enableDeviceApi) {
    ctx.body = { error: "This feature is disabled" };
    ctx.status = 403;
    return ctx;
  }
  const datasetId = deviceApi.datasets.filter((elm) => {
    return elm.datasetKey === datasetKey;
  })[0].dataset;
  const dataset = await Dataset.findOne(datasetId);
  var dataTime = time;
  if (!dataTime) {
    dataTime = Math.floor(new Date().getTime() / 1000);
  }

  var timeSeriesIndex = dataset.timeSeries.findIndex(
    (elm) => elm.name === sensorname
  );
  if (timeSeriesIndex === -1) {
    const timeSeries = { name: sensorname, start: 0, end: 0 };
    dataset.timeSeries.push(timeSeries);
    timeSeriesIndex = dataset.timeSeries.length - 1;
  }

  dataset.timeSeries[timeSeriesIndex].data.push({
    timestamp: dataTime,
    datapoint: datapoint
  });

  if (dataset.timeSeries[timeSeriesIndex].end < dataTime) {
    dataset.timeSeries[timeSeriesIndex].end = dataTime;
  }
  if (dataset.timeSeries[timeSeriesIndex].start > dataTime) {
    dataset.timeSeries[timeSeriesIndex].start = dataTime;
  }

  if (dataset.end < dataTime) {
    dataset.end = dataTime;
  }
  if (dataset.start > dataTime) {
    dataset.start = dataTime;
  }
  await dataset.save();

  ctx.status = 200;
  ctx.body = { message: "Added data" };
  return ctx;
}

async function uploadDataset(ctx) {
  try {
    const body = ctx.request.body.payload;
    const key = ctx.request.body.key;

    const deviceApi = await DeviceApi.findOne({
      deviceApiKey: key,
    });
    if (!deviceApi) {
      ctx.body = { error: "Invalid key" };
      ctx.status = 403;
      return ctx;
    }
    const project = await Project.findOne(deviceApi.projectId);
    if (!project || !project.enableDeviceApi) {
      ctx.body = { error: "This feature is disabled" };
      ctx.status = 403;
      return ctx;
    }

    body.userId = deviceApi.userId;
    const document = new Dataset(body);
    await document.save();
    await Project.findByIdAndUpdate(
      { _id: project._id },
      {
        $push: { datasets: document._id },
      }
    );

    ctx.body = { message: "Generated dataset" };
    ctx.status = 200;
    return ctx;
  } catch (e) {
    ctx.status = 400;
    ctx.body = { error: "Error creating the dataset" };
    return ctx;
  }
}

module.exports = {
  setApiKey,
  removeKey,
  uploadDataset,
  switchActive,
  getApiKey,
  initDatasetIncrement,
  addDatasetIncrement,
};