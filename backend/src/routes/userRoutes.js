const router    = require('express').Router();
const auth      = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { list, create, update, remove } = require('../controllers/userController');

router.get('/',     auth, authorize('users:read'),  list);
router.post('/',    auth, authorize('users:write'), create);
router.put('/:id',  auth, authorize('users:write'), update);
router.delete('/:id', auth, authorize('users:write'), remove);

module.exports = router;
