const Model = require("../models/dataset").model;
const UserModel = require("../models/user").model;
const Experiment = require("../models/experiment").model;
const DatasetLabeling = require("../models/datasetLabeling").model;
const DatasetLabel = require("../models/datasetLabel").model;
const ProjectModel = require("../models/project").model;
const DeviceApi = require("../models/deviceApi").model;
const TimeSeries = require("../models/timeSeries").model;

/**
 * Util Function
 * Create labelings from experiment
 */
async function autoCreateLabelings(dataset) {
  const experiment = await Experiment.findById(dataset.experiments);
  const datasetLabeling = new DatasetLabeling({
    labelingId: experiment,
    labels: [],
  });
  let { start } = dataset;
  let end;
  for (let i = 0; i < experiment.instructions.length; i++) {
    end = start + experiment.instructions[i].duration;
    const datasetLabel = new DatasetLabel({
      name: `autogenerated datasetLabel ${i}`,
      type: experiment.instructions[i].labelType,
      start,
      end,
    });
    start = end;
    await datasetLabel.save();
    datasetLabeling.labels.push(datasetLabel);
    i++;
  }
  await datasetLabeling.save();
  return datasetLabeling;
}

/**
 * get all datasets
 */
async function getDatasets(ctx) {
  const projectId = ctx.header.project;
  const project = await ProjectModel.findOne({ _id: projectId });
  const datasets = await Model.find({ _id: project.datasets });
  ctx.body = datasets;
  ctx.status = 200;
}

/**
 * get dataset by id
 */
async function getDatasetById(ctx) {
  const project = await ProjectModel.findOne({ _id: ctx.header.project });
  const dataset = await Model.find({
    $and: [{ _id: ctx.params.id }, { _id: project.datasets }],
  })
    .populate("timeSeries")
    .exec();
  if (dataset.length === 1) {
    ctx.body = dataset[0];
    ctx.status = 200;
  } else {
    ctx.body = { error: "Dataset not in requested project" };
    ctx.status = 400;
  }
  return ctx.body;
}

/**
 * get dataset lock by id
 */
 async function getDatasetLockById(ctx) {
  const project = await ProjectModel.findOne({ _id: ctx.header.project });
  const lock = await Model.find({
    $and: [{ _id: ctx.params.id }, { _id: project.datasets }],
  })
    .select("canEdit")
    .exec();
  if (lock.length === 1) {
    ctx.body = { canEdit: lock[0].canEdit };
    ctx.status = 200;
  } else {
    ctx.body = { error: "Dataset not in requested project" };
    ctx.status = 400;
  }
  return ctx.body;
}

/**
 * create a new dataset
 */
async function createDataset(ctx) {
  const dataset = ctx.request.body;
  dataset.projectId = ctx.header.project;
  // if userId empty, set it to requesting user
  if (!dataset.userId) {
    const { authId } = ctx.state;
    const user = await UserModel.findOne({ authId });
    dataset.userId = user._id;
  }

  if (
    "experiments" in dataset &&
    dataset.experiments !== null &&
    !("labelings" in dataset)
  ) {
    dataset.labelings = await autoCreateLabelings(dataset);
  } else if (
    "experiments" in dataset &&
    dataset.experiments !== null &&
    "labelings" in dataset &&
    dataset.labelings.length > 0
  ) {
    ctx.body = { error: "Do not set experiment and labelings" };
    ctx.status = 400;
    return ctx;
  }

  const document = new Model({ ...dataset, timeSeries: undefined });
  await document.save();

  const newTimeSeries = [];
  for (var i = 0; i < dataset.timeSeries.length; i++) {
    var tmpSeries = new TimeSeries({
      ...dataset.timeSeries[i],
      dataset: document._id,
    });
    await tmpSeries.save();
    document.timeSeries.push(tmpSeries._id);
  }
  await document.save();

  await ProjectModel.findByIdAndUpdate(ctx.header.project, {
    $push: { datasets: document._id },
  });

  ctx.body = document;
  ctx.status = 201;
  return ctx;
}

async function updateDatasetById(ctx) {
  try {
    const dataset = ctx.request.body;
    const project = await ProjectModel.findOne({ _id: ctx.header.project });
    var timeSeries = undefined;
    if (project.datasets.includes(ctx.params.id)) {
      if (dataset.timeSeries) {
        timeSeries = await Promise.all(
          dataset.timeSeries.map((elm) => {
            if (elm._id) {
              return TimeSeries.findByIdAndUpdate(elm._id, elm);
            } else {
              elm.dataset = ctx.params.id;
              return TimeSeries.create(elm);
            }
          })
        );
        dataset.timeSeries = timeSeries.map(elm => elm._id);
      }
      await Model.findByIdAndUpdate(ctx.params.id, dataset);
      ctx.body = { message: `updated dataset with id: ${ctx.params.id}` };
      ctx.status = 200;
    } else {
      ctx.body = { error: "Forbidden" };
      ctx.status = 403;
    }
    return ctx;
  } catch (e) {
    console.log(e);
  }
}

async function canEditDatasetById(ctx) { // we could use the update method above, but it sends the whole dataset, which is unnecessarily SLOW
  try {
    const { canEdit } = ctx.request.body;
    const project = await ProjectModel.findOne({ _id: ctx.header.project });
    if (project.datasets.includes(ctx.params.id)) {
      await Model.findByIdAndUpdate(ctx.params.id, {
        $set: { canEdit: canEdit }
      });
      ctx.body = { message: `changed canEdit for dataset with id: ${ctx.params.id}` };
      ctx.status = 200;
    } else {
      ctx.body = { error: "Forbidden" };
      ctx.status = 403;
    }
    return ctx;
  } catch (e) {
    console.log(e);
  }
}

/**
 * delete a dataset specified by id
 */
async function deleteDatasetById(ctx) {
  const project = await ProjectModel.findOne({ _id: ctx.header.project });
  const dataset = await Model.findOneAndDelete({
    $and: [{ _id: ctx.params.id }, { _id: project.datasets }],
  });
  if (dataset !== null) {
    await ProjectModel.updateOne(
      { _id: ctx.header.project },
      { $pull: { datasets: ctx.params.id } }
    );

    await TimeSeries.deleteMany({ _id: { $in: dataset.timeSeries } });

    await DeviceApi.updateMany(
      { projectId: project._id },
      { $pull: { datasets: { dataset: ctx.params.id } } }
    );

    ctx.body = { message: `deleted dataset with id: ${ctx.params.id}` };
    ctx.status = 200;
  } else {
    ctx.body = { error: "Dataset not found" };
    ctx.status = 400;
  }
  return ctx;
}

module.exports = {
  getDatasets,
  getDatasetById,
  getDatasetLockById,
  createDataset,
  updateDatasetById,
  canEditDatasetById,
  deleteDatasetById,
};
