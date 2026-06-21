const router   = require('express').Router();
const auth     = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const c = require('../controllers/productConfigController');

router.get('/',           auth, authorize('product-configs:read'),  c.list);
router.get('/all',        auth, authorize('product-configs:read'),  c.listAll);
router.get('/categories', auth, authorize('product-configs:read'),  c.listCategories);
router.post('/',          auth, authorize('product-configs:write'), c.create);
router.put('/:id',        auth, authorize('product-configs:write'), c.update);
router.delete('/:id',     auth, authorize('product-configs:write'), c.remove);

module.exports = router;
