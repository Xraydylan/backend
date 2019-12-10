const Router      = require('koa-router');
const KoaBody      = require('koa-body');

const controller = require('../../controller/dataset');

const router = new Router();

const subroutes = {
	result: require('./subroutes/result'),
	event: require('./subroutes/event'),
	labeling: require('./subroutes/labeling'),
	video: require('./subroutes/video'),
	timeseries: require('./subroutes/timeseries'),
	fusedseries: require('./subroutes/fusedseries')
};

router.use('/:datasetId/results', subroutes.result.routes(), subroutes.result.allowedMethods());
router.use('/:datasetId/events', subroutes.event.routes(), subroutes.event.allowedMethods());
router.use('/:datasetId/labelings', subroutes.labeling.routes(), subroutes.labeling.allowedMethods());
router.use('/:datasetId/video', subroutes.video.routes(), subroutes.video.allowedMethods());
router.use('/:datasetId/timeseries', subroutes.timeseries.routes(), subroutes.timeseries.allowedMethods());
router.use('/:datasetId/fusedseries', subroutes.fusedseries.routes(), subroutes.fusedseries.allowedMethods());

/**
 * get all datasets for current user
 * route:					/datasets
 * method type: 	GET
 */
router.get('/', async (ctx, next) => {
	await controller.getDatasets(ctx, next);
});

/**
 * get dataset by id for current user
 * route:					/datasets/:id
 * method type: 	GET
 */
router.get('/:id', async (ctx) => {
	await controller.getDatasetById(ctx);
});

/**
 * create a new dataset
 * route:					/datasets
 * method type: 	POST
 */
router.post('/', KoaBody(), async (ctx) => {
	await controller.createDataset(ctx);
});

/**
 * update a specific datasets
 * route:					/datasets/:id
 * method type: 	PUT
 */
router.put('/:id', KoaBody(), async (ctx) => {
	await controller.updateDatasetById(ctx);
});

/**
 * delete a specific dataset
 * route:					/datasets/:id
 * method type: 	DELETE
 */
router.del('/:id', async (ctx) => {
	await controller.deleteDatasetById(ctx);
});


module.exports = router;
