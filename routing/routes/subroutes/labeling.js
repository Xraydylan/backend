const Router      = require('koa-router');
const controller = require('../../../controller/datasetLabelDefinition');

const router = new Router();

/**
 * get all labelings for current user
 * route:					/datasets/{id}/labelings
 * method type: 	GET
 */
router.get('/', async (ctx) => {
	await controller.getLabelings(ctx);
});

/**
 * get labeling by id
 * route:					/datasets/{id}/labelings/:id
 * method type: 	GET
 */
router.get('/:id', async (ctx) => {
	await controller.getLabelingById(ctx);
});

/**
 * create a new labeling
 * route:					/datasets/{id}/labelings
 * method type: 	POST
 */
router.post('/', async (ctx) => {
	await controller.createLabeling(ctx);
});

/**
 * update a specific labelings
 * route:					/datasets/{id}/labelings/:id
 * method type: 	PUT
 */
router.put('/:id', async (ctx) => {
	await controller.updateLabelingById(ctx);
});

/**
 * delete all labelings
 * route:					/datasets/{id}/labelings
 * method type: 	DELETE
 */
router.del('/', async (ctx) => {
	await controller.deleteLabelings(ctx);
});

/**
 * delete a specific labeling
 * route:					/datasets/{id}/Labelings/:id
 * method type: 	DELETE
 */
router.del('/:id', async (ctx) => {
	await controller.deleteLabelingById(ctx);
});


module.exports = router;
