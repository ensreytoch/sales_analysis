const router    = require('express').Router();
const auth      = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { list, listPermissions, create, update, remove } = require('../controllers/roleController');

router.get('/permissions', auth, authorize('roles:read'),  listPermissions);
router.get('/',            auth, authorize('roles:read'),  list);
router.post('/',           auth, authorize('roles:write'), create);
router.put('/:id',         auth, authorize('roles:write'), update);
router.delete('/:id',      auth, authorize('roles:write'), remove);

module.exports = router;
